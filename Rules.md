# Scout — Coding Rules

## General
- No external CDN dependencies in extension code
- No tracking, analytics, or telemetry
- No cloud API keys or external services except localhost Ollama
- All user data stays in memory; nothing persisted to disk except browser storage

## Extension
- Manifest V3 only
- Use `chrome.runtime.sendMessage` for all cross-context communication
- Content scripts must check `window.__SCOUT_INITIALIZED__` to prevent double-injection
- SPA sites: hijack `history.pushState` and `popstate` to re-run analysis

## Naming
- Do not use names or trademarks of other AI assistants, browser extensions, or products
- Internal variables use `scout` prefix or `SCOUT_` constants
- Analyzer objects exported as `window.Scout{Type}Analyzer`

## AI Prompts
- Prompts must request JSON array output with `{title, description, severity}` keys
- Severity levels: `high`, `medium`, `low`, `info`
- Include escape hatches: if JSON parse fails, wrap raw response

## UI
- Overlay uses fixed positioning with z-index 2147483647
- All colors defined in CSS variables for theming (future)
- No `!important` unless overriding hostile site styles
- Toast auto-dismiss after 4 seconds with fade animation

## Bridge
- Server responds within 120s timeout
- CORS headers required on all responses
- Graceful shutdown on SIGINT
