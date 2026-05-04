import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Copy,
  RotateCcw,
  Sun,
  Moon,
  Trash2,
  FileText
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
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [summaryOption, setSummaryOption] = useState<'default' | 'short'>('default');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Load theme and last summary
    chrome.storage.local.get(['lastSummary', 'theme'], (result: { lastSummary?: SummaryData, theme?: 'dark' | 'light' }) => {
      if (result.theme) setTheme(result.theme);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab) {
          setPageTitle(currentTab.title || 'Current Page');
          if (result.lastSummary && result.lastSummary.url === currentTab.url) {
            setSummary(result.lastSummary);
          }
        }
      });
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  };

  const handleClear = () => {
    setSummary(null);
    chrome.storage.local.remove('lastSummary');
  };


  const handleSummarize = async () => {

    setLoading(true);
    setError(null);
    console.log('Summarization started...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        console.error('No active tab found');
        throw new Error('No active tab found.');
      }
      console.log('Target tab found:', tab.id);

      // Inject content script if not already there
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['assets/content.js']
        });
        console.log('Content script injected successfully');
      } catch (e) {
        console.log('Content script already present or injection restricted:', e);
      }

      // Request content extraction
      console.log('Requesting content extraction from tab...');
      const pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extract_content' });
      
      if (!pageData) {
        console.error('No response from content script');
        throw new Error('Could not communicate with the page. Please refresh the tab and try again.');
      }

      if (pageData.error) {
        console.error('Content extraction error:', pageData.error);
        throw new Error(pageData.error);
      }
      console.log('Content extracted successfully, length:', pageData.content?.length);
      
      // Calculate word count
      const words = pageData.content.trim().split(/\s+/).length;
      setWordCount(words);

      // Call background script for AI summary
      console.log('Sending content to background script for summarization...');
      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        content: pageData.content,
        option: summaryOption
      });

      if (!response) {
        console.error('No response from background script');
        throw new Error('Background service is not responding. Please reload the extension.');
      }

      if (response.error) {
        console.error('Background script error:', response.error);
        throw new Error(response.error);
      }
      console.log('Summary received from background script');

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
    <div className={`container ${theme}`}>
      <header>
        <div className="logo-area">
          <Sparkles className="logo-icon" />
          <h1>AI Summarizer</h1>
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="btn-icon" onClick={handleClear} title="Clear summary">
            <Trash2 size={18} />
          </button>
          <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
              
              <div className="options-group">
                <label>Summary Type</label>
                <div className="segmented-control">
                  <button 
                    className={summaryOption === 'default' ? 'active' : ''} 
                    onClick={() => setSummaryOption('default')}
                  >
                    Standard
                  </button>
                  <button 
                    className={summaryOption === 'short' ? 'active' : ''} 
                    onClick={() => setSummaryOption('short')}
                  >
                    3 Bullets
                  </button>
                </div>
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
                
                <div className="stats-row">
                  <div className="stat-item">
                    <Clock size={14} />
                    <span>Read: {summary.readingTime}</span>
                  </div>
                  {wordCount && (
                    <div className="stat-item">
                      <FileText size={14} />
                      <span>{wordCount} words</span>
                    </div>
                  )}
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
