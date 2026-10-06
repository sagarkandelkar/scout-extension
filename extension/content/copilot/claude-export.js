// Claude Export Bridge
// Formats Scout findings into a structured report for pasting into Claude chat
// Shortcut: Alt+C or click "Export for Claude" in the Pro Panel

window.ScoutClaudeExport = {
  init() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.export();
      }
    });

    // Add button to Pro Panel footer when it loads
    this.injectButton();
    console.log('[Scout Claude Export] Alt+C to export findings for Claude review');
  },

  injectButton() {
    const observer = new MutationObserver(() => {
      const footer = document.getElementById('scout-insights-list')?.closest('#scout-pro-panel')?.querySelector('.scout-footer');
      if (footer && !footer.querySelector('#scout-claude-export')) {
        const btn = document.createElement('button');
        btn.id = 'scout-claude-export';
        btn.textContent = '🤖 Claude';
        btn.title = 'Export findings for Claude review (Alt+C)';
        btn.style.cssText = `
          background: transparent;
          border: 1px solid rgba(94,234,212,0.3);
          color: #5eead4;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
          margin-left: auto;
        `;
        btn.addEventListener('click', () => this.export());
        footer.appendChild(btn);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  collectData() {
    const data = {
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      siteType: this.detectSiteType(),
      instantInsights: this.collectInsights(),
      pageStats: {
        wordCount: document.body.innerText.split(/\s+/).length,
        linkCount: document.querySelectorAll('a').length,
        imageCount: document.querySelectorAll('img').length,
        formCount: document.querySelectorAll('form').length,
        hasPaywall: !!document.querySelector('[class*="paywall" i], [class*="subscribe" i]'),
      }
    };
    return data;
  },

  detectSiteType() {
    const url = location.href.toLowerCase();
    if (/linkedin\.com\/jobs|indeed|glassdoor|greenhouse|lever|jobs\./.test(url)) return 'job-portal';
    if (/twitter|x\.com|reddit|facebook|instagram|tiktok|youtube/.test(url)) return 'social-media';
    if (/amazon|ebay|aliexpress|shopify|etsy|bestbuy/.test(url)) return 'shopping';
    if (/news|bbc|cnn|reuters|medium|substack|techcrunch|guardian|nytimes/.test(url)) return 'news';
    if (/claude\.ai|chat\.openai|chatgpt|gemini\.google/.test(url)) return 'ai-chat';
    if (/discord|slack|teams|whatsapp|telegram/.test(url)) return 'messaging';
    if (/github|stackoverflow|gitlab|npmjs/.test(url)) return 'developer';
    return 'general';
  },

  collectInsights() {
    // Try to read from the Pro Panel if it has rendered insights
    const cards = document.querySelectorAll('.scout-card');
    if (cards.length > 0) {
      return Array.from(cards).map(card => {
        const title = card.querySelector('strong')?.innerText?.trim() || '';
        const desc = card.querySelector('.scout-card-body')?.innerText?.trim() || '';
        const sev = card.className.match(/scout-sev-(\w+)/)?.[1] || 'info';
        const source = card.querySelector('.scout-source')?.innerText?.trim() || '';
        return { title, description: desc, severity: sev, source };
      });
    }
    return [];
  },

  formatReport(data) {
    const lines = [
      `# Scout Analysis Report`,
      ``,
      `**URL:** ${data.url}`,
      `**Page Title:** ${data.title}`,
      `**Detected Type:** ${data.siteType}`,
      `**Timestamp:** ${data.timestamp}`,
      ``,
      `---`,
      ``,
      `## 📊 Page Stats`,
      `- Words: ${data.pageStats.wordCount.toLocaleString()}`,
      `- Links: ${data.pageStats.linkCount}`,
      `- Images: ${data.pageStats.imageCount}`,
      `- Forms: ${data.pageStats.formCount}`,
      `- Paywall detected: ${data.pageStats.hasPaywall ? 'Yes ⚠️' : 'No'}`,
      ``,
      `---`,
      ``,
    ];

    if (data.instantInsights.length > 0) {
      lines.push(`## 🚨 Scout Findings (${data.instantInsights.length})`, ``);

      const bySeverity = { high: [], medium: [], low: [], info: [] };
      data.instantInsights.forEach(i => {
        const sev = i.severity || 'info';
        if (bySeverity[sev]) bySeverity[sev].push(i);
      });

      for (const sev of ['high', 'medium', 'low', 'info']) {
        const items = bySeverity[sev];
        if (items.length > 0) {
          lines.push(`### ${sev.toUpperCase()} (${items.length})`);
          items.forEach(item => {
            lines.push(`- **${item.title}**`);
            lines.push(`  ${item.description}`);
            lines.push(`  *[source: ${item.source}]*`);
            lines.push(``);
          });
        }
      }
    } else {
      lines.push(`## 🚨 Scout Findings`, ``);
      lines.push(`No instant insights detected on this page. The AI analysis may still be running or the page type isn't recognized yet.`, ``);
    }

    lines.push(`---`, ``);
    lines.push(`## 💬 Claude Review Request`, ``);
    lines.push(`Pasted by user from Scout browser extension. Please review the findings above and suggest:`, ``);
    lines.push(`1. Any additional red flags or patterns Scout may have missed`);
    lines.push(`2. Recommended next actions for the user`);
    lines.push(`3. Potential enhancements to Scout's detection rules for this page type`);
    lines.push(``);

    return lines.join('\n');
  },

  async export() {
    const data = this.collectData();
    const report = this.formatReport(data);

    try {
      await navigator.clipboard.writeText(report);
      this.showToast('📋 Report copied! Paste into Claude chat.', 'ok');
    } catch (e) {
      // Fallback for restricted environments
      const textarea = document.createElement('textarea');
      textarea.value = report;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('📋 Report copied! Paste into Claude chat.', 'ok');
    }

    // Also log to console for debugging
    console.log('[Scout Claude Export] Report copied to clipboard:\n' + report);
  },

  showToast(text, type) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      z-index: 2147483647;
      background: ${type === 'ok' ? '#10b981' : '#f59e0b'};
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.ScoutClaudeExport.init());
} else {
  window.ScoutClaudeExport.init();
}
