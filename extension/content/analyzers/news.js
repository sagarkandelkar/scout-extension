// News / Blog Analyzer
// Detects bias, weak sourcing, and content quality

window.ScoutNewsAnalyzer = {
  name: 'Media Decoder',

  extract(doc) {
    const title = doc.querySelector('h1')?.innerText?.trim() || document.title;
    const articleBody = doc.querySelector('article, [class*="article" i], [class*="content" i], [class*="story" i], .post')?.innerText || doc.body.innerText;
    const byline = doc.querySelector('[class*="byline" i], [class*="author" i], a[href*="author"]')?.innerText || '';
    const date = doc.querySelector('time, [class*="date" i], [class*="published" i]')?.innerText || '';

    // Count quotes and external links
    const quotes = articleBody.match(/"[^"]{10,300}"/g) || [];
    const externalLinks = Array.from(doc.querySelectorAll('a[href^="http"]'))
      .filter(a => !a.href.includes(location.hostname))
      .length;

    return {
      headline: title.slice(0, 200),
      byline: byline.slice(0, 100),
      publishDate: date,
      body: articleBody.slice(0, 8000),
      quoteCount: quotes.length,
      externalLinkCount: externalLinks,
      url: location.href,
      domain: location.hostname
    };
  },

  heuristics(doc, context) {
    const insights = [];
    const text = context.body.toLowerCase();
    const headline = context.headline.toLowerCase();

    // Clickbait headline patterns
    const clickbaitPatterns = [
      { pattern: 'you won\\'t believe|what happens next|this changes everything|doctors hate|revealed|secret|shocking truth', label: '📰 Clickbait Headline', severity: 'medium' },
      { pattern: '^(?:here\\'s |why |what |how )', label: '🎣 Declarative Tease', severity: 'low' }
    ];
    for (const cb of clickbaitPatterns) {
      if (new RegExp(cb.pattern, 'i').test(headline)) {
        insights.push({
          type: 'flag',
          severity: cb.severity,
          title: cb.label,
          description: 'Headline optimized for clicks over clarity. Actual content often disappoints relative to promise.',
          source: 'heuristic'
        });
      }
    }

    // Weak sourcing
    const hedgeWords = ['reportedly', 'allegedly', 'sources say', 'some say', 'many believe', 'it is thought', 'claims', 'reported'];
    let hedgeCount = 0;
    for (const hw of hedgeWords) {
      const matches = text.match(new RegExp(hw, 'gi'));
      if (matches) hedgeCount += matches.length;
    }
    if (hedgeCount >= 3) {
      insights.push({
        type: 'flag',
        severity: 'medium',
        title: '📎 Weak Sourcing',
        description: `Heavy use of hedging language (${hedgeCount} instances). Article may be recycling speculation, not verified facts.`,
        source: 'heuristic'
      });
    }

    // Emotional bias in headline
    const biasWords = ['outrage', 'slammed', 'destroyed', 'eviscerated', 'blasted', 'furious', 'meltdown', 'epic', 'crushes'];
    for (const bw of biasWords) {
      if (headline.includes(bw)) {
        insights.push({
          type: 'flag',
          severity: 'low',
          title: '⚡ Emotionally Loaded Language',
          description: `Words like "${bw}" signal opinion framing, not neutral reporting.`,
          source: 'heuristic'
        });
        break;
      }
    }

    // Paywall / subscription nag
    if (text.includes('subscribe to read') || text.includes('create an account') || doc.querySelector('[class*="paywall" i], [class*="subscribe" i]')) {
      insights.push({
        type: 'info',
        severity: 'low',
        title: '🔒 Paywalled Content',
        description: 'Full article requires subscription. Consider checking archive.today or 12ft.io.',
        source: 'heuristic'
      });
    }

    // Reading time vs. substance
    const wordCount = context.body.split(/\s+/).length;
    if (wordCount < 200 && !headline.includes('update') && !headline.includes('brief')) {
      insights.push({
        type: 'info',
        severity: 'low',
        title: '🍬 Low-Calorie Content',
        description: `Only ~${wordCount} words. May be a rehash of a press release or social post padded into an "article."`,
        source: 'heuristic'
      });
    }

    // No quotes / no external links = low original reporting
    if (context.quoteCount === 0 && context.externalLinkCount < 2 && wordCount > 300) {
      insights.push({
        type: 'flag',
        severity: 'medium',
        title: '📉 Thin Reporting',
        description: 'No direct quotes and few sources. Likely opinion, aggregation, or rewritten press release.',
        source: 'heuristic'
      });
    }

    return insights;
  }
};
