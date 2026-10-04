// Main Content Script — Site Detection & Orchestration
// Runs on every page after idle

(function () {
  'use strict';

  // Prevent double-injection
  if (window.__SCOUT_INITIALIZED__) return;
  window.__SCOUT_INITIALIZED__ = true;

  const SiteDetectors = {
    job: {
      patterns: [
        /linkedin\.com\/jobs/,
        /indeed\.com/,
        /glassdoor\.com/,
        /greenhouse\.io/,
        /lever\.co/,
        /jobs\./,
        /careers/,
        /workday/,
        /boards\.greenhouse/,
        /jobs\.lever/,
        /wellfound\.com/,
        /angel\.co/,
      ],
      keywords: ['apply now', 'job description', 'requirements', 'qualifications', 'benefits', 'salary', 'hiring'],
      analyzer: window.ScoutJobAnalyzer
    },
    social: {
      patterns: [
        /twitter\.com/,
        /x\.com/,
        /reddit\.com/,
        /facebook\.com/,
        /instagram\.com/,
        /tiktok\.com/,
        /youtube\.com/,
        /linkedin\.com\/feed/
      ],
      keywords: ['like', 'follow', 'subscribe', 'share', 'trending', 'thread', 'viral'],
      analyzer: window.ScoutSocialAnalyzer
    },
    shopping: {
      patterns: [
        /amazon\./,
        /ebay\./,
        /aliexpress\./,
        /shopify\./,
        /etsy\./,
        /bestbuy\./,
        /newegg\./,
        /product/,
        /item\//
      ],
      keywords: ['add to cart', 'buy now', 'price', 'review', 'rating', 'discount', 'deal'],
      analyzer: window.ScoutShoppingAnalyzer
    },
    news: {
      patterns: [
        /news\./,
        /bbc\./,
        /cnn\./,
        /reuters\./,
        /medium\./,
        /substack\./,
        /techcrunch/,
        /theguardian/,
        /nytimes/,
        /washingtonpost/
      ],
      keywords: ['breaking', 'exclusive', 'sources say', 'reportedly', 'allegedly'],
      analyzer: window.ScoutNewsAnalyzer
    },
    code: {
      patterns: [
        /github\.com/,
        /stackoverflow\./,
        /gitlab\./,
        /npmjs\./,
        /docs\./,
        /dev\./
      ],
      keywords: ['repository', 'stars', 'fork', 'commit', 'issue', 'pull request', 'documentation'],
      analyzer: null
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

  function handleAIResponse(response, siteType) {
    if (response?.status === 'ok' && response.data?.insights) {
      window.ScoutOverlay.renderInsights(response.data.insights, siteType);
    } else if (response?.status === 'error') {
      window.ScoutOverlay.showToast(response.message || 'Scout offline', 'warning');
      window.ScoutOverlay.showBadge('Scout Server Offline — Run: node bridge/server.js', 'warning');
    }
  }

  async function runAnalysis() {
    const detected = detectSite();
    console.log('[Scout] Detected site type:', detected);

    if (!detected.type) return;

    const config = SiteDetectors[detected.type];
    if (!config.analyzer) return;

    const context = config.analyzer.extract(document);
    if (!context) return;

    // Run instant heuristics immediately
    const instantInsights = config.analyzer.heuristics(document, context);
    if (instantInsights.length > 0) {
      window.ScoutOverlay.renderInsights(instantInsights, detected.type);
    }

    // Send to background for AI analysis
    try {
      chrome.runtime.sendMessage({
        action: 'SCOUT_ANALYZE',
        payload: {
          type: detected.type,
          context: context,
          url: location.href,
          title: document.title
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Scout]', chrome.runtime.lastError.message);
          window.ScoutOverlay.showBadge('Scout Bridge Offline', 'warning');
          return;
        }
        handleAIResponse(response, detected.type);
      });
    } catch (e) {
      console.warn('[Scout] Bridge not ready:', e.message);
      window.ScoutOverlay.showBadge('Start Scout Server: node bridge/server.js', 'warning');
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TRIGGER_FULL_ANALYSIS') {
      runAnalysis();
    }
    if (msg.type === 'TRIGGER_SUMMARY' && msg.text) {
      window.ScoutOverlay.showToast('Analyzing selection...', 'info');
      chrome.runtime.sendMessage({
        action: 'SCOUT_ANALYZE',
        payload: {
          type: 'selection',
          context: { selectedText: msg.text, url: location.href },
          url: location.href,
          title: document.title
        }
      }, (response) => {
        if (!chrome.runtime.lastError) {
          handleAIResponse(response, 'selection');
        }
      });
    }
    if (msg.type === 'SET_MODE') {
      // Force a specific mode (from popup)
      console.log('[Scout] Mode set to:', msg.mode);
    }
    // Handle native messaging bridge responses
    if (msg.insights) {
      window.ScoutOverlay.renderInsights(msg.insights, msg.siteType || 'general');
    }
  });

  // Run after page settles
  if (document.readyState === 'complete') {
    setTimeout(runAnalysis, 1200);
  } else {
    window.addEventListener('load', () => setTimeout(runAnalysis, 1200));
  }

  // Re-run on SPA navigation
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(runAnalysis, 2000);
  };
  window.addEventListener('popstate', () => setTimeout(runAnalysis, 2000));
})();
