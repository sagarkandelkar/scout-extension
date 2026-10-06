// Scout Chat Panel — Inline AI Chat While Browsing
// Talk to your local AI with full page context awareness

window.ScoutChatPanel = {
  panel: null,
  toggleBtn: null,
  messagesContainer: null,
  textarea: null,
  isOpen: false,
  isTyping: false,
  conversation: [],
  maxHistory: 20,

  init() {
    if (document.getElementById('scout-chat-panel')) return;
    this.createDOM();
    this.bindEvents();
    console.log('[Scout Chat] Panel ready. Click 🧭 button or use Alt+Shift+C to chat.');
  },

  createDOM() {
    // Toggle button (floating)
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'scout-chat-toggle';
    this.toggleBtn.innerHTML = '🧭';
    this.toggleBtn.title = 'Open Scout Chat (Alt+Shift+C)';
    document.body.appendChild(this.toggleBtn);

    // Chat panel
    this.panel = document.createElement('div');
    this.panel.id = 'scout-chat-panel';
    this.panel.innerHTML = `
      <div class="scout-chat-header">
        <div class="scout-chat-header-left">
          <div class="scout-chat-avatar">🤖</div>
          <div>
            <div class="scout-chat-title">Scout AI</div>
            <div class="scout-chat-subtitle">Local • Private</div>
          </div>
        </div>
        <div class="scout-chat-header-btns">
          <button class="scout-chat-header-btn" id="scout-chat-clear" title="Clear chat">🗑️</button>
          <button class="scout-chat-header-btn" id="scout-chat-minimize" title="Minimize">−</button>
          <button class="scout-chat-header-btn" id="scout-chat-close" title="Close">×</button>
        </div>
      </div>
      <div class="scout-chat-context">
        📍 <span id="scout-chat-page-title">Loading...</span>
      </div>
      <div class="scout-chat-messages" id="scout-chat-messages">
        <div class="scout-chat-empty">
          <div class="scout-chat-empty-icon">🧭</div>
          <div class="scout-chat-empty-title">Scout Chat</div>
          <div class="scout-chat-empty-text">
            Ask me anything about this page.<br>
            I see what you see — no data leaves your machine.
          </div>
        </div>
      </div>
      <div class="scout-chat-quick-actions" id="scout-chat-quick-actions">
        <button class="scout-chat-quick-btn" data-prompt="Analyze this page for red flags">🚨 Analyze Red Flags</button>
        <button class="scout-chat-quick-btn" data-prompt="Summarize the key points of this page">📝 Summarize</button>
        <button class="scout-chat-quick-btn" data-prompt="What should I be careful about on this site?">⚠️ Safety Check</button>
        <button class="scout-chat-quick-btn" data-prompt="Explain the main content like I'm a beginner">🔰 ELI5</button>
      </div>
      <div class="scout-chat-input-area">
        <textarea class="scout-chat-textarea" id="scout-chat-textarea" placeholder="Ask Scout about this page..." rows="1"></textarea>
        <button class="scout-chat-send-btn" id="scout-chat-send">➤</button>
      </div>
    `;
    document.body.appendChild(this.panel);

    this.messagesContainer = this.panel.querySelector('#scout-chat-messages');
    this.textarea = this.panel.querySelector('#scout-chat-textarea');

    // Bind header buttons
    this.panel.querySelector('#scout-chat-clear').addEventListener('click', () => this.clearChat());
    this.panel.querySelector('#scout-chat-minimize').addEventListener('click', () => this.minimize());
    this.panel.querySelector('#scout-chat-close').addEventListener('click', () => this.close());

    // Bind quick actions
    this.panel.querySelectorAll('.scout-chat-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sendMessage(btn.dataset.prompt);
      });
    });

    // Bind send
    this.panel.querySelector('#scout-chat-send').addEventListener('click', () => this.handleSend());
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.textarea.addEventListener('input', () => this.autoResize());
  },

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Update context when page changes
    this.updateContext();
    const observer = new MutationObserver(() => this.updateContext());
    observer.observe(document, { subtree: true, childList: true });
  },

  updateContext() {
    const title = document.title || 'Unknown page';
    const url = location.href;
    const el = this.panel?.querySelector('#scout-chat-page-title');
    if (el) {
      el.textContent = title.length > 40 ? title.slice(0, 40) + '...' : title;
      el.title = url;
    }
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.toggleBtn.classList.add('hidden');
    this.textarea.focus();
  },

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.toggleBtn.classList.remove('hidden');
  },

  minimize() {
    this.close();
  },

  clearChat() {
    this.conversation = [];
    this.messagesContainer.innerHTML = `
      <div class="scout-chat-empty">
        <div class="scout-chat-empty-icon">🧭</div>
        <div class="scout-chat-empty-title">Chat Cleared</div>
        <div class="scout-chat-empty-text">Start a new conversation.</div>
      </div>
    `;
  },

  autoResize() {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, 120) + 'px';
  },

  handleSend() {
    const text = this.textarea.value.trim();
    if (!text || this.isTyping) return;
    this.textarea.value = '';
    this.autoResize();
    this.sendMessage(text);
  },

  async sendMessage(text) {
    // Add user message
    this.addMessage('user', text);
    this.conversation.push({ role: 'user', content: text });

    // Show typing
    this.showTyping();
    this.isTyping = true;

    // Get page context
    const pageContext = this.gatherPageContext();

    try {
      const response = await this.queryAI(text, pageContext);
      this.hideTyping();
      this.isTyping = false;

      this.addMessage('ai', response);
      this.conversation.push({ role: 'assistant', content: response });

      // Trim history
      if (this.conversation.length > this.maxHistory * 2) {
        this.conversation = this.conversation.slice(-this.maxHistory * 2);
      }
    } catch (e) {
      this.hideTyping();
      this.isTyping = false;
      this.addMessage('ai', `⚠️ Error: ${e.message}\n\nMake sure the Scout server is running:\nnode bridge/server.js`, true);
    }
  },

  gatherPageContext() {
    const type = this.detectSiteType();
    const bodyText = document.body.innerText.slice(0, 3000);
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()).slice(0, 10);
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

    return {
      url: location.href,
      title: document.title,
      type: type,
      headings: headings,
      metaDescription: metaDesc,
      bodyExcerpt: bodyText
    };
  },

  detectSiteType() {
    const url = location.href.toLowerCase();
    if (/linkedin\.com\/jobs|indeed|glassdoor|greenhouse|lever/.test(url)) return 'job-portal';
    if (/twitter|x\.com|reddit|facebook|instagram|tiktok/.test(url)) return 'social-media';
    if (/amazon|ebay|aliexpress|shopify/.test(url)) return 'shopping';
    if (/news|bbc|cnn|reuters|medium|substack/.test(url)) return 'news';
    if (/claude\.ai|chat\.openai|chatgpt/.test(url)) return 'ai-chat';
    if (/github|stackoverflow|gitlab/.test(url)) return 'developer';
    return 'general';
  },

  async queryAI(userMessage, pageContext) {
    const systemPrompt = `You are Scout, an intelligent web browsing assistant. You help users understand and navigate the web page they're currently viewing.

Current page: ${pageContext.title}
URL: ${pageContext.url}
Page type: ${pageContext.type}

Key headings: ${pageContext.headings.join(' | ')}

You have access to the page content. Be concise, helpful, and action-oriented. Use markdown formatting when helpful. If the user asks about safety, red flags, or trustworthiness, be especially thorough.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversation.slice(-6), // Last 6 exchanges for context
      { role: 'user', content: `User question about this page:\n${userMessage}\n\nPage content excerpt:\n${pageContext.bodyExcerpt.slice(0, 1500)}` }
    ];

    const res = await fetch('http://127.0.0.1:8765/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: 'kimi-k2.7-code:cloud' })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server error: ${res.status} ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.response || data.choices?.[0]?.message?.content || 'No response from AI.';
  },

  addMessage(role, text, isError = false) {
    // Remove empty state if present
    const empty = this.messagesContainer.querySelector('.scout-chat-empty');
    if (empty) empty.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `scout-chat-msg scout-chat-msg-${role}`;

    const avatar = role === 'ai' ? '🤖' : '👤';
    const bubbleClass = isError ? 'style="border-color:#f43f5e !important;background:rgba(244,63,94,0.1) !important;"' : '';

    msgDiv.innerHTML = `
      <div class="scout-chat-msg-avatar">${avatar}</div>
      <div class="scout-chat-msg-bubble" ${bubbleClass}>${this.escapeHtml(text).replace(/\n/g, '<br>')}</div>
    `;

    this.messagesContainer.appendChild(msgDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  showTyping() {
    const typing = document.createElement('div');
    typing.id = 'scout-chat-typing-indicator';
    typing.className = 'scout-chat-msg scout-chat-msg-ai';
    typing.innerHTML = `
      <div class="scout-chat-msg-avatar">🤖</div>
      <div class="scout-chat-msg-bubble" style="padding:10px 14px;">
        <div class="scout-chat-typing">
          <span>Thinking</span>
          <div class="scout-chat-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(typing);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  hideTyping() {
    const typing = document.getElementById('scout-chat-typing-indicator');
    if (typing) typing.remove();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.ScoutChatPanel.init());
} else {
  window.ScoutChatPanel.init();
}
