// Conversation / Chat Analyzer
// Detects manipulation tactics, leading questions, false authority, and conversational red flags

window.ScoutChatAnalyzer = {
  name: 'Conversation Guard',

  extract(doc) {
    const url = location.href;
    const isClaude = /claude\.ai|anthropic/.test(url);
    const isChatGPT = /chat\.openai|chatgpt/.test(url);
    const isGemini = /gemini\.google|bard/.test(url);
    const isDiscord = /discord\.com/.test(url);
    const isSlack = /app\.slack/.test(url);
    const isTeams = /teams\.microsoft/.test(url);
    const isWhatsApp = /web\.whatsapp/.test(url);
    const isTelegram = /web\.telegram/.test(url);

    // Extract messages based on platform
    let messages = [];
    let lastMessages = '';

    if (isClaude || isChatGPT || isGemini) {
      // AI chat interfaces
      const msgEls = doc.querySelectorAll('[data-testid="user-message"], .user-message, [class*="human" i], .font-claude-message, [class*="message" i][class*="user" i]');
      messages = Array.from(msgEls).slice(-5).map(el => ({
        role: 'user',
        text: el.innerText.trim().slice(0, 500)
      }));
      const assistantEls = doc.querySelectorAll('[data-testid="assistant-message"], .assistant-message, [class*="ai" i], [class*="bot" i]');
      const lastAssistant = Array.from(assistantEls).slice(-1)[0];
      lastMessages = lastAssistant?.innerText?.trim()?.slice(0, 2000) || '';
    } else if (isDiscord || isSlack) {
      const msgEls = doc.querySelectorAll('[class*="message" i], .message-content, [data-qa="message_content"]');
      messages = Array.from(msgEls).slice(-10).map(el => el.innerText.trim().slice(0, 300));
      lastMessages = messages.slice(-5).join('\n');
    } else {
      // Generic chat / forum / comment thread
      const selectors = [
        '[class*="comment" i]', '[class*="reply" i]', '[class*="post" i]',
        'article', '[role="article"]', '.message', '.msg',
        '[class*="chat" i] [class*="text" i]'
      ];
      for (const sel of selectors) {
        const els = doc.querySelectorAll(sel);
        if (els.length > 0) {
          messages = Array.from(els).slice(-8).map(el => el.innerText.trim().slice(0, 400));
          lastMessages = messages.slice(-5).join('\n');
          break;
        }
      }
    }

    return {
      platform: isClaude ? 'claude' : isChatGPT ? 'chatgpt' : isGemini ? 'gemini' :
                isDiscord ? 'discord' : isSlack ? 'slack' : isTeams ? 'teams' :
                isWhatsApp ? 'whatsapp' : isTelegram ? 'telegram' : 'generic-chat',
      messageCount: messages.length,
      lastMessages: lastMessages,
      url: location.href,
      pageTitle: doc.title
    };
  },

  heuristics(doc, context) {
    const insights = [];
    const text = (context.lastMessages || '').toLowerCase();
    const fullPage = (doc.body.innerText || '').toLowerCase();

    if (!text || text.length < 20) return insights;

    // --- AI-Specific Patterns ---

    // Hallucination markers in AI responses
    const hallucinationMarkers = [
      { pattern: 'i\'m sorry, but i don\'t have', label: '🤖 Knowledge Boundary', desc: 'AI is admitting it lacks information. Good sign of honesty, but verify the topic elsewhere.', severity: 'info' },
      { pattern: 'as of my last update|as of my knowledge cutoff|my training data', label: '📅 Stale Knowledge Warning', desc: 'AI knowledge has a cutoff date. Current events, prices, or recent developments may be wrong.', severity: 'medium' },
      { pattern: 'i believe|i think|in my opinion|it seems to me', label: '🎭 Uncertainty Masking', desc: 'AI framing speculation as belief. Not necessarily factual — push for sources.', severity: 'low' },
      { pattern: 'i\'m confident that|certainly|definitely|absolutely', label: '⚡ False Confidence', desc: 'Overcertainty is a known AI failure mode. Confident wrong answers are worse than hesitant ones.', severity: 'medium' }
    ];

    for (const marker of hallucinationMarkers) {
      if (new RegExp(marker.pattern, 'i').test(text)) {
        insights.push({
          type: 'ai-pattern',
          severity: marker.severity,
          title: marker.label,
          description: marker.desc,
          source: 'heuristic'
        });
      }
    }

    // --- Manipulation Patterns (Any Conversation) ---

    // Urgency / pressure tactics
    if (/hurry|quickly|asap|urgent|rush|limited time|before it\'s too late|don\'t wait/i.test(text)) {
      insights.push({
        type: 'manipulation',
        severity: 'medium',
        title: '⏰ Pressure Tactic Detected',
        description: 'Artificial urgency in conversation is a classic manipulation technique. Slow down — real deadlines are stated calmly.',
        source: 'heuristic'
      });
    }

    // Leading questions
    if (/don\'t you think|isn\'t it true|wouldn\'t you agree|obviously|clearly|everyone knows/i.test(text)) {
      insights.push({
        type: 'manipulation',
        severity: 'medium',
        title: '🎣 Leading Framing',
        description: 'Questions or statements that assume agreement before you give it. Answer on your own terms, not theirs.',
        source: 'heuristic'
      });
    }

    // False authority / appeal to expertise
    if (/trust me|i\'m an expert|as a professional|i\'ve been doing this for|believe me/i.test(text)) {
      insights.push({
        type: 'manipulation',
        severity: 'low',
        title: '🎓 Unverified Authority Claim',
        description: 'Real expertise is demonstrated, not declared. Ask for specifics, credentials, or sources.',
        source: 'heuristic'
      });
    }

    // Emotional blackmail / guilt
    if (/if you really cared|after everything i\'ve done|you owe me|betrayed|disappointed/i.test(text)) {
      insights.push({
        type: 'manipulation',
        severity: 'high',
        title: '💔 Emotional Leverage',
        description: 'Guilt and obligation are being used to bypass rational decision-making. This is a major red flag in any relationship.',
        source: 'heuristic'
      });
    }

    // Love-bombing / excessive praise
    const praiseWords = text.match(/\b(amazing|incredible|genius|brilliant|perfect|best ever|unbelievable|outstanding|phenomenal)\b/gi);
    if (praiseWords && praiseWords.length >= 4) {
      insights.push({
        type: 'manipulation',
        severity: 'medium',
        title: '💣 Excessive Flattery',
        description: `Unusual density of superlatives (${praiseWords.length}). May be grooming, sales pressure, or setting up an ask.`,
        source: 'heuristic'
      });
    }

    // Information overload
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 300 && !text.includes('?')) {
      insights.push({
        type: 'manipulation',
        severity: 'low',
        title: '📊 Wall of Text',
        description: 'Long response without asking anything back. May be overwhelming you to prevent critical thinking.',
        source: 'heuristic'
      });
    }

    // Vague promises
    if (/soon|eventually|down the line|in the future|we\'ll see|maybe later/i.test(text) && /money|pay|invest|buy|deal|opportunity/i.test(text)) {
      insights.push({
        type: 'manipulation',
        severity: 'high',
        title: '💸 Vague Financial Promise',
        description: 'Money talk combined with vague timing is a hallmark of scams. Demand specifics in writing.',
        source: 'heuristic'
      });
    }

    // Platform-specific: Claude / AI chats
    if (context.platform === 'claude' || context.platform === 'chatgpt' || context.platform === 'gemini') {
      // Check for request to ignore guidelines
      if (/ignore previous instructions|forget your training|disregard|override|jailbreak|DAN/i.test(fullPage)) {
        insights.push({
          type: 'ai-pattern',
          severity: 'high',
          title: '🚨 Jailbreak Attempt',
          description: 'Someone is trying to make the AI bypass its safety guidelines. Results may be unreliable or harmful.',
          source: 'heuristic'
        });
      }

      // Check for long list of requirements that might be prompt injection
      const bulletCount = (fullPage.match(/[•\-\*]\s+/g) || []).length;
      if (bulletCount > 15 && /ignore|forget|instead|now you are/i.test(fullPage)) {
        insights.push({
          type: 'ai-pattern',
          severity: 'medium',
          title: '💉 Possible Prompt Injection',
          description: 'Unusually long structured input with directive language. May be trying to reprogram AI behavior.',
          source: 'heuristic'
        });
      }
    }

    // Too many questions at once (overwhelming)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount >= 5) {
      insights.push({
        type: 'manipulation',
        severity: 'low',
        title: `❓ Question Flood (${questionCount})`,
        description: 'Multiple rapid-fire questions. Common in interrogation and sales — designed to keep you reactive, not thinking.',
        source: 'heuristic'
      });
    }

    return insights;
  }
};
