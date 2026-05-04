import { Readability } from '@mozilla/readability';

/**
 * Extracts the main content from the current page using Readability.
 */
function extractContent() {
  // Clone the document to avoid modifying the actual page
  const documentClone = document.cloneNode(true) as Document;
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    return {
      error: 'Could not parse content from this page.',
    };
  }

  return {
    title: article.title,
    content: article.textContent,
    excerpt: article.excerpt,
    byline: article.byline,
    length: article.length,
    siteName: article.siteName,
  };
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  console.log('Content script received message:', request.action);
  if (request.action === 'extract_content') {
    try {
      const data = extractContent();
      console.log('Content extraction successful');
      sendResponse(data);
    } catch (e) {
      console.error('Content extraction failed:', e);
      sendResponse({ error: 'Failed to extract content from this page.' });
    }
  }
  return true; // Keep the message channel open for async response
});

console.log('AI Page Summarizer: Content script loaded.');
