// Scout Content Script — Site Detection + Sentinel Integration
// Orchestrates analyzers and feeds findings to the Sentinel spatial UI

(function () {
  'use strict';

  if (window.__SCOUT_SENTINEL_ACTIVE__) return;
  window.__SCOUT_SENTINEL_ACTIVE__ = true;

  const SiteDetectors = {
    job: {
      patterns: [/linkedin\.com\/jobs/, /indeed\.com/, /glassdoor\.com/, /greenhouse\.io/, /lever\.co/, /jobs\./, /careers/, /boards\.greenhouse/, /jobs\.lever/, /wellfound\.com/],
      keywords: ['apply now', 'job description', 'requirements', 'qualifications', 'benefits', 'salary', 'hiring'],
      analyzer: window.ScoutJobAnalyzer
    },
    social: {
      patterns: [/twitter\.com/, /x\.com/, /reddit\.com/, /facebook\.com/, /instagram\.com/, /tiktok\.com/, /youtube\.com/, /linkedin\.com\/feed/],
      keywords: ['like', 'follow', 'subscribe', 'share', 'trending', 'thread', 'viral'],
      analyzer: window.ScoutSocialAnalyzer
    },
    shopping: {
      patterns: [/amazon\./, /ebay\./, /aliexpress\./, /shopify\./, /etsy\./, /bestbuy\./, /newegg\./, /product/, /item\//],
      keywords: ['add to cart', 'buy now', 'price', 'review', 'rating', 'discount', 'deal'],
      analyzer: window.ScoutShoppingAnalyzer
    },
    news: {
      patterns: [/news\./, /bbc\./, /cnn\./, /reuters\./, /medium\./, /substack\./, /techcrunch/, /theguardian/, /nytimes/, /washingtonpost/],
      keywords: ['breaking', 'exclusive', 'sources say', 'reportedly', 'allegedly'],
      analyzer: window.ScoutNewsAnalyzer
    },
    chat: {
      patterns: [/claude\.ai/, /chat\.openai/, /chatgpt/, /gemini\.google/, /discord\.com/, /app\.slack/, /teams\.microsoft/, /web\.whatsapp/, /web\.telegram/],
      keywords: ['message', 'chat', 'send', 'reply', 'conversation', 'thread'],
      analyzer: window.ScoutChatAnalyzer
    }
  };

  function detectSite() {
    const url = location.href.toLowerCase();
    const text = document.body?.innerText?.toLowerCase()?.slice(0, 5000) || '';
    let bestMatch = null;
    let bestScore = 0;

    for (const [type, config] of Object.entries(SiteDetectors)) {
      let score = 0;
      for (const p of config.patterns) {
        if (p.test(url)) score += 3;
      }
      for (const kw of config.keywords) {
        if (text.includes(kw)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type;
      }
    }
    return { type: bestMatch, score: bestScore };
  }

  async function runAnalysis() {
    const detected = detectSite();
    console.log('[Scout] Detected:', detected.type || 'none');

    if (!detected.type) {
      window.ScoutSentinel?.updateOrbState('info', 'No specific patterns detected');
      return;
    }

    const config = SiteDetectors[detected.type];
    if (!config.analyzer) return;

    const context = config.analyzer.extract(document);
    if (!context) return;

    // Run instant heuristics
    const instantInsights = config.analyzer.heuristics(document, context);

    // Send to AI for enrichment
    try {
      window.ScoutSentinel?.spinOrb();
      const res = await fetch('http://127.0.0.1:8765/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: detected.type,
          context: context,
          url: location.href,
          title: document.title
        })
      });
      window.ScoutSentinel?.stopOrb();

      if (!res.ok) throw new Error('Server error');
      const data = await res.json();

      // Merge instant + AI insights
      const allInsights = [
        ...instantInsights.map(i => ({ ...i, source: i.source || 'heuristic' })),
        ...(data.insights || []).map(i => ({ ...i, source: i.source || 'ai' }))
      ];

      // Feed to Sentinel
      window.ScoutSentinel?.renderFindings(allInsights, detected.type);

    } catch (e) {
      console.warn('[Scout] AI offline, showing heuristics only:', e.message);
      window.ScoutSentinel?.stopOrb();
      window.ScoutSentinel?.renderFindings(instantInsights, detected.type);
    }
  }

  // Listen for trigger messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TRIGGER_FULL_ANALYSIS') {
      runAnalysis();
    }
  });

  // Run after page settles
  if (document.readyState === 'complete') {
    setTimeout(runAnalysis, 1200);
  } else {
    window.addEventListener('load', () => setTimeout(runAnalysis, 1200));
  }

  // Re-run on SPA navigation
  const origPush = history.pushState;
  history.pushState = function (...args) {
    origPush.apply(this, args);
    setTimeout(runAnalysis, 2000);
  };
  window.addEventListener('popstate', () => setTimeout(runAnalysis, 2000));

})();
