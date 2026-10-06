/**
 * SCOUT SENTINEL — Spatial Ambient Intelligence
 * One orb. One HUD. Inline pins. Selection lens.
 * No panels. No popups. No chat bubbles.
 */

window.ScoutSentinel = {
  orb: null,
  hud: null,
  isHudOpen: false,
  findings: [],
  pins: [],
  isLensActive: false,
  lensStart: null,
  lensBox: null,
  conversation: [],

  init() {
    if (document.getElementById('sentinel-orb')) return;
    this.buildOrb();
    this.buildHUD();
    this.bindGlobalKeys();
    this.updateOrbState('info', 'Scout ready');
    console.log('[Sentinel] Orb deployed. Alt+Shift+C for HUD. Alt+drag for lens.');
  },

  /* ═══════════════════════════════════════
     ORB
     ═══════════════════════════════════════ */

  buildOrb() {
    this.orb = document.createElement('div');
    this.orb.id = 'sentinel-orb';
    this.orb.dataset.state = 'info';
    this.orb.dataset.tooltip = 'Scout Sentinel — Click to open HUD';
    this.orb.innerHTML = '<span class="sentinel-orb-icon">🧭</span>';
    document.body.appendChild(this.orb);

    this.orb.addEventListener('click', () => this.toggleHUD());
  },

  updateOrbState(state, tooltip) {
    if (!this.orb) return;
    this.orb.dataset.state = state;
    this.orb.dataset.tooltip = tooltip;

    const states = { safe: '✓', warn: '!', alert: '⚠', info: '🧭' };
    const icon = this.orb.querySelector('.sentinel-orb-icon');
    if (icon) icon.textContent = states[state] || '🧭';

    if (state === 'alert' || state === 'warn') {
      this.orb.classList.add('pulsing');
    } else {
      this.orb.classList.remove('pulsing');
    }
  },

  spinOrb() {
    if (this.orb) this.orb.classList.add('spinning');
  },

  stopOrb() {
    if (this.orb) this.orb.classList.remove('spinning');
  },

  /* ═══════════════════════════════════════
     HUD (Bottom Drawer)
     ═══════════════════════════════════════ */

  buildHUD() {
    this.hud = document.createElement('div');
    this.hud.id = 'sentinel-hud';
    this.hud.innerHTML = `
      <div class="sentinel-hud-header">
        <div class="sentinel-hud-header-left">
          <span class="sentinel-hud-title">🧭 SCOUT</span>
          <span class="sentinel-hud-context" id="sentinel-hud-context">${document.title.slice(0, 50)}</span>
        </div>
        <div class="sentinel-hud-header-right">
          <button class="sentinel-hud-btn" id="sentinel-hud-fs" title="Fullscreen">⛶</button>
          <button class="sentinel-hud-btn" id="sentinel-hud-close" title="Close">×</button>
        </div>
      </div>
      <div class="sentinel-hud-body">
        <div class="sentinel-hud-sidebar">
          <div class="sentinel-mini-dash">
            <div class="sentinel-dash-cell">
              <div class="sentinel-dash-value" id="sentinel-dash-alerts">0</div>
              <div class="sentinel-dash-label">Alerts</div>
            </div>
            <div class="sentinel-dash-cell">
              <div class="sentinel-dash-value" id="sentinel-dash-type">—</div>
              <div class="sentinel-dash-label">Site Type</div>
            </div>
          </div>
          <div class="sentinel-hud-sidebar-title">Findings</div>
          <div id="sentinel-findings-list">
            <div style="padding:20px;text-align:center;color:#475569;font-size:12px;">No findings yet.<br>Browse to analyze.</div>
          </div>
        </div>
        <div class="sentinel-hud-main">
          <div class="sentinel-hud-response" id="sentinel-hud-response">
            <p style="color:#475569;text-align:center;padding-top:40px;">👋 Welcome to Scout Sentinel.</p>
            <p style="color:#475569;text-align:center;">Ask me anything about this page, or click a finding on the left.</p>
          </div>
          <div class="sentinel-hud-inputbar">
            <input type="text" class="sentinel-hud-input" id="sentinel-hud-input"
              placeholder="Ask Scout about this page... (e.g., 'analyze red flags', 'summarize', 'is this safe?')" />
            <button class="sentinel-hud-send" id="sentinel-hud-send">➤</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.hud);

    // Bind HUD controls
    this.hud.querySelector('#sentinel-hud-close').addEventListener('click', () => this.closeHUD());
    this.hud.querySelector('#sentinel-hud-fs').addEventListener('click', () => this.toggleFullscreen());

    const input = this.hud.querySelector('#sentinel-hud-input');
    const sendBtn = this.hud.querySelector('#sentinel-hud-send');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleHUDQuery(input.value.trim());
    });
    sendBtn.addEventListener('click', () => this.handleHUDQuery(input.value.trim()));
  },

  toggleHUD() {
    if (this.isHudOpen) this.closeHUD();
    else this.openHUD();
  },

  openHUD() {
    this.isHudOpen = true;
    this.hud.classList.add('open');
    this.hud.querySelector('#sentinel-hud-input').focus();
  },

  closeHUD() {
    this.isHudOpen = false;
    this.hud.classList.remove('open', 'fullscreen');
  },

  toggleFullscreen() {
    this.hud.classList.toggle('fullscreen');
  },

  /* ═══════════════════════════════════════
     FINDINGS → SIDEBAR + PINS
     ═══════════════════════════════════════ */

  renderFindings(findings, siteType) {
    this.findings = findings;
    this.clearPins();

    // Update dash
    const highCount = findings.filter(f => f.severity === 'high').length;
    document.getElementById('sentinel-dash-alerts').textContent = highCount;
    document.getElementById('sentinel-dash-type').textContent = siteType || '—';

    // Update orb
    if (highCount > 0) this.updateOrbState('alert', `${highCount} critical issues found`);
    else if (findings.some(f => f.severity === 'medium')) this.updateOrbState('warn', 'Caution advised');
    else if (findings.length > 0) this.updateOrbState('safe', 'Page looks clean');

    // Render sidebar list
    const list = document.getElementById('sentinel-findings-list');
    if (findings.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#475569;font-size:12px;">No findings detected.</div>';
      return;
    }

    const sevOrder = { high: 0, medium: 1, low: 2, info: 3 };
    const sorted = [...findings].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    list.innerHTML = sorted.map((f, i) => `
      <div class="sentinel-finding-item" data-index="${i}" data-severity="${f.severity}"
        onclick="window.ScoutSentinel.selectFinding(${i})">
        <div class="sentinel-finding-title">${this.escapeHtml(f.title)}</div>
        <div class="sentinel-finding-meta">${f.severity.toUpperCase()} • ${f.source}</div>
      </div>
    `).join('');

    // Place pins on elements (if element selectors are provided)
    this.placePins(sorted);
  },

  selectFinding(index) {
    const finding = this.findings[index];
    if (!finding) return;

    // Highlight in sidebar
    document.querySelectorAll('.sentinel-finding-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.sentinel-finding-item[data-index="${index}"]`);
    if (item) item.classList.add('active');

    // Show in HUD response
    const response = document.getElementById('sentinel-hud-response');
    response.innerHTML = `
      <p style="color:#5eead4;font-weight:700;font-size:14px;margin-bottom:10px;">${this.escapeHtml(finding.title)}</p>
      <p style="line-height:1.7;margin-bottom:12px;">${this.escapeHtml(finding.description)}</p>
      <p style="font-size:11px;color:#64748b;">Severity: ${finding.severity.toUpperCase()} • Source: ${finding.source} • ${finding.type || 'insight'}</p>
    `;
  },

  /* ═══════════════════════════════════════
     INLINE PINS
     ═══════════════════════════════════════ */

  placePins(findings) {
    // For each finding, try to find a relevant element and pin a badge
    // This is heuristic — analyzers can optionally provide `selector` hints
    findings.forEach((f, i) => {
      let target = null;

      // If finding has a selector hint, use it
      if (f.selector) {
        target = document.querySelector(f.selector);
      }

      // Otherwise, search by keyword in common suspicious elements
      if (!target && f.title) {
        const keywords = this.extractKeywords(f.title + ' ' + f.description);
        target = this.findElementByKeywords(keywords);
      }

      if (target) {
        this.createPin(target, f, i + 1);
      }
    });
  },

  createPin(targetEl, finding, number) {
    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const pin = document.createElement('div');
    pin.className = 'sentinel-pin';
    pin.dataset.severity = finding.severity;
    pin.style.left = `${rect.right + window.scrollX + 4}px`;
    pin.style.top = `${rect.top + window.scrollY + 4}px`;
    pin.innerHTML = `
      <div class="sentinel-pin-dot">${number}</div>
      <div class="sentinel-pin-tooltip">
        <div class="sentinel-pin-tooltip-title">${this.escapeHtml(finding.title)}</div>
        ${this.escapeHtml(finding.description.slice(0, 120))}${finding.description.length > 120 ? '...' : ''}
      </div>
    `;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openHUD();
      this.selectFinding(this.findings.indexOf(finding));
    });

    document.body.appendChild(pin);
    this.pins.push(pin);
  },

  clearPins() {
    this.pins.forEach(p => p.remove());
    this.pins = [];
  },

  extractKeywords(text) {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'been', 'they', 'their', 'there', 'where', 'would', 'should', 'could']);
    return words.filter(w => !stopWords.has(w)).slice(0, 5);
  },

  findElementByKeywords(keywords) {
    const selectors = [
      'h1', 'h2', 'h3', 'button', 'a', '[class*="price"]', '[class*="deal"]',
      '[class*="urgent"]', '[class*="limited"]', '[class*="subscribe"]'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        if (keywords.some(kw => text.includes(kw))) return el;
      }
    }
    return null;
  },

  /* ═══════════════════════════════════════
     SELECTION LENS (Alt+Drag)
     ═══════════════════════════════════════ */

  bindGlobalKeys() {
    let isDragging = false;
    let startX, startY;

    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.toggleHUD();
      }
      if (e.key === 'Escape' && this.isHudOpen) {
        this.closeHUD();
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.altKey && !this.isHudOpen) {
        e.preventDefault();
        this.isLensActive = true;
        isDragging = true;
        startX = e.clientX + window.scrollX;
        startY = e.clientY + window.scrollY;
        this.createLensOverlay(startX, startY);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.isLensActive) return;
      const currentX = e.clientX + window.scrollX;
      const currentY = e.clientY + window.scrollY;
      this.updateLensBox(startX, startY, currentX, currentY);
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging || !this.isLensActive) return;
      isDragging = false;
      this.isLensActive = false;

      const endX = e.clientX + window.scrollX;
      const endY = e.clientY + window.scrollY;
      this.destroyLensOverlay();

      // Only trigger if selection is meaningful
      if (Math.abs(endX - startX) > 30 && Math.abs(endY - startY) > 30) {
        this.analyzeSelection(startX, startY, endX, endY);
      }
    });
  },

  createLensOverlay(x, y) {
    const overlay = document.createElement('div');
    overlay.id = 'sentinel-lens-overlay';
    document.body.appendChild(overlay);

    const box = document.createElement('div');
    box.id = 'sentinel-lens-box';
    document.body.appendChild(box);
    this.lensBox = box;
  },

  updateLensBox(sx, sy, cx, cy) {
    if (!this.lensBox) return;
    const left = Math.min(sx, cx);
    const top = Math.min(sy, cy);
    const width = Math.abs(cx - sx);
    const height = Math.abs(cy - sy);
    this.lensBox.style.left = left + 'px';
    this.lensBox.style.top = top + 'px';
    this.lensBox.style.width = width + 'px';
    this.lensBox.style.height = height + 'px';
  },

  destroyLensOverlay() {
    document.getElementById('sentinel-lens-overlay')?.remove();
    this.lensBox?.remove();
    this.lensBox = null;
  },

  async analyzeSelection(x1, y1, x2, y2) {
    // Find elements within the selection box
    const box = { left: Math.min(x1, x2), top: Math.min(y1, y2), right: Math.max(x1, x2), bottom: Math.max(y1, y2) };
    const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, div, span, a, button, img'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        const ex = r.left + window.scrollX;
        const ey = r.top + window.scrollY;
        return ex >= box.left && ex <= box.right && ey >= box.top && ey <= box.bottom;
      });

    const selectedText = elements.map(el => el.innerText).filter(Boolean).join('\n').slice(0, 2000);

    if (!selectedText) {
      this.showToast('No text in selection', 'warning');
      return;
    }

    this.openHUD();
    this.setHUDResponse('🔍 Analyzing selected region...');

    try {
      const res = await fetch('http://127.0.0.1:8765/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'selection',
          context: { selectedText, url: location.href },
          url: location.href,
          title: document.title
        })
      });
      const data = await res.json();
      if (data.insights) {
        this.setHUDResponse(data.insights.map(i => `**${i.title}**\n${i.description}`).join('\n\n'));
      }
    } catch (e) {
      this.setHUDResponse(`Error: ${e.message}`);
    }
  },

  /* ═══════════════════════════════════════
     HUD QUERY HANDLER
     ═══════════════════════════════════════ */

  async handleHUDQuery(query) {
    if (!query) return;
    const input = document.getElementById('sentinel-hud-input');
    input.value = '';

    this.setHUDResponse(`🧑‍💻 **You:** ${query}\n\n🤖 **Scout:** Thinking...`);
    this.spinOrb();

    try {
      const pageContext = {
        url: location.href,
        title: document.title,
        body: document.body.innerText.slice(0, 3000),
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText).slice(0, 8)
      };

      const res = await fetch('http://127.0.0.1:8765/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are Scout Sentinel, a web browsing assistant. Current page: ${pageContext.title} (${pageContext.url}). Headings: ${pageContext.headings.join(' | ')}` },
            { role: 'user', content: `User question: ${query}\n\nPage content excerpt:\n${pageContext.body}` }
          ]
        })
      });

      const data = await res.json();
      const response = data.response || data.choices?.[0]?.message?.content || 'No response.';
      this.setHUDResponse(`🧑‍💻 **You:** ${query}\n\n🤖 **Scout:**\n${response}`);
      this.stopOrb();
    } catch (e) {
      this.setHUDResponse(`🧑‍💻 **You:** ${query}\n\n⚠️ **Error:** ${e.message}\n\nMake sure Scout server is running: node bridge/server.js`);
      this.stopOrb();
    }
  },

  setHUDResponse(html) {
    const el = document.getElementById('sentinel-hud-response');
    if (el) {
      el.innerHTML = html.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong style="color:#5eead4">$1</strong>');
      el.scrollTop = el.scrollHeight;
    }
  },

  /* ═══════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════ */

  showToast(text, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `sentinel-toast sentinel-toast-${type}`;
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.ScoutSentinel.init());
} else {
  window.ScoutSentinel.init();
}
