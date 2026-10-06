# 🧭 Scout Sentinel

**Spatial Ambient Intelligence for the Web**

One orb. One HUD. Inline pins. Selection lens.
No panels. No popups. No chat bubbles. Just pure context.

Scout Sentinel reads the room as you browse. It detects what type of site you're on — job portal, social media, shopping, news, chat — and surfaces insights as **spatial annotations** directly on the page, not in a cramped sidebar.

---

## 🎬 How It Looks

```
┌─────────────────────────────────────────────┐
│  [Web Page Content]                         │
│                                             │
│  Apply Now  [1]   ←── small numbered pin    │
│  ─────────────────                          │
│  Unlimited PTO! [2]                        │
│                                             │
│                                    🧭       │
│                           (Sentinel Orb     │
│                            bottom-right)      │
└─────────────────────────────────────────────┘
              ↓ Click Orb
┌─────────────────────────────────────────────┐
│  Findings │ Scout Response                   │
│  ─────────┼────────────────                  │
│  [1] ⚠️   │ 🧑‍💻 What red flags do you see?   │
│  [2] 🚨   │ 🤖 Scout: "Unlimited PTO" is...  │
│  ─────────┼────────────────                  │
│  Ask Scout about this page... [➤]           │
└─────────────────────────────────────────────┘
           (Bottom HUD rises up)
```

---

## 🆕 What's New in Sentinel v2.0

| Feature | How It Works |
|---------|-------------|
| **🧭 Sentinel Orb** | Single glass orb bottom-right. Color = page health (blue analyzing, green safe, yellow caution, red alert). Pulses when issues found. |
| **📊 Bottom HUD** | Rises from bottom like a command terminal. Findings sidebar + response area + command input. Not a side panel — doesn't shrink the page. |
| **📌 Inline Pins** | Numbered badges pinned directly to suspicious elements on the page. Hover for tooltip, click to expand in HUD. |
| **🔍 Selection Lens** | Hold `Alt` and drag anywhere to select a region. Scout analyzes just that area. Like screenshot-to-insight. |
| **⌨️ Keyboard First** | `Alt+Shift+C` toggle HUD. `Alt+drag` selection lens. `Esc` close. No mouse required. |

---

## 🚀 Quick Start

### 1. Install Ollama

```bash
# Windows: https://ollama.com/download
# macOS/Linux:
curl -fsSL https://ollama.com/install.sh | sh

ollama pull llama3.2
```

### 2. Start Scout Server

```bash
cd scout-extension/bridge
node server.js
```

For Anthropic-style proxy:
```bash
# Windows:
set ANTHROPIC_AUTH_TOKEN=ollama
node server.js
```

### 3. Load Extension

1. Edge/Chrome → `edge://extensions/` or `chrome://extensions/`
2. Enable **Developer Mode**
3. **Load unpacked** → select `scout-extension/extension/`
4. The 🧭 Sentinel Orb appears on every page

---

## ⌨️ Controls

| Key | Action |
|-----|--------|
| `Alt + Shift + C` | Toggle Bottom HUD |
| `Alt + Drag` | Selection Lens — analyze any page region |
| `Esc` | Close HUD |
| `Click Orb` | Open HUD |
| `Click Pin` | Jump to finding in HUD |

---

## 🏗️ Architecture

```
[Web Page]
    ├── Sentinel Orb (fixed, bottom-right)
    ├── Inline Pins (absolute, on elements)
    └── Selection Lens (overlay on drag)
            ↓
    [Bottom HUD] — rises on demand
        ├── Sidebar: findings list
        ├── Main: response stream
        └── Input: command line
            ↕
    [Local Server] — localhost:8765
        ├── GET  /health
        ├── POST /analyze (site analysis)
        └── POST /chat (conversation)
            ↕
    [Ollama] — localhost:11434
```

---

## 📁 Project Structure

```
scout-extension/
├── extension/
│   ├── manifest.json          # Manifest V3
│   ├── background.js          # Message routing
│   ├── popup.html / popup.js  # Minimal status popup
│   └── content/
│       ├── content.js         # Site detection + orchestration
│       ├── analyzers/
│       │   ├── job.js           # Job portal: red flags, salary traps
│       │   ├── social.js        # Social media: engagement bait
│       │   ├── shopping.js      # Shopping: dark patterns, fake reviews
│       │   ├── news.js          # News: clickbait, bias, sourcing
│       │   └── chat.js          # Conversations: manipulation detection
│       └── sentinel/
│           ├── sentinel.js      # Orb, HUD, Pins, Lens, Chat
│           └── sentinel.css     # Spatial glassmorphism UI
├── bridge/
│   ├── server.js              # HTTP server + Ollama bridge
│   ├── commands.json          # AI prompt templates
│   └── package.json
└── README.md
```

---

## 🔧 Backend Config

Edit `bridge/commands.json`:

```json
{
  "default_model": "llama3.2",
  "ollama_url": "http://localhost:11434",
  "api_format": "ollama"
}
```

| `api_format` | Use when |
|-------------|---------|
| `"ollama"` | Direct Ollama (`/api/generate`) |
| `"openai"` | Proxied Ollama (`/v1/chat/completions`) |

---

## 🌐 Browser Support

| Browser | Status |
|---------|--------|
| **Chrome** | ✅ Full |
| **Edge** | ✅ Full |
| **Brave** | ✅ Full |
| **Opera** | ✅ With "Install Chrome Extensions" |
| **Firefox** | ❌ Not yet (Manifest V2/V3 differences) |

---

## 🛡️ Privacy

- All AI runs locally via Ollama
- Server binds to `127.0.0.1` only
- No cloud APIs, no telemetry, no tracking
- Extension permissions: `activeTab` + `clipboardWrite` only

---

## 📜 License

Non-Commercial License — free for personal, educational, and research use. Commercial use requires a separate license.

---

**Built with spatial-first principles.** Your data. Your AI. Your rules.
