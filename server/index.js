import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('AI Summarizer Proxy (Groq Edition) is running!');
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/summarize', async (req, res) => {
  const { content, option } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const isShort = option === 'short';
  const systemPrompt = `You are a helpful assistant that summarizes web pages.
    ${isShort ? 'Provide a summary in exactly 3 bullet points.' : 'Provide a structured summary with an overview, key insights, and estimated reading time.'}
    Format the output EXACTLY as follows:
    OVERVIEW: [brief overview]
    KEY POINTS:
    - [insight 1]
    - [insight 2]
    ...
    ESTIMATED READING TIME: [X] minutes`;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Summarize this content: ${content.substring(0, 15000)}` }
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    if (data.choices && data.choices[0]?.message?.content) {
      res.json({ summary: data.choices[0].message.content });
    } else {
      res.status(500).json({ error: 'Failed to generate summary from Groq.' });
    }
  } catch (error) {
    console.error('Groq API Error:', error);
    res.status(500).json({ error: 'Internal server error while calling Groq.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
