# Scout — Memory & Notes

## Decisions
- **Native Messaging vs HTTP Server:** Chose HTTP server for easier distribution. Native Messaging requires OS-level manifest registration which blocks non-technical users. Server approach needs only Node + one command.
- **No Frameworks:** Vanilla JS keeps the extension lightweight and audit-able. No build step required.
- **Inline Overlays vs Sidebar:** Inline overlays (top-right panel) are less intrusive than sidebars and work on all screen sizes.
- **Ollama Default Model:** `llama3.2` chosen for speed/quality balance on consumer hardware. Users can override in commands.json.

## Known Issues
- Ollama must be running before the server starts; server does not retry connection
- Content scripts may not inject on some CSP-restricted sites
- Native Messaging bridge exists as fallback but is untested

## URLs & References
- Ollama: https://ollama.com
- Manifest V3 docs: https://developer.chrome.com/docs/extensions/mv3/
- Extension samples: https://github.com/GoogleChrome/chrome-extensions-samples

## Related Memories
- [[zynovaai-remotion-video-project]] — Previous project for video automation
- [[tarot-app-engine]] — Current tarot card engine project
