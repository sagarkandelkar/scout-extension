// Inline Suggestion Engine — Surfing Copilot
// Provides ghost-text autocomplete for forms, searches, and textareas
// Like GitHub Copilot but for the web

window.ScoutInlineSuggest = {
  enabled: true,
  currentInput: null,
  ghostElement: null,
  debounceTimer: null,

  init() {
    document.addEventListener('focusin', (e) => this.handleFocus(e));
    document.addEventListener('input', (e) => this.handleInput(e));
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.addEventListener('click', () => this.hideGhost());
    console.log('[Scout Inline] Initialized');
  },

  handleFocus(e) {
    const el = e.target;
    if (this.isTextInput(el)) {
      this.currentInput = el;
      this.showGhost(el, 'Type to get suggestions...');
    }
  },

  handleInput(e) {
    const el = e.target;
    if (!this.isTextInput(el)) return;
    this.currentInput = el;

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.generateSuggestion(el);
    }, 300);
  },

  async generateSuggestion(el) {
    const text = el.value || el.innerText || '';
    const cursorPos = el.selectionStart || text.length;
    const beforeCursor = text.slice(0, cursorPos);
    const wordBefore = beforeCursor.split(/\s+/).pop();

    if (beforeCursor.length < 3) {
      this.hideGhost();
      return;
    }

    // Context-aware predictions
    const context = this.detectInputContext(el);
    const suggestion = await this.predict(context, beforeCursor, wordBefore);

    if (suggestion) {
      this.showGhost(el, suggestion);
    } else {
      this.hideGhost();
    }
  },

  detectInputContext(el) {
    const placeholder = (el.placeholder || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const label = this.findLabel(el).toLowerCase();
    const url = location.href.toLowerCase();

    if (/search|query|find|look/i.test(placeholder + name + id + label)) return 'search';
    if (/email|e-mail|mail/i.test(placeholder + name + id + label)) return 'email';
    if (/password|pass/i.test(placeholder + name + id + label)) return 'password';
    if (/message|comment|reply|post/i.test(placeholder + name + id + label)) return 'message';
    if (/address|street|city|zip/i.test(placeholder + name + id + label)) return 'address';
    if (/linkedin\.com\/jobs|indeed|glassdoor/i.test(url)) return 'job-application';
    if (/twitter|x\.com|reddit|facebook/i.test(url)) return 'social-post';
    if (/amazon|ebay|shopify/i.test(url)) return 'ecommerce';

    return 'generic';
  },

  findLabel(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.innerText;
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.innerText;
    return '';
  },

  async predict(context, beforeCursor, wordBefore) {
    // Heuristic predictions (instant, no AI needed)
    const predictions = {
      'search': () => {
        const common = {
          'how to': ' build a browser extension with manifest v3',
          'what is': ' the best local ai model for privacy',
          'best': ' practices for chrome extension security',
          'ollama': ' vs localai comparison 2025',
          'scout': ' browser extension github open source',
        };
        for (const [prefix, suffix] of Object.entries(common)) {
          if (beforeCursor.toLowerCase().includes(prefix)) return suffix;
        }
        return null;
      },
      'email': () => {
        if (beforeCursor.includes('@')) return null;
        const domains = ['@gmail.com', '@outlook.com', '@proton.me'];
        return domains[0];
      },
      'job-application': () => {
        const phrases = {
          'dear': ' Hiring Manager,',
          'i am writing': ' to express my interest in the position',
          'my experience': ' spans over 5 years in software development',
          'salary': ' expectations are flexible based on the role',
        };
        for (const [prefix, suffix] of Object.entries(phrases)) {
          if (beforeCursor.toLowerCase().includes(prefix)) return suffix;
        }
        return null;
      },
      'message': () => {
        const phrases = {
          'hi': ' there, thanks for reaching out!',
          'thanks': ' for your help with this',
          'can you': ' please provide more details?',
        };
        for (const [prefix, suffix] of Object.entries(phrases)) {
          if (beforeCursor.toLowerCase().startsWith(prefix)) return suffix;
        }
        return null;
      },
      'social-post': () => {
        const phrases = {
          'just launched': ' my new open source project! 🚀',
          'excited to': ' announce that I\'m open to new opportunities',
          'build in': ' public - here\'s what I learned this week',
        };
        for (const [prefix, suffix] of Object.entries(phrases)) {
          if (beforeCursor.toLowerCase().includes(prefix)) return suffix;
        }
        return null;
      },
    };

    const predictor = predictions[context] || predictions['generic'];
    return predictor ? predictor() : null;
  },

  showGhost(inputEl, text) {
    this.hideGhost();

    const ghost = document.createElement('div');
    ghost.id = 'scout-ghost-text';
    ghost.textContent = text;
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      color: #5eead4;
      opacity: 0.6;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: pre;
      background: transparent;
    `;

    const rect = inputEl.getBoundingClientRect();
    const computed = getComputedStyle(inputEl);
    ghost.style.top = `${rect.top + parseInt(computed.paddingTop)}px`;
    ghost.style.left = `${rect.left + parseInt(computed.paddingLeft)}px`;
    ghost.style.fontSize = computed.fontSize;
    ghost.style.fontFamily = computed.fontFamily;

    document.body.appendChild(ghost);
    this.ghostElement = ghost;
  },

  hideGhost() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }
  },

  handleKeydown(e) {
    // Tab to accept suggestion
    if (e.key === 'Tab' && this.ghostElement && this.currentInput) {
      e.preventDefault();
      const suggestion = this.ghostElement.textContent;
      const el = this.currentInput;
      const val = el.value || '';
      const pos = el.selectionStart || val.length;
      el.value = val.slice(0, pos) + suggestion + val.slice(pos);
      el.selectionStart = el.selectionEnd = pos + suggestion.length;
      this.hideGhost();
    }

    // Escape to dismiss
    if (e.key === 'Escape') {
      this.hideGhost();
    }
  },

  isTextInput(el) {
    return el && (
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'INPUT' && /text|email|search|url|tel/.test(el.type) ||
      el.contentEditable === 'true'
    );
  }
};

// Auto-init
window.ScoutInlineSuggest.init();
