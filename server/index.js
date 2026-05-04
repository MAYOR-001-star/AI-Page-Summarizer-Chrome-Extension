import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('AI Summarizer Proxy is running!');
});

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

app.post('/api/summarize', async (req, res) => {
  const { content, option } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const isShort = option === 'short';
  const prompt = `
    Please provide a structured summary of the following web page content.
    ${isShort ? 'The summary MUST be exactly 3 bullet points.' : 'The summary should include a brief overview, key insights, and reading time.'}

    Format the output as follows:
    OVERVIEW: [overview]
    KEY POINTS:
    - [point 1]
    - [point 2]
    ${isShort ? '- [point 3]' : '...'}
    ESTIMATED READING TIME: [X] minutes

    CONTENT:
    ${content.substring(0, 15000)}
  `;

  // List of models to try in order of preference
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      console.log(`Trying model: ${modelName}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.json({ summary: data.candidates[0].content.parts[0].text });
      } else if (data.error) {
        lastError = data.error.message;
        console.warn(`Model ${modelName} failed: ${lastError}`);
        // If it's a model not found error, we'll try the next one
        if (lastError.includes('not found') || lastError.includes('not supported')) continue;
        // If it's something else (like API key error), stop and report
        return res.status(data.error.code || 500).json({ error: lastError });
      }
    } catch (err) {
      lastError = err.message;
      console.error(`Fetch error for ${modelName}:`, err);
    }
  }

  // If we reach here, all models failed. Let's try to discover what's available for this key.
  try {
    const discoveryUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const discoveryRes = await fetch(discoveryUrl);
    const discoveryData = await discoveryRes.json();
    
    if (discoveryData.models) {
      const availableModels = discoveryData.models.map(m => m.name.split('/').pop()).join(', ');
      return res.status(500).json({ 
        error: `Could not find a working model. Your key has access to: ${availableModels}. Please tell me which one to use!` 
      });
    }
  } catch (e) {
    console.error('Discovery failed:', e);
  }

  res.status(500).json({ error: `Summarization failed after trying several models. Last error: ${lastError}` });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
