import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Copy,
  RotateCcw
} from 'lucide-react';
import './App.css';

interface SummaryData {
  overview: string;
  keyPoints: string[];
  readingTime: string;
  url: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [pageTitle, setPageTitle] = useState('');

  useEffect(() => {
    // Load current page summary from storage
    chrome.storage.local.get(['lastSummary'], (result: { [key: string]: any }) => {
      // Get current tab info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab) {
          setPageTitle(currentTab.title || 'Current Page');
          
          // Check if we have a cached summary for this URL
          if (result.lastSummary && result.lastSummary.url === currentTab.url) {
            setSummary(result.lastSummary);
          }
        }
      });
    });
  }, []);


  const handleSummarize = async () => {

    setLoading(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found.');

      // Inject content script if not already there (though manifest handles it, sometimes we need to be sure)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['assets/content.js']
      }).catch(() => {/* Ignore if already loaded */});

      // Request content extraction
      const pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extract_content' });
      
      if (pageData.error) throw new Error(pageData.error);

      // Call background script for AI summary
      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        content: pageData.content
      });

      if (response.error) throw new Error(response.error);

      // Parse the AI response (Gemini output format can vary, so we'll do some basic parsing)
      const rawSummary = response.summary;
      const parsedData = parseSummary(rawSummary, tab.url || '');
      
      setSummary(parsedData);
      chrome.storage.local.set({ lastSummary: parsedData });
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (text: string, url: string): SummaryData => {
    // Basic parser for the prompt format:
    // OVERVIEW: [text]
    // KEY POINTS: - [point]
    // ESTIMATED READING TIME: [text]
    
    const overviewMatch = text.match(/OVERVIEW:\s*([\s\S]*?)(?=KEY POINTS:|$)/i);
    const keyPointsMatch = text.match(/KEY POINTS:\s*([\s\S]*?)(?=ESTIMATED READING TIME:|$)/i);
    const readingTimeMatch = text.match(/ESTIMATED READING TIME:\s*(.*)/i);

    const overview = overviewMatch ? overviewMatch[1].trim() : 'No overview provided.';
    const keyPoints = keyPointsMatch 
      ? keyPointsMatch[1].trim().split('\n').map(p => p.replace(/^- /, '').trim()).filter(p => p)
      : [];
    const readingTime = readingTimeMatch ? readingTimeMatch[1].trim() : 'Unknown';

    return { overview, keyPoints, readingTime, url };
  };

  const copyToClipboard = () => {
    if (!summary) return;
    const text = `Summary: ${summary.overview}\n\nKey Points:\n${summary.keyPoints.map(p => `• ${p}`).join('\n')}\n\nReading Time: ${summary.readingTime}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container">
      <header>
        <div className="logo-area">
          <Sparkles className="logo-icon" />
          <h1>AI Summarizer</h1>
        </div>
      </header>

      <main>
          {!summary && !loading && (
            <div className="card empty-state">
              <BookOpen className="empty-icon" />
              <div>
                <h2 style={{fontSize: '1rem', marginBottom: '4px'}}>{pageTitle}</h2>
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Ready to summarize this page?</p>
              </div>
              <button className="btn btn-primary" onClick={handleSummarize}>
                <Sparkles size={18} /> Summarize Page
              </button>
            </div>
          )}

          {loading && (
            <div className="card empty-state">
              <div className="loading-spinner"></div>
              <p>Analyzing content and generating insights...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                <AlertCircle size={16} />
                <strong>Error</strong>
              </div>
              {error}
            </div>
          )}

          {summary && !loading && (
            <div className="card">
              <div className="summary-content">
                <div className="summary-section">
                  <h3>Overview</h3>
                  <p>{summary.overview}</p>
                </div>
                
                {summary.keyPoints.length > 0 && (
                  <div className="summary-section">
                    <h3>Key Insights</h3>
                    <ul>
                      {summary.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="reading-time">
                  <Clock size={16} />
                  <span>Full Reading Time: {summary.readingTime}</span>
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button className="btn btn-icon" style={{flex: 1}} onClick={copyToClipboard} title="Copy to clipboard">
                  <Copy size={18} /> <span style={{fontSize: '0.85rem'}}>Copy</span>
                </button>
                <button className="btn btn-icon" style={{flex: 1}} onClick={handleSummarize} title="Regenerate">
                  <RotateCcw size={18} /> <span style={{fontSize: '0.85rem'}}>Retry</span>
                </button>
              </div>
            </div>
          )}
        </main>

      <footer className="footer">
        Powered by Gemini AI • AI Page Summarizer v1.0
      </footer>
    </div>
  );
}

export default App;
