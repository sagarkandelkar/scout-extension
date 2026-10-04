// Shopping Analyzer
// Detects dark patterns, review authenticity, and price traps

window.ScoutShoppingAnalyzer = {
  name: 'Deal Auditor',

  extract(doc) {
    const title = doc.querySelector('h1, [id="productTitle"], [class*="product-title" i], [data-testid*="title"]')?.innerText?.trim() || '';
    const priceEl = doc.querySelector('[id="priceblock_ourprice"], [class*="price" i]:not(:empty), [data-testid*="price"]');
    const price = priceEl?.innerText?.trim() || '';
    const reviewsEl = doc.querySelector('[id="acrCustomerReviewText"], [class*="reviews" i], [class*="rating-count"]');
    const reviewText = reviewsEl?.innerText?.trim() || '';
    const desc = doc.querySelector('[id="feature-bullets"], [class*="description" i], [class*="about" i]')?.innerText?.trim()?.slice(0, 2000) || '';

    // Extract review snippets
    const reviewSnippets = Array.from(doc.querySelectorAll('[class*="review-text" i], [data-hook="review-body"] span, [class*="review-content"]'))
      .slice(0, 8)
      .map(el => el.innerText.trim().slice(0, 300));

    return {
      productName: title.slice(0, 200),
      price: price,
      reviewSummary: reviewText,
      description: desc,
      reviewSnippets: reviewSnippets,
      url: location.href
    };
  },

  heuristics(doc, context) {
    const insights = [];
    const text = (context.description + ' ' + context.reviewSnippets.join(' ')).toLowerCase();
    const reviews = context.reviewSnippets;

    // Urgency dark patterns
    const urgency = /only \d+ left|(\d+) people viewing|(\d+) in cart|deal ends in|flash sale|last chance|order in the next/i;
    if (urgency.test(doc.body.innerText)) {
      insights.push({
        type: 'flag',
        severity: 'medium',
        title: '⏰ Manufactured Urgency',
        description: '"Only X left" and countdown timers are often fake or reset. Take a screenshot and check back tomorrow.',
        source: 'heuristic'
      });
    }

    // Review authenticity heuristics
    if (reviews.length > 0) {
      let suspiciousCount = 0;
      const repetitivePhrases = [];
      const phraseMap = {};

      for (const r of reviews) {
        // Short, generic reviews
        if (r.length < 40 && /great|good|nice|love|perfect|awesome/i.test(r)) suspiciousCount++;

        // Count repeated 4-grams
        const words = r.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 3; i++) {
          const gram = words.slice(i, i + 4).join(' ');
          phraseMap[gram] = (phraseMap[gram] || 0) + 1;
        }
      }

      const repeated = Object.entries(phraseMap).filter(([_, count]) => count > 2);
      if (repeated.length > 0) {
        insights.push({
          type: 'flag',
          severity: 'high',
          title: '👥 Bot/Coordinated Reviews Detected',
          description: `Multiple reviews share exact phrases ("${repeated[0][0]}" appears ${repeated[0][1]}x). Likely fake or incentivized.`,
          source: 'heuristic'
        });
      }

      if (suspiciousCount >= 3) {
        insights.push({
          type: 'flag',
          severity: 'medium',
          title: '🤖 Suspicious Review Profile',
          description: `${suspiciousCount}/${reviews.length} sampled reviews are very short + generic. Real buyers usually mention specific details.`,
          source: 'heuristic'
        });
      }
    }

    // Price analysis
    const priceMatch = context.price.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      const numPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
      if (numPrice > 500 && !/warranty|guarantee|return/i.test(text)) {
        insights.push({
          type: 'flag',
          severity: 'low',
          title: '💳 High-Ticket, Low Protection',
          description: 'Price is $500+ but no clear warranty/return policy visible. Verify before purchasing.',
          source: 'heuristic'
        });
      }
    }

    // Subscription trap detection
    if (/subscribe|membership|auto[- ]?renew|trial|monthly|per month/i.test(text) && !/cancel anytime/i.test(text)) {
      insights.push({
        type: 'flag',
        severity: 'high',
        title: '🪤 Subscription Trap',
        description: 'Recurring billing mentioned without clear cancellation terms. Check Trustpilot for cancellation horror stories.',
        source: 'heuristic'
      });
    }

    return insights;
  }
};
