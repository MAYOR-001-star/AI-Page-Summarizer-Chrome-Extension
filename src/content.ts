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

/**
 * Highlights specific text chunks on the page.
 */
function highlightPoints(points: string[]) {
  let matchesFound = 0;

  points.forEach(point => {
    // We'll look for parts of the point since AI might rephrase slightly
    const searchTerms = point.split(' ').slice(0, 5).join(' '); // Use first few words
    if (searchTerms.length < 10) return;

    // Simple implementation: Find and wrap in <mark>
    // In a production app, we'd use a more robust DOM walker to avoid breaking HTML tags
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    const nodesToReplace = [];
    
    while(node = walker.nextNode()) {
      if (node.textContent?.toLowerCase().includes(searchTerms.toLowerCase())) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach(textNode => {
      const span = document.createElement('mark');
      span.style.backgroundColor = '#fef08a'; // Yellow-200
      span.style.color = '#1f2937'; // Gray-800
      span.style.padding = '2px 4px';
      span.style.borderRadius = '4px';
      span.style.boxShadow = '0 0 10px rgba(253, 224, 71, 0.5)';
      span.className = 'ai-summarizer-highlight';
      
      const parent = textNode.parentNode;
      if (parent) {
        const content = textNode.textContent || '';
        const index = content.toLowerCase().indexOf(searchTerms.toLowerCase());
        
        const before = document.createTextNode(content.substring(0, index));
        const match = document.createElement('mark');
        match.textContent = content.substring(index, index + searchTerms.length);
        Object.assign(match.style, {
          backgroundColor: '#fef08a',
          color: '#1f2937',
          padding: '2px',
          borderRadius: '2px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        });
        const after = document.createTextNode(content.substring(index + searchTerms.length));
        
        parent.insertBefore(before, textNode);
        parent.insertBefore(match, textNode);
        parent.insertBefore(after, textNode);
        parent.removeChild(textNode);
        matchesFound++;
      }
    });
  });

  return matchesFound;
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
  } else if (request.action === 'highlight_points') {
    const count = highlightPoints(request.points);
    sendResponse({ success: true, matches: count });
  }
  return true; // Keep the message channel open for async response
});

console.log('AI Page Summarizer: Content script loaded.');
