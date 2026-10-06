// Draft Reply Generator — Surfing Copilot
// Generates context-aware replies for emails, messages, forms, comments
// Like Copilot's "Generate Code" but for web communication

window.ScoutDraftReply = {
  panel: null,
  activeElement: null,

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        this.openDraftPanel();
      }
    });
    console.log('[Scout Draft] Alt+G to generate replies');
  },

  openDraftPanel() {
    const active = document.activeElement;
    if (!this.isTextInput(active)) {
      this.showToast('Focus a text field first, then press Alt+G', 'warning');
      return;
    }
    this.activeElement = active;
    this.renderPanel(active);
  },

  renderPanel(targetEl) {
    this.closePanel();

    const rect = targetEl.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.id = 'scout-draft-panel';
    panel.style.cssText = `
      position: fixed;
      top: ${Math.min(rect.bottom + 8, window.innerHeight - 400)}px;
      left: ${rect.left}px;
      width: 400px;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(94, 234, 212, 0.3);
      border-radius: 12px;
      padding: 16px;
      z-index: 2147483647;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    `;

    const context = this.analyzeContext(targetEl);

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(94,234,212,0.15);padding-bottom:10px;">
        <span style="font-weight:700;color:#5eead4;">📝 Scout Draft</span>
        <button id="scout-draft-close" style="background:transparent;border:none;color:#64748b;cursor:pointer;font-size:16px;">×</button>
      </div>
      <div style="margin-bottom:12px;font-size:11px;color:#64748b;">
        Context: <span style="color:#94a3b8;">${context.type}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
        <button class="scout-draft-btn" data-tone="professional">💼 Professional</button>
        <button class="scout-draft-btn" data-tone="friendly">😊 Friendly</button>
        <button class="scout-draft-btn" data-tone="concise">⚡ Concise</button>
        <button class="scout-draft-btn" data-tone="polite-decline">🙏 Polite Decline</button>
        <button class="scout-draft-btn" data-tone="negotiate">🤝 Negotiate</button>
      </div>
      <div id="scout-draft-output" style="min-height:60px;background:rgba(30,41,59,0.8);border-radius:8px;padding:12px;color:#94a3b8;font-size:12px;line-height:1.5;display:none;"></div>
      <div id="scout-draft-actions" style="display:none;gap:8px;margin-top:10px;">
        <button id="scout-draft-insert" style="flex:1;padding:8px;background:rgba(94,234,212,0.15);border:1px solid #5eead4;border-radius:6px;color:#5eead4;cursor:pointer;font-size:12px;">Insert</button>
        <button id="scout-draft-copy" style="flex:1;padding:8px;background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.3);border-radius:6px;color:#94a3b8;cursor:pointer;font-size:12px;">Copy</button>
      </div>
    `;

    // Style buttons
    panel.querySelectorAll('.scout-draft-btn').forEach(btn => {
      btn.style.cssText = `
        padding: 10px 12px;
        background: rgba(30,41,59,0.6);
        border: 1px solid rgba(94,234,212,0.1);
        border-radius: 8px;
        color: #cbd5e1;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        transition: all 0.15s ease;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(94,234,212,0.08)';
        btn.style.borderColor = 'rgba(94,234,212,0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(30,41,59,0.6)';
        btn.style.borderColor = 'rgba(94,234,212,0.1)';
      });
      btn.addEventListener('click', () => this.generateDraft(context, btn.dataset.tone));
    });

    panel.querySelector('#scout-draft-close').addEventListener('click', () => this.closePanel());
    panel.querySelector('#scout-draft-insert')?.addEventListener('click', () => this.insertDraft());
    panel.querySelector('#scout-draft-copy')?.addEventListener('click', () => this.copyDraft());

    document.body.appendChild(panel);
    this.panel = panel;
  },

  analyzeContext(el) {
    const url = location.href;
    const text = (el.value || el.innerText || '').slice(0, 500);
    const placeholder = (el.placeholder || '').toLowerCase();

    let type = 'generic';
    if (/linkedin|indeed|greenhouse|lever/i.test(url)) type = 'job-message';
    else if (/gmail|outlook|proton|mail/i.test(url)) type = 'email';
    else if (/twitter|x\.com|reddit|facebook|instagram/i.test(url)) type = 'social-reply';
    else if (/slack|discord|teams|telegram|whatsapp/i.test(url)) type = 'chat';
    else if (/support|help|ticket|contact/i.test(url)) type = 'support';
    else if (placeholder.includes('comment') || placeholder.includes('reply')) type = 'comment';

    return { type, text, url };
  },

  generateDraft(context, tone) {
    const output = document.getElementById('scout-draft-output');
    const actions = document.getElementById('scout-draft-actions');
    output.style.display = 'block';
    actions.style.display = 'flex';
    output.textContent = 'Generating...';

    // Heuristic templates (instant, no AI needed for basic drafts)
    const templates = {
      'job-message': {
        'professional': `Dear Hiring Manager,\n\nThank you for considering my application. I am excited about the opportunity to contribute to your team with my skills in [relevant area]. I would welcome the chance to discuss how my background aligns with your needs.\n\nBest regards,\n[Your Name]`,
        'friendly': `Hi there!\n\nI came across this role and it really resonated with what I've been looking for. I'd love to learn more about the team and how I can contribute. Let me know if you'd like to chat!\n\nCheers,\n[Your Name]`,
        'polite-decline': `Dear Hiring Manager,\n\nThank you for the opportunity. After careful consideration, I have decided to pursue another direction that better aligns with my current career goals. I appreciate your time and wish you success in finding the right candidate.\n\nBest regards,\n[Your Name]`,
        'negotiate': `Dear Hiring Manager,\n\nThank you for the offer. I am very enthusiastic about joining the team. Before finalizing, I would like to discuss the compensation package. Based on my research and experience, a range of [X-Y] would be more aligned with market standards. I am open to discussing how we can reach a mutually beneficial agreement.\n\nBest regards,\n[Your Name]`
      },
      'email': {
        'professional': `Subject: [Topic]\n\nDear [Name],\n\nI hope this message finds you well. I am writing regarding [subject]. [Context/details].\n\nPlease let me know if you need any additional information.\n\nBest regards,\n[Your Name]`,
        'friendly': `Hey [Name],\n\nHope you're doing great! Quick note about [subject] — [context]. Let me know what you think when you have a moment.\n\nTalk soon,\n[Your Name]`,
        'concise': `[Subject]: [Brief summary]\n\n[Action needed or information]\n\n— [Your Name]`,
        'polite-decline': `Hi [Name],\n\nThank you for thinking of me. Unfortunately, I won't be able to [commit/action] at this time due to [brief reason]. I appreciate the opportunity and hope we can reconnect in the future.\n\nBest,\n[Your Name]`
      },
      'social-reply': {
        'professional': `Great point! I think [perspective]. Would love to hear more about your experience with this.`,
        'friendly': `Totally agree! 😊 I've had similar thoughts. What do you think about [angle]?`,
        'concise': `Agreed. Key insight: [one-liner].`,
        'polite-decline': `Thanks for sharing! I see it differently — [brief counterpoint]. Appreciate the discussion though!`
      },
      'chat': {
        'professional': `Got it — I'll [action item]. Should have an update for you by [timeframe].`,
        'friendly': `Sounds good! 🙌 I'll take care of [thing] and ping you when it's done.`,
        'concise': `Done / Will do by [time].`,
        'polite-decline': `Thanks for asking! Can't help with this one right now — swamped with [brief reason]. Maybe [alternative]?`
      },
      'support': {
        'professional': `Hi [Name],\n\nThank you for reaching out. I understand you're experiencing [issue]. To help resolve this, could you please provide [specific info]?\n\nI'll follow up as soon as I have an update.\n\nBest,\nSupport`,
        'friendly': `Hey! Sorry to hear about [issue]. Let's get this sorted out for you. Can you share [info]? I'll jump on it right away! 🛠️`,
        'concise': `Received. Need: [info]. Will update shortly.`
      },
      'generic': {
        'professional': `Thank you for your message. I have reviewed your input and [response]. Please let me know if you require any further clarification.\n\nBest regards,`,
        'friendly': `Hey! Thanks for the note. Here's what I'm thinking: [response]. Let me know if that works! 😊`,
        'concise': `Noted. [Brief response].`,
        'polite-decline': `Appreciate you reaching out! Unfortunately, I can't [action] at this time. Hope you find what you're looking for!`
      }
    };

    const typeTemplates = templates[context.type] || templates['generic'];
    const draft = typeTemplates[tone] || typeTemplates['professional'];

    // Simulate AI delay for UX
    setTimeout(() => {
      output.textContent = draft;
      output.style.color = '#e2e8f0';
    }, 400);
  },

  insertDraft() {
    if (!this.activeElement || !this.panel) return;
    const draft = document.getElementById('scout-draft-output')?.textContent;
    if (!draft || draft === 'Generating...') return;

    const el = this.activeElement;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const val = el.value || '';
      el.value = val.slice(0, start) + draft + val.slice(end);
      el.selectionStart = el.selectionEnd = start + draft.length;
    } else if (el.contentEditable === 'true') {
      document.execCommand('insertText', false, draft);
    }
    this.closePanel();
    this.showToast('Draft inserted!', 'ok');
  },

  copyDraft() {
    const draft = document.getElementById('scout-draft-output')?.textContent;
    if (draft && draft !== 'Generating...') {
      navigator.clipboard.writeText(draft).then(() => {
        this.showToast('Copied to clipboard!', 'ok');
      });
    }
  },

  closePanel() {
    if (this.panel) { this.panel.remove(); this.panel = null; }
  },

  isTextInput(el) {
    return el && (
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'INPUT' && /text|email|search|url/.test(el.type) ||
      el.contentEditable === 'true'
    );
  },

  showToast(text, type) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 16px;
      border-radius: 8px;
      color: white;
      font-size: 12px;
      z-index: 2147483647;
      background: ${type === 'ok' ? '#10b981' : '#f59e0b'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

window.ScoutDraftReply.init();
