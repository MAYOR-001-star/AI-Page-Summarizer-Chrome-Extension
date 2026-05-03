/**
 * Background script for AI Page Summarizer.
 * Handles API calls to Gemini and manages state.
 */

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

async function summarizeContent(content: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    ${content.substring(0, 15000)} // Truncate to avoid token limits
  `;

  try {
    const response = await fetch(url, {
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

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Failed to generate summary.');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === 'summarize') {
    const { content, apiKey } = request;
    
    summarizeContent(content, apiKey)
      .then(summary => sendResponse({ summary }))
      .catch(error => sendResponse({ error: error.message }));
    
    return true; // Keep channel open
  }
});

console.log('AI Page Summarizer: Background worker active.');
