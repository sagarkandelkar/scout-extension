# Scout — Architecture

## Stack
- **Extension:** Manifest V3, vanilla JS, no frameworks
- **Bridge:** Node.js HTTP server (localhost:8765)
- **AI:** Ollama local LLM API (localhost:11434)
- **Comms:** Extension fetch() → local server → Ollama → JSON response

## Data Flow
```
User loads page
    ↓
Content Script detects site type
    ↓
Extracts context (title, body, snippets)
    ↓
Runs instant heuristics (local JS, zero delay)
    ↓
Sends to Background Worker
    ↓
Background probes localhost:8765
    ↓
Scout Server forwards to Ollama
    ↓
Ollama returns structured insights
    ↓
Response routes back → Content Script renders in Pro Panel
```

## Components
| File | Role |
|------|------|
| `content.js` | Site detection, orchestration, SPA navigation handling |
| `analyzers/*.js` | Per-domain context extraction + heuristic rules |
| `ui/overlay.js` | Pro Panel, badges, toasts, drag interactions |
| `background.js` | Message router, server health probe, context menus |
| `bridge/server.js` | HTTP server, Ollama client, prompt interpolation |
| `bridge/commands.json` | Prompt templates per site type |

## Security
- Server binds only to 127.0.0.1 (no remote access)
- CORS allows any origin (required for extension localhost access)
- No cookies, tokens, or API keys stored
- Content scripts use shadow DOM isolation where possible

## Fallbacks
1. Server not running → show offline badge + heuristics still work
2. Ollama not running → show "Start Ollama" toast
3. AI returns invalid JSON → wrap raw response as single insight
