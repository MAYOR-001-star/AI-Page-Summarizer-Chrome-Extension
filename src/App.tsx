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
  FileText,
  Highlighter
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
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    // Load theme and last summary
    chrome.storage.local.get(['lastSummary', 'theme', 'pendingSummarize'], (result: { lastSummary?: SummaryData, theme?: 'dark' | 'light', pendingSummarize?: number }) => {
      if (result.theme) setTheme(result.theme);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab) {
          setPageTitle(currentTab.title || 'Current Page');
          
          // Check if we should automatically summarize after refresh
          if (result.pendingSummarize === currentTab.id) {
            chrome.storage.local.remove('pendingSummarize');
            handleSummarize(true);
          } else if (result.lastSummary && result.lastSummary.url === currentTab.url) {
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


  const isRestrictedUrl = (url?: string) => {
    return !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('https://chrome.google.com/webstore');
  };

  const handleSummarize = async (isAutoStart = false) => {
    setLoading(true);
    setError(null);
    setNeedsRefresh(false);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('No active tab found.');
      }

      if (isRestrictedUrl(tab.url)) {
        throw new Error('This extension cannot run on Chrome system pages or the Web Store.');
      }

      // Check if content script is already there
      let isResponsive = false;
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (pingResponse?.success) isResponsive = true;
      } catch (e) {
        // Not responsive
      }

      if (!isResponsive) {
        // Try to inject
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['assets/content.js']
          });
          // Wait a bit for injection
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error('Injection failed:', e);
          setNeedsRefresh(true);
          throw new Error('This page needs a quick refresh to enable the summarizer.');
        }
      }

      // Request content extraction
      let pageData;
      try {
        pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extract_content' });
      } catch (err: any) {
        console.error('Message failed:', err);
        setNeedsRefresh(true);
        throw new Error('Communication lost. Please refresh the page.');
      }
      
      if (!pageData || pageData.error) {
        throw new Error(pageData?.error || 'Could not extract content. Please try again.');
      }
      
      const words = pageData.content.trim().split(/\s+/).length;
      setWordCount(words);

      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        content: pageData.content,
        option: summaryOption
      });

      if (!response || response.error) {
        throw new Error(response?.error || 'AI service failed. Please try again later.');
      }

      const parsedData = parseSummary(response.summary, tab.url || '');
      setSummary(parsedData);
      chrome.storage.local.set({ lastSummary: parsedData });
      
    } catch (err: any) {
      if (!needsRefresh) {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAndSummarize = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Set a flag to summarize after reload
      await chrome.storage.local.set({ pendingSummarize: tab.id });
      chrome.tabs.reload(tab.id);
      window.close(); // Close popup while page reloads
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

  const handleHighlight = async () => {
    if (!summary) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'highlight_points', 
          points: summary.keyPoints 
        });
        window.close(); // Close popup so user can see highlights
      }
    } catch (err) {
      console.error('Highlighting failed:', err);
    }
  };

  return (
    <div className={`container ${theme}`}>
      <div className="bg-aura"></div>
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

      {needsRefresh && (
        <div className="refresh-notice anim-fade-in">
          <div className="refresh-content">
            <RotateCcw size={18} className="spin-slow" />
            <div className="refresh-text">
              <strong>Action Required</strong>
              <span>This page needs a quick refresh to enable AI features.</span>
            </div>
          </div>
          <button onClick={handleRefreshAndSummarize} className="btn-refresh">Refresh & Summarize</button>
        </div>
      )}


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
              
              <button 
                className="btn btn-secondary anim-fade-in" 
                style={{marginTop: '12px', width: '100%', background: 'rgba(99, 102, 241, 0.1)'}} 
                onClick={handleHighlight}
              >
                <Highlighter size={16} /> Highlight on Page
              </button>
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
