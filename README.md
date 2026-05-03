# AI Page Summarizer Chrome Extension

A high-fidelity Chrome Extension built with React, Vite, and Gemini AI. It extracts meaningful content from any webpage and provides a structured summary, key insights, and estimated reading time.

## ✨ Features

- **Intelligent Extraction**: Uses `@mozilla/readability` to pull main article content while ignoring ads and sidebars.
- **AI-Powered Summaries**: Integrates with Google's Gemini 1.5 Flash for fast, accurate insights.
- **Premium Design**: Modern Glassmorphism UI with smooth animations and dark mode support.
- **Secure Storage**: Your API key is stored locally in your browser's secure storage.
- **Caching**: Summaries are cached per URL to save on API calls.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Bundler**: Vite 8
- **AI**: Gemini 1.5 Flash API
- **Styling**: Vanilla CSS (Custom Premium Design)
- **Icons**: Lucide React

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Installation
1. Clone the repository or download the source code.
2. Run `npm install` to install dependencies.
3. Build the project:
   ```bash
   npm run build
   ```
4. The production-ready extension will be in the `dist` folder.

### 3. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `dist` folder from this project.

### 4. Configuration
1. Click the extension icon in your toolbar.
2. Click the **Settings** (gear) icon.
3. Enter your **Gemini API Key**.
   - You can get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
4. Go back and start summarizing!

## 🏗️ Architecture

- **`popup` (React App)**: The user interface that handles user interaction and displays summaries.
- **`content.ts`**: Injected into web pages to extract the DOM and parse content using Readability.
- **`background.ts`**: A service worker that handles secure API calls to Gemini and manages message passing.
- **`manifest.json`**: Defines permissions (activeTab, storage, scripting) and extension entry points.

## 🔒 Security & Privacy

- **No Exposed Keys**: API keys are never hardcoded and are stored locally using `chrome.storage.local`.
- **Minimal Permissions**: Only requests the permissions necessary to function (activeTab for content extraction).
- **Secure Communication**: Uses Chrome's message passing API for inter-script communication.

## 📝 Trade-offs & Decisions

- **Vite Multi-Input**: Used Vite's `rollupOptions` to bundle the popup, content script, and background script separately in a single build step.
- **Readability Parser**: Chose `@mozilla/readability` because it's the gold standard for extracting "clean" article content from messy web pages.
- **Gemini 1.5 Flash**: Selected for its high speed and generous free tier, making it ideal for a summarization extension.

---
Built with ❤️ by Antigravity
