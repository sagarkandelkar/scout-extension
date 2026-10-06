// Hover Explainer — Surfing Copilot
// Press Alt+H over any element to get an instant explanation
// Like "Explain This" in GitHub Copilot but for any web element

window.ScoutExplainer = {
  tooltip: null,
  highlightBox: null,
  enabled: true,

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.explainHoveredElement();
      }
    });
    console.log('[Scout Explainer] Alt+H to explain any element');
  },

  async explainHoveredElement() {
    const el = document.querySelector(':hover');
    if (!el) return;

    const explanation = await this.generateExplanation(el);
    this.showTooltip(el, explanation);
  },

  async generateExplanation(el) {
    const tag = el.tagName.toLowerCase();
    const classNames = Array.from(el.classList).slice(0, 3).join(', ');
    const text = el.innerText?.trim()?.slice(0, 200) || '';
    const href = el.href || '';
    const src = el.src || '';

    // Instant heuristics (no AI needed)
    const explanations = [];

    // Element type analysis
    if (tag === 'button') {
      const btnText = el.innerText?.toLowerCase() || '';
      if (/submit|buy|pay|order/i.test(btnText)) explanations.push('⚠️ Primary action button — clicking may commit a purchase or submission');
      if (/cancel|close|dismiss/i.test(btnText)) explanations.push('🚪 Dismissal button — closes dialog without saving');
      if (/subscribe|join|sign up/i.test(btnText)) explanations.push('🪤 Subscription trigger — check for auto-renewal terms');
    }

    if (tag === 'a') {
      if (href.startsWith('http')) {
        const domain = new URL(href).hostname;
        explanations.push(`🔗 External link to ${domain}`);
        if (/track|affiliate|ref=|utm_/.test(href)) explanations.push('📊 Contains tracking parameters — your click is being measured');
      }
      if (href.startsWith('javascript:') || href === '#') explanations.push('⚡ JavaScript action — may not navigate to a real page');
    }

    if (tag === 'input') {
      const type = el.type || 'text';
      if (type === 'password') explanations.push('🔒 Password field — ensure site uses HTTPS (check for 🔒 in address bar)');
      if (type === 'email') explanations.push('📧 Email field — may be used for marketing or sold to third parties');
      if (type === 'checkbox') {
        const isChecked = el.checked;
        const label = this.findLabelText(el);
        explanations.push(`☑️ Checkbox: "${label}" — ${isChecked ? 'currently ENABLED' : 'currently DISABLED'}`);
        if (/terms|privacy|agree/i.test(label) && !isChecked) explanations.push('⚠️ Required for submission — read before checking');
        if (/newsletter|updates|promo/i.test(label) && isChecked) explanations.push('🪤 Auto-checked marketing opt-in — uncheck if you don\'t want spam');
      }
    }

    if (tag === 'img') {
      if (src.includes('track') || el.width === 1 || el.height === 1) explanations.push('👁️ Tracking pixel — invisible image used to monitor your behavior');
      if (!el.alt) explanations.push('♿ Missing alt text — accessibility issue for screen readers');
    }

    // Content analysis
    if (text.length > 0) {
      if (/\$\d+|\d+\s*%\s*off|save\s*\$|discount/i.test(text)) explanations.push('🏷️ Contains pricing/discount language — verify actual value before deciding');
      if (/limited|expires|ends|countdown|only \d+ left/i.test(text)) explanations.push('⏰ Scarcity/urgency tactic — manufactured pressure to act quickly');
      if (/free|no cost|zero/i.test(text) && /trial|sign up|register/i.test(text)) explanations.push('🎁 "Free" with signup — often auto-converts to paid subscription');
    }

    // CSS-based dark patterns
    const computed = getComputedStyle(el);
    if (computed.opacity === '0' || parseFloat(computed.opacity) < 0.1) explanations.push('👻 Near-invisible element — intentionally hidden from casual view');
    if (computed.position === 'fixed' && computed.zIndex > 1000) explanations.push('🪧 Overlay/modal element — blocks underlying content');

    // Build final explanation
    if (explanations.length === 0) {
      return `<${tag}> ${classNames ? 'class="' + classNames + '"' : ''}\nNo specific red flags detected.`;
    }

    return explanations.join('\n\n');
  },

  findLabelText(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.innerText.trim();
    }
    const parent = el.closest('label');
    if (parent) {
      const clone = parent.cloneNode(true);
      clone.querySelectorAll('input').forEach(i => i.remove());
      return clone.innerText.trim();
    }
    return el.name || el.id || 'unknown';
  },

  showTooltip(targetEl, text) {
    this.hideTooltip();

    const rect = targetEl.getBoundingClientRect();

    // Highlight box
    const box = document.createElement('div');
    box.id = 'scout-explainer-highlight';
    box.style.cssText = `
      position: fixed;
      top: ${rect.top - 2}px;
      left: ${rect.left - 2}px;
      width: ${rect.width + 4}px;
      height: ${rect.height + 4}px;
      border: 2px solid #5eead4;
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483646;
      box-shadow: 0 0 10px rgba(94, 234, 212, 0.3);
    `;
    document.body.appendChild(box);
    this.highlightBox = box;

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'scout-explainer-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      max-width: 340px;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(94, 234, 212, 0.3);
      border-radius: 10px;
      padding: 14px;
      color: #e2e8f0;
      font-size: 12px;
      line-height: 1.5;
      z-index: 2147483647;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    tooltip.textContent = text;

    // Position below element, or above if near bottom
    const tooltipTop = rect.bottom + 10 + window.scrollY;
    const tooltipLeft = Math.min(rect.left + window.scrollX, window.innerWidth - 360);
    tooltip.style.top = `${tooltipTop}px`;
    tooltip.style.left = `${tooltipLeft}px`;

    document.body.appendChild(tooltip);
    this.tooltip = tooltip;

    // Auto-hide after 8 seconds
    setTimeout(() => this.hideTooltip(), 8000);
  },

  hideTooltip() {
    if (this.tooltip) { this.tooltip.remove(); this.tooltip = null; }
    if (this.highlightBox) { this.highlightBox.remove(); this.highlightBox = null; }
  }
};

window.ScoutExplainer.init();
