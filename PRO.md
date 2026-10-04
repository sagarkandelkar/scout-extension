# Scout — Product Requirements

## Vision
A local-first browser extension that reads context from any web page and overlays intelligent, privacy-respecting guidance. All AI runs on the user's machine. Zero cloud dependency.

## Target Users
- Job seekers who want to spot red flags before applying
- Shoppers who want to avoid dark patterns and fake reviews
- Social media users who want to detect manipulation
- News readers who want bias signals before sharing

## Core Features (v1)
1. **Auto Site Detection** — Identifies job, social, shopping, news pages automatically
2. **Instant Heuristics** — Local pattern matching (no AI delay) for immediate feedback
3. **AI Enrichment** — Local Ollama-powered analysis for deeper insights
4. **Inline Overlays** — Draggable Pro Panel, badges, and toasts directly on pages
5. **Selection Analysis** — Right-click any text to analyze with context

## Non-Goals (v1)
- No cloud API calls
- No user accounts or sync
- No Firefox/Safari support yet
- No packaged installer (dev mode only)

## Success Metrics
- Extension loads without errors on target sites
- Heuristics fire within 500ms of page load
- AI responses arrive within 10 seconds
- Zero data leaves localhost
