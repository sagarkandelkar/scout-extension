# 🧭 Scout — Your Local AI Surfing Co-Pilot

A browser extension that reads the room. It detects what type of site you're on (job portal, social media, shopping, news, chat) and overlays **pro-level guidance** powered by a **local AI** running on your machine via [Ollama](https://ollama.com). Your data never leaves your computer.

**Now with Surfing Copilot** — inline suggestions, hover explanations, draft replies, command palette, and bulk actions. Like GitHub Copilot, but for the entire web.

![Scout Overlay](screenshots/demo.png)

## What It Does

### 🔍 Site Analysis (Auto-Detect)
| Site Type | Scout Highlights |
|-----------|-----------------|
| **Job Portals** | Red-flag phrases, hidden costs, scope creep, salary transparency checks, tech stack extraction |
| **Social Media** | Engagement bait detection, emotional manipulation, thread quality, low-info alerts |
| **Shopping** | Fake review detection, dark patterns (urgency traps), subscription risks, price analysis |
| **News/Blogs** | Clickbait detection, weak sourcing, bias indicators, thin reporting flags |
| **Chat / Conversations** | Manipulation tactics, pressure techniques, AI jailbreak attempts, prompt injection detection |

### 💬 Scout Chat (Built-in AI Chat Panel)
| Feature | Hotkey | What It Does |
|---------|--------|--------------|
| **Open Chat** | `Alt+Shift+C` or click 🧭 button | Slide-out chat panel with full AI conversation |
| **Page-Aware Q&A** | Just ask | AI knows what page you're on and answers in context |
| **Quick Actions** | Click buttons | "Analyze red flags", "Summarize", "Safety check", "ELI5" |
| **Conversation History** | Automatic | Maintains context across messages |

### 🤖 Surfing Copilot Features
| Feature | Hotkey | What It Does |
|---------|--------|--------------|
| **Inline Suggest** | Type in any form | Ghost-text autocomplete for searches, emails, messages, job apps |
| **Hover Explain** | `Alt+H` over any element | Reveals what buttons, links, inputs, and trackers actually do |
| **Draft Reply** | `Alt+G` in a text field | Generates context-aware replies: professional, friendly, concise, decline, negotiate |
| **Command Palette** | `Alt+Space` | Natural language commands: summarize page, extract links, dark mode, readable mode, export text |
| **Bulk Actions** | `Alt+B` | Multi-select links, images, checkboxes — open all, copy URLs, check boxes at once |

---

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

**Option A: Ollama Native (Default)**
```bash
node bridge/server.js
```

**Option B: OpenAI-Compatible / Anthropic-Style Proxy**
If you run Ollama behind an Anthropic-style proxy (e.g., `ANTHROPIC_BASE_URL=http://localhost:11434`):

```bash
# Windows PowerShell
$env:ANTHROPIC_AUTH_TOKEN="ollama"
node bridge/server.js

# macOS/Linux
ANTHROPIC_AUTH_TOKEN=ollama node bridge/server.js
```

Then edit `bridge/commands.json`:
```json
{
  "default_model": "kimi-k2.7-code:cloud",
  "ollama_url": "http://localhost:11434",
  "api_format": "openai"
}
```

You should see:
```
[scout-server] ✅ Scout server running at http://127.0.0.1:8765
   API format: openai
   Backend: http://localhost:11434
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

Browse to any job post, social feed, product page, article, or chat. Scout will auto-detect the site type and overlay insights.

**Try Scout Chat:**
- Press `Alt+Shift+C` → open the chat panel
- Ask "What red flags do you see on this page?"
- Click quick buttons: "🚨 Analyze Red Flags", "📝 Summarize", etc.

**Try the Copilot features:**
- Type in a search box → see inline suggestions
- Press `Alt+H` on a suspicious button → see what it really does
- Press `Alt+Space` → run commands like "summarize page"
- Press `Alt+G` in a message field → generate a reply draft
- Press `Alt+B` → bulk-select links to open or copy
- Press `Alt+C` → export findings for Claude review

**No server running?** You'll still see instant heuristics and all Copilot features, but the AI insights will show an offline warning.

---

## 🏗️ Architecture

```
[Browser Extension]
    ├── Content Scripts (detect site → extract context → instant heuristics)
    ├── Surfing Copilot (inline suggest, explainer, drafts, palette, bulk)
    ├── Background Worker (route to local server)
    └── Pro Panel UI (inline overlays)
                ↕
[Scout Local Server]  ← http://127.0.0.1:8765
                ↕
[Ollama / Proxy]    ← http://localhost:11434/api/generate (native)
                      ← http://localhost:11434/v1/chat/completions (OpenAI-compatible)
                ↕
[Local LLM]         ← llama3.2, mistral, kimi-k2.7-code:cloud, etc.
```

**Everything stays on your machine.** No cloud API keys needed. No telemetry.

---

## 📁 Project Structure

```
scout-extension/
├── extension/
│   ├── manifest.json          # Manifest V3
│   ├── background.js          # Routes to local server
│   ├── popup.html / popup.js  # Diagnostics popup
│   └── content/
│       ├── content.js           # Site detection + orchestration
│       ├── analyzers/
│       │   ├── job.js           # Job portal analysis
│       │   ├── social.js        # Social media decoder
│       │   ├── shopping.js      # Shopping audit
│       │   ├── news.js          # Media decoder
│       │   └── chat.js          # Conversation analysis
│       ├── copilot/
│       │   ├── inline-suggest.js  # Ghost-text autocomplete
│       │   ├── explainer.js       # Alt+H hover explanations
│       │   ├── draft-reply.js     # Alt+G reply generator
│       │   ├── command-palette.js # Alt+Space commands
│       │   ├── bulk-actions.js    # Alt+B multi-select
│       │   └── claude-export.js   # Alt+C export for Claude review
│       ├── chat-panel/
│       │   ├── chat-panel.js      # Scout Chat panel
│       │   └── chat-panel.css     # Chat panel styles
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

## 🔧 Customizing AI Prompts & Backend

Edit `bridge/commands.json`:

```json
{
  "default_model": "llama3.2",
  "ollama_url": "http://localhost:11434",
  "api_format": "ollama",
  "prompts": {
    "job": {
      "system": "You are an expert career advisor...",
      "template": "Analyze this job posting: ..."
    }
  }
}
```

| Setting | Options |
|---------|---------|
| `default_model` | Any Ollama model (`llama3.2`, `mistral`, `kimi-k2.7-code:cloud`, etc.) |
| `api_format` | `"ollama"` (native `/api/generate`) or `"openai"` (compatible `/v1/chat/completions`) |
| `ollama_url` | Your local endpoint (`http://localhost:11434` or custom proxy) |

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
- Copilot features run entirely in your browser

---

## 🤝 Contributing

This is an open-core project. The extension and bridge are fully open source.

**Ideas for contributions:**
- Add analyzers for GitHub, StackOverflow, YouTube comments
- Build a packaged installer for non-Node users
- Add a Firefox port (Manifest V2/V3 compatibility)
- Create a mobile Safari/Chrome extension wrapper
- Add new Copilot commands to the palette

---

## 📜 License

Non-Commercial License — free for personal, educational, and research use. Commercial use requires a separate license.

---

Built with local-first principles. Your data. Your AI. Your rules.
