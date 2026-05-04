# AI Page Summarizer Chrome Extension

A professional, high-fidelity Chrome Extension (Manifest V3) that extracts article content and generates structured summaries using AI (Groq/Llama 3).

## ✨ Features
- **Smart Extraction**: Uses `@mozilla/readability` to pull main content while ignoring ads and sidebars.
- **AI-Powered Summaries**: Provides a structured Overview, Key Insights, and Estimated Reading Time.
- **Highlighting**: One-click "Highlight on Page" to find key insights in the original text.
- **Premium UI**: Glassmorphism design with Dark/Light mode support.
- **Secure Architecture**: API keys are hidden in a Node.js proxy server (Vercel) to prevent exposure.
- **Performance**: Caches summaries locally using `chrome.storage` to save API credits.

## 🚀 Getting Started

### 1. Setup the Backend (Proxy Server)
To keep your API key secure, the extension communicates with a proxy server.
1.  Navigate to the `server/` directory.
2.  Install dependencies: `npm install`.
3.  Create a `.env` file based on `.env.example`.
4.  Add your `GROQ_API_KEY` (Get one for free at [Groq Cloud](https://console.groq.com/keys)).
5.  Deploy to **Vercel** (or any Node.js host).
6.  Set the `GROQ_API_KEY` in your Vercel Environment Variables.

### 2. Build the Extension
1.  In the root directory, run: `npm install`.
2.  Run the build script: `npm run build`.
3.  This generates the `dist/` folder.

### 3. Install in Chrome
1.  Open Chrome and go to `chrome://extensions/`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked** and select the **`dist/`** folder.

## 🏗️ Architecture
- **Frontend**: React + Vite + TypeScript.
- **Manifest V3**: Using a service worker (`background.ts`) for messaging and content scripts for DOM access.
- **Communication**: 
    - `App.tsx` (Popup) -> `background.ts` (Service Worker) -> `server/index.js` (Proxy) -> Groq API.
- **Security**: The extension never knows your API key; it only sends content to your proxy.

## 🛡️ Security Decisions
- **No Hardcoded Keys**: All API interaction happens server-side.
- **Content Sanitization**: Uses safe DOM manipulation to prevent XSS during highlighting.
- **Minimal Permissions**: Only requests `activeTab`, `storage`, and `scripting`.

## 🛠️ Trade-offs & Decisions
- **Groq over Gemini**: Switched to Groq (Llama 3) for faster response times and better compatibility with free-tier accounts.
- **ES Module Loader**: Implemented a custom `content-loader.js` to support Vite's ES module output in Chrome's non-module content script environment.

## 📝 License
MIT
