# AI Page Summarizer Chrome Extension

A high-fidelity Chrome Extension built with React, Vite, and Gemini AI. It extracts meaningful content from any webpage and provides a structured summary, key insights, and estimated reading time.

## ✨ Features

- **Intelligent Extraction**: Uses `@mozilla/readability` to pull main article content while ignoring ads and sidebars.
- **AI-Powered Summaries**: Integrates with Google's Gemini 1.5 Flash via a secure proxy.
- **Summary Options**: Choose between a standard structured summary or a concise 3-bullet point version.
- **Premium Design**: Modern Glassmorphism UI with smooth animations, supporting both **Dark** and **Light** modes.
- **Security First**: API keys are handled by a secure proxy server, never exposed in the extension's frontend.
- **Stats & Insights**: Displays word count, reading time, and key insights.
- **Caching**: Summaries are cached per URL to save on API calls and provide instant loading.

## 🛠️ Tech Stack

- **Extension**: React 19, TypeScript, Vite 8
- **Backend**: Node.js, Express (Proxy Server)
- **AI**: Gemini 1.5 Flash API
- **Styling**: Vanilla CSS (Custom Glassmorphism System)
- **Icons**: Lucide React

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Setup the Proxy Server
For security, the API key is kept on the server.
1. Navigate to the `server` directory: `cd server`
2. Install dependencies: `npm install`
3. Create a `.env` file from `.env.example`: `cp .env.example .env`
4. Add your `GEMINI_API_KEY` to the `.env` file.
5. Start the server: `npm start` (Running on `http://localhost:3000`)

### 3. Build the Extension
1. Go back to the root directory.
2. Install dependencies: `npm install`
3. Build the project:
   ```bash
   npm run build
   ```
4. The production-ready extension will be in the `dist` folder.

### 4. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `dist` folder from this project.

## 🏗️ Architecture

- **`popup` (React App)**: The modern UI that handles user interaction, theme switching, and summary display.
- **`content.ts`**: Injected into web pages to extract the DOM and parse content using Readability.
- **`background.ts`**: A service worker that handles communication between the popup and the secure proxy server.
- **`Proxy Server`**: A lightweight Node.js backend that appends the API key and communicates with Google Gemini.

## 🔒 Security & Privacy

- **No Exposed Secrets**: The Gemini API key is stored only on your proxy server. It is never sent to or stored in the browser.
- **Sanitization**: React's built-in XSS protection handles the summary rendering.
- **Minimal Permissions**: Only requests `activeTab`, `storage`, and `scripting` to function.
- **Host Permissions**: Specifically scoped to communicate with the local proxy server.

## 📝 Trade-offs & Decisions

- **Proxy Architecture**: Moved away from client-side key storage to a proxy server to meet high security standards and prevent API key theft.
- **Readability Parser**: Chose `@mozilla/readability` to ensure high-quality content extraction across a wide variety of news and blog sites.
- **Vite Bundling**: Configured Vite to output a clean Manifest V3 structure while maintaining a modern React development workflow.
