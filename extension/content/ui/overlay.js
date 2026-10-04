// Scout Overlay UI System
// Injects inline badges, tooltips, and the Pro Panel into pages

window.ScoutOverlay = {
  container: null,
  panel: null,
  toast: null,

  init() {
    if (this.container) return;

    // Main container (fixed, top-right)
    this.container = document.createElement('div');
    this.container.id = 'scout-overlay-root';
    document.body.appendChild(this.container);

    // Toast notification area
    this.toast = document.createElement('div');
    this.toast.id = 'scout-toast';
    this.container.appendChild(this.toast);

    // Pro Panel (collapsible sidebar)
    this.panel = document.createElement('div');
    this.panel.id = 'scout-pro-panel';
    this.panel.innerHTML = `
      <div class="scout-panel-header">
        <span class="scout-logo">🧭</span>
        <span class="scout-title">Scout</span>
        <button id="scout-toggle" title="Toggle Panel">−</button>
      </div>
      <div id="scout-insights-list">
        <div class="scout-placeholder">Surf to see Scout analysis...</div>
      </div>
      <div class="scout-footer">
        <span id="scout-status">● Local</span>
        <button id="scout-refresh">🔄</button>
      </div>
    `;
    this.container.appendChild(this.panel);

    // Event listeners
    this.panel.querySelector('#scout-toggle').addEventListener('click', () => this.togglePanel());
    this.panel.querySelector('#scout-refresh').addEventListener('click', () => {
      this.showToast('Re-analyzing...', 'info');
      window.dispatchEvent(new CustomEvent('scout:refresh'));
    });

    // Draggable header
    this.makeDraggable(this.panel.querySelector('.scout-panel-header'));
  },

  makeDraggable(handle) {
    let isDragging = false, startX, startY, startLeft, startTop;
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      handle.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.panel.style.left = `${startLeft + dx}px`;
      this.panel.style.top = `${startTop + dy}px`;
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      handle.style.cursor = 'grab';
    });
  },

  togglePanel() {
    const list = this.panel.querySelector('#scout-insights-list');
    const btn = this.panel.querySelector('#scout-toggle');
    if (list.style.display === 'none') {
      list.style.display = 'block';
      this.panel.querySelector('.scout-footer').style.display = 'flex';
      btn.textContent = '−';
    } else {
      list.style.display = 'none';
      this.panel.querySelector('.scout-footer').style.display = 'none';
      btn.textContent = '+';
    }
  },

  showBadge(text, type = 'info') {
    if (!this.container) this.init();
    const badge = document.createElement('div');
    badge.className = `scout-badge scout-badge-${type}`;
    badge.textContent = text;
    this.container.appendChild(badge);
    setTimeout(() => badge.remove(), 5000);
  },

  showToast(text, type = 'info') {
    if (!this.toast) this.init();
    const el = document.createElement('div');
    el.className = `scout-toast-msg scout-toast-${type}`;
    el.textContent = text;
    this.toast.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  },

  renderInsights(insights, siteType) {
    if (!this.panel) this.init();
    const list = this.panel.querySelector('#scout-insights-list');
    list.innerHTML = '';

    // Category header
    const typeLabels = {
      job: '💼 Job Analysis',
      social: '💬 Social Decode',
      shopping: '🛒 Deal Audit',
      news: '📰 Media Decoder',
      code: '💻 Code Scan',
      general: '🧭 Scout'
    };

    const header = document.createElement('div');
    header.className = 'scout-category-header';
    header.textContent = typeLabels[siteType] || typeLabels.general;
    list.appendChild(header);

    if (insights.length === 0) {
      list.innerHTML += '<div class="scout-placeholder">No insights detected. Page looks clean. ✨</div>';
      return;
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    const sorted = [...insights].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    for (const item of sorted) {
      const card = document.createElement('div');
      card.className = `scout-card scout-sev-${item.severity}`;
      card.innerHTML = `
        <div class="scout-card-header">
          <span class="scout-sev-dot scout-dot-${item.severity}"></span>
          <strong>${this.escapeHtml(item.title)}</strong>
          <span class="scout-source">${item.source === 'ai' ? '🤖 AI' : '⚡ Inst'}</span>
        </div>
        <div class="scout-card-body">${this.escapeHtml(item.description)}</div>
      `;
      list.appendChild(card);
    }

    // Update status
    const status = this.panel.querySelector('#scout-status');
    const highCount = sorted.filter(i => i.severity === 'high').length;
    if (highCount > 0) {
      status.textContent = `● ${highCount} Alert${highCount > 1 ? 's' : ''}`;
      status.className = 'scout-status-alert';
    } else {
      status.textContent = '● Local';
      status.className = '';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// Auto-init when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.ScoutOverlay.init());
} else {
  window.ScoutOverlay.init();
}
