// Command Palette — Surfing Copilot
// Alt+Space opens a natural language command interface
// Like VS Code Command Palette but for the entire web

window.ScoutCommandPalette = {
  palette: null,
  input: null,
  results: null,
  commands: [],

  init() {
    this.buildCommandRegistry();
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.palette) {
        this.close();
      }
    });
    console.log('[Scout Palette] Alt+Space for command palette');
  },

  buildCommandRegistry() {
    this.commands = [
      {
        id: 'summarize-page',
        title: '📄 Summarize this page',
        keywords: 'summarize tl;dr summary',
        action: () => this.sendToAI('news', { body: document.body.innerText.slice(0, 6000), headline: document.title })
      },
      {
        id: 'extract-links',
        title: '🔗 Extract all links',
        keywords: 'links urls extract',
        action: () => {
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ text: a.innerText.trim(), href: a.href }))
            .filter(l => l.href.startsWith('http'));
          this.showResult(`Found ${links.length} links. First 10:\n\n` +
            links.slice(0, 10).map(l => `• ${l.text.slice(0, 60)} → ${l.href.slice(0, 80)}`).join('\n'));
        }
      },
      {
        id: 'show-images',
        title: '🖼️ List all images',
        keywords: 'images pictures media',
        action: () => {
          const imgs = Array.from(document.querySelectorAll('img'));
          this.showResult(`${imgs.length} images on page.\n` +
            imgs.slice(0, 10).map(img => `• ${img.alt || 'no alt'} (${img.naturalWidth}×${img.naturalHeight})`).join('\n'));
        }
      },
      {
        id: 'dark-mode',
        title: '🌙 Force dark mode on this page',
        keywords: 'dark mode theme night',
        action: () => {
          document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
          document.querySelectorAll('img, video').forEach(el => el.style.filter = 'invert(1) hue-rotate(180deg)');
          this.showResult('Dark mode applied! Reload page to reset.');
        }
      },
      {
        id: 'readable-mode',
        title: '📖 Readable mode (remove clutter)',
        keywords: 'readable reader clean simplify',
        action: () => {
          const article = document.querySelector('article, main, [role="main"]');
          if (article) {
            document.body.innerHTML = article.outerHTML;
            document.body.style.cssText = 'max-width: 700px; margin: 40px auto; font-size: 18px; line-height: 1.6; padding: 20px;';
          }
          this.showResult('Reader mode activated.');
        }
      },
      {
        id: 'export-text',
        title: '💾 Export page text',
        keywords: 'export save text markdown',
        action: () => {
          const text = document.body.innerText;
          const blob = new Blob([text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${document.title.slice(0, 50).replace(/[^a-z0-9]/gi, '_')}.txt`;
          a.click();
          this.showResult('Text exported!');
        }
      },
      {
        id: 'highlight-trackers',
        title: '👁️ Highlight tracking elements',
        keywords: 'trackers tracking pixels privacy',
        action: () => {
          let count = 0;
          document.querySelectorAll('img').forEach(img => {
            if (img.width <= 2 && img.height <= 2) {
              img.style.outline = '3px solid #f43f5e';
              count++;
            }
          });
          document.querySelectorAll('iframe').forEach(ifr => {
            ifr.style.outline = '3px solid #f59e0b';
            count++;
          });
          this.showResult(`Highlighted ${count} potential tracking elements.`);
        }
      },
      {
        id: 'show-password',
        title: '👁️ Reveal password fields',
        keywords: 'password show reveal',
        action: () => {
          document.querySelectorAll('input[type="password"]').forEach(el => {
            el.type = 'text';
            el.style.border = '2px solid #f43f5e';
          });
          this.showResult('Password fields revealed (red border).');
        }
      },
      {
        id: 'disable-animations',
        title: '⏹️ Disable all animations',
        keywords: 'animations motion reduce',
        action: () => {
          const style = document.createElement('style');
          style.textContent = '* { animation: none !important; transition: none !important; }';
          document.head.appendChild(style);
          this.showResult('All CSS animations disabled.');
        }
      },
      {
        id: 'scout-analyze',
        title: '🧭 Run Scout analysis now',
        keywords: 'scout analyze check',
        action: () => {
          window.dispatchEvent(new CustomEvent('scout:refresh'));
          this.showResult('Scout analysis triggered on this page.');
        }
      },
      {
        id: 'form-fill',
        title: '📝 Auto-fill form with test data',
        keywords: 'form fill populate lorem',
        action: () => {
          const fillers = {
            'name': 'John Doe',
            'email': 'test@example.com',
            'phone': '555-0100',
            'address': '123 Test Street',
            'city': 'Testville',
            'zip': '10001',
            'company': 'Test Corp',
            'title': 'Software Engineer',
            'message': 'This is a test message generated by Scout.'
          };
          let count = 0;
          document.querySelectorAll('input, textarea').forEach(el => {
            const name = (el.name || el.id || '').toLowerCase();
            for (const [key, val] of Object.entries(fillers)) {
              if (name.includes(key) && !el.value) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                count++;
                break;
              }
            }
          });
          this.showResult(`Filled ${count} form fields with test data.`);
        }
      }
    ];
  },

  toggle() {
    if (this.palette) this.close();
    else this.open();
  },

  open() {
    if (this.palette) return;

    const overlay = document.createElement('div');
    overlay.id = 'scout-palette-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      z-index: 2147483647;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 120px;
      backdrop-filter: blur(4px);
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      width: 560px;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(94, 234, 212, 0.2);
      border-radius: 14px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.6);
      overflow: hidden;
    `;

    container.innerHTML = `
      <div style="padding:16px 20px;border-bottom:1px solid rgba(94,234,212,0.1);">
        <input id="scout-palette-input" placeholder="Type a command... (e.g., 'summarize', 'dark mode')"
          style="width:100%;background:transparent;border:none;outline:none;color:#e2e8f0;font-size:15px;font-family:inherit;"
          autocomplete="off" spellcheck="false"
        />
      </div>
      <div id="scout-palette-results" style="max-height:320px;overflow-y:auto;padding:8px 0;"></div>
      <div style="padding:10px 20px;border-top:1px solid rgba(94,234,212,0.1);font-size:11px;color:#475569;">
        ↑↓ navigate • Enter run • Esc close
      </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);
    this.palette = overlay;
    this.input = container.querySelector('#scout-palette-input');
    this.results = container.querySelector('#scout-palette-results');

    this.input.focus();
    this.renderResults(this.commands);

    this.input.addEventListener('input', () => this.filter());
    this.input.addEventListener('keydown', (e) => this.handleKeynav(e));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
  },

  filter() {
    const q = this.input.value.toLowerCase().trim();
    const filtered = q
      ? this.commands.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.keywords.toLowerCase().includes(q)
        )
      : this.commands;
    this.renderResults(filtered);
  },

  renderResults(items) {
    if (items.length === 0) {
      this.results.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:13px;">No commands found. Try "summarize" or "dark".</div>';
      return;
    }
    this.results.innerHTML = items.map((cmd, i) => `
      <div class="scout-cmd-item" data-index="${i}" data-id="${cmd.id}"
        style="padding:10px 20px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background 0.1s;"
      >
        <span style="font-size:16px;">${cmd.title.split(' ')[0]}</span>
        <span style="color:#e2e8f0;font-size:13px;">${cmd.title.replace(/^[^ ]+ /, '')}</span>
      </div>
    `).join('');

    this.results.querySelectorAll('.scout-cmd-item').forEach(el => {
      el.addEventListener('mouseenter', () => this.highlight(el));
      el.addEventListener('click', () => this.execute(el.dataset.id));
    });

    // Auto-select first
    const first = this.results.querySelector('.scout-cmd-item');
    if (first) this.highlight(first);
  },

  highlight(el) {
    this.results.querySelectorAll('.scout-cmd-item').forEach(item => {
      item.style.background = 'transparent';
    });
    el.style.background = 'rgba(94, 234, 212, 0.08)';
    el.dataset.selected = 'true';
  },

  handleKeynav(e) {
    const items = Array.from(this.results.querySelectorAll('.scout-cmd-item'));
    const current = items.findIndex(el => el.dataset.selected === 'true');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[current + 1] || items[0];
      if (next) this.highlight(next);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[current - 1] || items[items.length - 1];
      if (prev) this.highlight(prev);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = items.find(el => el.dataset.selected === 'true');
      if (selected) this.execute(selected.dataset.id);
    }
  },

  execute(id) {
    const cmd = this.commands.find(c => c.id === id);
    if (cmd) {
      this.close();
      cmd.action();
    }
  },

  async sendToAI(type, context) {
    this.showResult('Sending to AI...');
    try {
      const res = await fetch('http://127.0.0.1:8765/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context, url: location.href, title: document.title })
      });
      const data = await res.json();
      if (data.insights) {
        const text = data.insights.map(i => `• ${i.title}\n  ${i.description}`).join('\n\n');
        this.showResult(text);
      }
    } catch (e) {
      this.showResult(`AI error: ${e.message}`);
    }
  },

  showResult(text) {
    if (!this.palette) return;
    this.results.innerHTML = `
      <div style="padding:16px 20px;color:#e2e8f0;font-size:13px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;">
        ${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    `;
  },

  close() {
    if (this.palette) {
      this.palette.remove();
      this.palette = null;
      this.input = null;
      this.results = null;
    }
  }
};

window.ScoutCommandPalette.init();
