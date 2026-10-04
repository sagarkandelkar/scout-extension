# 🧭 Scout — Your Local AI Surfing Co-Pilot

A browser extension that reads the room. It detects what type of site you're on (job portal, social media, shopping, news) and overlays **pro-level guidance** powered by a **local AI** running on your machine via [Ollama](https://ollama.com). Your data never leaves your computer.

![Scout Overlay](screenshots/demo.png)

## What It Does

| Site Type | Scout Highlights |
|-----------|-----------------|
| **Job Portals** | Red-flag phrases, hidden costs, scope creep, salary transparency checks, tech stack extraction |
| **Social Media** | Engagement bait detection, emotional manipulation, thread quality, low-info alerts |
| **Shopping** | Fake review detection, dark patterns (urgency traps), subscription risks, price analysis |
| **News/Blogs** | Clickbait detection, weak sourcing, bias indicators, thin reporting flags |

## 🚀 Quick Start (5 Minutes)

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: https://ollama.com/download
```

Pull the AI model:
```bash
ollama pull llama3.2
```

### 2. Clone Scout

```bash
git clone https://github.com/YOURNAME/scout-extension.git
cd scout-extension
```

### 3. Start the Scout Server

```bash
node bridge/server.js
```

You should see:
```
[scout-server] ✅ Scout server running at http://127.0.0.1:8765
```

Keep this terminal running.

### 4. Load the Extension

1. Open your browser:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer Mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. Pin the Scout icon to your toolbar

### 5. Start Surfing

Browse to any job post, social feed, product page, or article. Scout will auto-detect the site type and overlay insights.

**No server running?** You'll still see instant heuristics, but the AI insights will show an offline warning.

---

## 🏗️ Architecture

```
[Browser Extension]
    ├── Content Scripts (detect site → extract context → instant heuristics)
    ├── Background Worker (route to local server)
    └── Pro Panel UI (inline overlays)
                ↕
[Scout Local Server]  ← http://127.0.0.1:8765
                ↕
[Ollama]            ← http://localhost:11434/api/generate
                ↕
[Local LLM]         ← llama3.2 (or any model you have)
```

**Everything stays on your machine.** No API keys. No cloud. No telemetry.

---

## 📁 Project Structure

```
scout-extension/
├── extension/
│   ├── manifest.json          # Manifest V3
│   ├── background.js          # Routes to local server
│   ├── popup.html / popup.js  # Extension popup
│   └── content/
│       ├── content.js           # Site detection + orchestration
│       ├── analyzers/
│       │   ├── job.js           # Job portal analysis
│       │   ├── social.js        # Social media decoder
│       │   ├── shopping.js      # Shopping audit
│       │   └── news.js          # Media decoder
│       └── ui/
│           ├── overlay.js       # Draggable Pro Panel
│           └── overlay.css      # Glassmorphism UI
├── bridge/
│   ├── server.js              # Local HTTP server (recommended)
│   ├── index.js               # Native Messaging bridge (alternative)
│   ├── commands.json          # AI prompt templates
│   └── install.js             # Native host installer
└── README.md
```

---

## 🔧 Customizing AI Prompts

Edit `bridge/commands.json` to change how Scout analyzes each site type:

```json
{
  "default_model": "llama3.2",
  "prompts": {
    "job": {
      "system": "You are an expert career advisor...",
      "template": "Analyze this job posting: ..."
    }
  }
}
```

Switch models by changing `default_model` to any Ollama model you have installed (e.g., `mistral`, `codellama`).

---

## 🌐 Browser Support

| Browser | Install Method | Notes |
|---------|---------------|-------|
| **Chrome** | Unpacked or Web Store | Full support |
| **Edge** | Unpacked or Edge Add-ons | Full support |
| **Brave** | Unpacked | Full support |
| **Opera** | Chrome Web Store | Requires "Install Chrome Extensions" add-on |
| **Vivaldi** | Chrome Web Store | Full support |

---

## 🛡️ Privacy

- All AI inference runs locally via Ollama
- The Scout server only binds to `127.0.0.1` — unreachable from the internet
- No data is sent to any cloud service
- No analytics, no tracking, no cookies

---

## 🤝 Contributing

This is an open-core project. The extension and bridge are fully open source.

**Ideas for contributions:**
- Add analyzers for GitHub, StackOverflow, YouTube comments
- Build a packaged installer for non-Node users
- Add a Firefox port (Manifest V2/V3 compatibility)
- Create a mobile Safari/Chrome extension wrapper

---

## 📜 License

MIT — free to use, modify, and distribute.

---

Built with local-first principles. Your data. Your AI. Your rules.
