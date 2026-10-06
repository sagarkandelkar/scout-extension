// Bulk Actions — Surfing Copilot
// Select multiple elements and act on them at once
// Like multi-cursor editing in VS Code but for the web

window.ScoutBulkActions = {
  enabled: false,
  selected: new Set(),
  toolbar: null,
  mode: 'links', // 'links', 'images', 'checkboxes', 'buttons'

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.toggleMode();
      }
      if (e.key === 'Escape' && this.enabled) {
        this.disable();
      }
    });
    console.log('[Scout Bulk] Alt+B for bulk selection mode');
  },

  toggleMode() {
    if (this.enabled) this.disable();
    else this.enable();
  },

  enable() {
    this.enabled = true;
    this.selected.clear();
    this.showToast('🎯 Bulk Mode ON — Click elements to select. Alt+B again to finish. Esc to cancel.', 'info');
    this.showToolbar();
    document.addEventListener('click', this.clickHandler, true);
  },

  disable() {
    this.enabled = false;
    document.removeEventListener('click', this.clickHandler, true);
    this.selected.forEach(el => this.unhighlight(el));
    this.selected.clear();
    this.hideToolbar();
    this.showToast('Bulk Mode OFF', 'ok');
  },

  clickHandler: function(e) {
    // Use arrow function via bound method in actual implementation
  },

  getSelectableElements() {
    const selectors = {
      'links': 'a[href]',
      'images': 'img',
      'checkboxes': 'input[type="checkbox"]',
      'buttons': 'button, input[type="submit"]'
    };
    return Array.from(document.querySelectorAll(selectors[this.mode] || 'a[href]'));
  },

  handleClick(e) {
    if (!this.enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target.closest(this.getSelectableElements()[0]?.tagName?.toLowerCase() === 'a' ? 'a[href]' :
      this.mode === 'images' ? 'img' :
      this.mode === 'checkboxes' ? 'input[type="checkbox"]' :
      'button, input[type="submit"]') || e.target;

    if (!target) return;

    if (this.selected.has(target)) {
      this.selected.delete(target);
      this.unhighlight(target);
    } else {
      this.selected.add(target);
      this.highlight(target);
    }

    this.updateToolbar();
  },

  highlight(el) {
    el.style.outline = '3px solid #5eead4';
    el.style.outlineOffset = '2px';
    el.dataset.scoutBulkSelected = 'true';
  },

  unhighlight(el) {
    el.style.outline = '';
    el.style.outlineOffset = '';
    delete el.dataset.scoutBulkSelected;
  },

  showToolbar() {
    this.hideToolbar();
    const bar = document.createElement('div');
    bar.id = 'scout-bulk-toolbar';
    bar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(94, 234, 212, 0.3);
      border-radius: 12px;
      padding: 12px 20px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    `;

    bar.innerHTML = `
      <span style="color:#5eead4;font-weight:700;">🎯 Bulk Mode</span>
      <select id="scout-bulk-type" style="background:rgba(30,41,59,0.8);border:1px solid rgba(94,234,212,0.2);color:#e2e8f0;border-radius:6px;padding:4px 8px;font-size:12px;">
        <option value="links">Links</option>
        <option value="images">Images</option>
        <option value="checkboxes">Checkboxes</option>
        <option value="buttons">Buttons</option>
      </select>
      <span id="scout-bulk-count" style="color:#64748b;font-size:12px;">0 selected</span>
      <div style="width:1px;height:20px;background:rgba(148,163,184,0.2);"></div>
      <button id="scout-bulk-action-open" style="padding:6px 12px;background:rgba(94,234,212,0.1);border:1px solid rgba(94,234,212,0.3);border-radius:6px;color:#5eead4;cursor:pointer;font-size:12px;">Open All</button>
      <button id="scout-bulk-action-copy" style="padding:6px 12px;background:rgba(94,234,212,0.1);border:1px solid rgba(94,234,212,0.3);border-radius:6px;color:#5eead4;cursor:pointer;font-size:12px;">Copy URLs</button>
      <button id="scout-bulk-action-check" style="padding:6px 12px;background:rgba(94,234,212,0.1);border:1px solid rgba(94,234,212,0.3);border-radius:6px;color:#5eead4;cursor:pointer;font-size:12px;display:none;">Check All</button>
      <button id="scout-bulk-done" style="padding:6px 12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;color:#f43f5e;cursor:pointer;font-size:12px;">Done (Alt+B)</button>
    `;

    bar.querySelector('#scout-bulk-type').addEventListener('change', (e) => {
      this.mode = e.target.value;
      this.selected.forEach(el => this.unhighlight(el));
      this.selected.clear();
      this.updateToolbar();
    });

    bar.querySelector('#scout-bulk-action-open').addEventListener('click', () => this.openAll());
    bar.querySelector('#scout-bulk-action-copy').addEventListener('click', () => this.copyAll());
    bar.querySelector('#scout-bulk-action-check').addEventListener('click', () => this.checkAll());
    bar.querySelector('#scout-bulk-done').addEventListener('click', () => this.disable());

    document.body.appendChild(bar);
    this.toolbar = bar;
    this.updateToolbar();
  },

  hideToolbar() {
    if (this.toolbar) { this.toolbar.remove(); this.toolbar = null; }
  },

  updateToolbar() {
    if (!this.toolbar) return;
    const count = this.selected.size;
    this.toolbar.querySelector('#scout-bulk-count').textContent = `${count} selected`;

    const isCheckboxes = this.mode === 'checkboxes';
    this.toolbar.querySelector('#scout-bulk-action-check').style.display = isCheckboxes ? 'block' : 'none';
    this.toolbar.querySelector('#scout-bulk-action-open').style.display = isCheckboxes ? 'none' : 'block';
  },

  openAll() {
    if (this.selected.size === 0) {
      this.showToast('Select items first!', 'warning');
      return;
    }
    let opened = 0;
    this.selected.forEach(el => {
      if (el.href) {
        window.open(el.href, '_blank');
        opened++;
      }
    });
    this.showToast(`Opened ${opened} links in new tabs`, 'ok');
  },

  copyAll() {
    if (this.selected.size === 0) {
      this.showToast('Select items first!', 'warning');
      return;
    }
    const urls = Array.from(this.selected).map(el => el.href || el.src || '').filter(Boolean).join('\n');
    navigator.clipboard.writeText(urls).then(() => {
      this.showToast(`Copied ${this.selected.size} URLs to clipboard`, 'ok');
    });
  },

  checkAll() {
    if (this.selected.size === 0) {
      this.showToast('Select checkboxes first!', 'warning');
      return;
    }
    this.selected.forEach(el => {
      if (el.type === 'checkbox') el.checked = true;
    });
    this.showToast(`Checked ${this.selected.size} boxes`, 'ok');
  },

  showToast(text, type) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      z-index: 2147483647;
      background: ${type === 'ok' ? '#10b981' : '#f59e0b'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

// Bind click handler
window.ScoutBulkActions.clickHandler = function(e) {
  window.ScoutBulkActions.handleClick(e);
};

window.ScoutBulkActions.init();
