/**
 * Background script for AI Page Summarizer.
 * Handles API calls to Gemini and manages state.
 */

interface GeminiResponse {
  summary?: string;
  error?: string;
}

const PROXY_URL = 'http://localhost:3000/api/summarize';

async function summarizeContent(content: string) {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.summary) {
      return data.summary;
    } else {
      throw new Error('Failed to generate summary.');
    }
  } catch (error) {
    console.error('Proxy API Error:', error);
    throw error;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === 'summarize') {
    const { content } = request;
    
    summarizeContent(content)
      .then(summary => sendResponse({ summary }))
      .catch(error => sendResponse({ error: error.message }));
    
    return true; // Keep channel open
  }
});

console.log('AI Page Summarizer: Background worker active.');
