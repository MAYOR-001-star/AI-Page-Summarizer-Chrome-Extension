import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

app.post('/api/summarize', async (req, res) => {
  const { content } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const prompt = `
    Please provide a structured summary of the following web page content.
    The summary should include:
    1. A brief overview (1-2 sentences).
    2. Key insights or main points as bullet points.
    3. An estimated reading time for the full content.

    Format the output as follows:
    OVERVIEW: [overview]
    KEY POINTS:
    - [point 1]
    - [point 2]
    ...
    ESTIMATED READING TIME: [X] minutes

    CONTENT:
    ${content.substring(0, 15000)}
  `;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(response.status).json({ error: data.error.message });
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      res.json({ summary: data.candidates[0].content.parts[0].text });
    } else {
      res.status(500).json({ error: 'Failed to generate summary from AI.' });
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal server error while calling Gemini API.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
