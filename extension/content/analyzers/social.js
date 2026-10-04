// Social Media Analyzer
// Detects engagement manipulation, thread quality, and noise

window.ScoutSocialAnalyzer = {
  name: 'Social Decoder',

  extract(doc) {
    const posts = [];
    const isTwitterX = /twitter\.com|x\.com/.test(location.href);
    const isReddit = /reddit\.com/.test(location.href);

    // Extract main post text
    let mainText = '';
    if (isTwitterX) {
      const tweet = doc.querySelector('[data-testid="tweetText"], article [lang]');
      mainText = tweet?.innerText || doc.title;
    } else if (isReddit) {
      const post = doc.querySelector('[data-test-id="post-content"], .Post h1, h1');
      mainText = post?.innerText || doc.title;
    } else {
      mainText = doc.querySelector('h1, article h2, [role="main"]')?.innerText || doc.title;
    }

    // Collect visible comments/replies for thread analysis
    const replyEls = doc.querySelectorAll('[data-testid="reply"], .Comment, [class*="comment" i], [class*="reply" i]');
    const replies = Array.from(replyEls).slice(0, 10).map(el => el.innerText.slice(0, 200));

    return {
      platform: isTwitterX ? 'twitter' : isReddit ? 'reddit' : 'generic',
      postText: mainText?.slice(0, 2000) || '',
      replyCount: replyEls.length,
      topReplies: replies,
      url: location.href,
      engagementMetrics: this._extractMetrics(doc)
    };
  },

  _extractMetrics(doc) {
    const metrics = {};
    const text = doc.body.innerText;
    const likes = text.match(/(\d+[KM]?)[\s,]*(?:likes?|upvotes?)/i);
    const shares = text.match(/(\d+[KM]?)[\s,]*(?:shares?|retweets?|reposts?)/i);
    const comments = text.match(/(\d+[KM]?)[\s,]*(?:comments?|replies?)/i);
    if (likes) metrics.likes = likes[1];
    if (shares) metrics.shares = shares[1];
    if (comments) metrics.comments = comments[1];
    return metrics;
  },

  heuristics(doc, context) {
    const insights = [];
    const text = (context.postText || '').toLowerCase();
    const full = doc.body.innerText.toLowerCase();

    // Engagement bait patterns
    const baitPatterns = [
      { pattern: 'retweet if|like if|comment if|reply with|vote if', label: '🎣 Engagement Bait', desc: 'Author is explicitly manipulating algorithmic distribution. Low signal-to-noise.', severity: 'low' },
      { pattern: 'drop a 💎|smash that|hit that|don\'t scroll|stop scrolling', label: '📢 Clickbait Tactics', desc: 'Classic engagement farming. Content quality usually inversely proportional to aggression.', severity: 'medium' },
      { pattern: 'who else|am i the only one|does anyone else|unpopular opinion', label: '🎭 Manufactured Consensus', desc: 'Designed to trigger "me too" responses and boost comment count artificially.', severity: 'low' }
    ];

    for (const bait of baitPatterns) {
      if (new RegExp(bait.pattern, 'i').test(text)) {
        insights.push({ type: 'flag', severity: bait.severity, title: bait.label, description: bait.desc, source: 'heuristic' });
      }
    }

    // Emotional manipulation detection
    const emotionalTriggers = ['outraged', 'disgusting', 'shocking', 'unbelievable', 'insane', 'wild', 'must watch', 'can\'t believe'];
    let triggerCount = 0;
    for (const t of emotionalTriggers) {
      if (text.includes(t)) triggerCount++;
    }
    if (triggerCount >= 2) {
      insights.push({
        type: 'flag',
        severity: 'medium',
        title: '🎪 Emotional Manipulation Detected',
        description: `Multiple outrage trigger words (${triggerCount}). Designed to bypass rational evaluation. Pause before reacting.`,
        source: 'heuristic'
      });
    }

    // Thread depth signal
    if (context.replyCount > 50) {
      insights.push({
        type: 'info',
        severity: 'low',
        title: `🧵 Deep Thread (${context.replyCount}+ replies)`,
        description: 'High reply counts can mean viral for the wrong reasons. Check if replies are mocking or correcting the OP.',
        source: 'heuristic'
      });
    }

    // Low-effort content heuristics
    if (text.length < 80 && /\!{2,}/.test(text)) {
      insights.push({
        type: 'flag',
        severity: 'low',
        title: '❗ Low-Information Post',
        description: 'Very short + multiple exclamation marks = high probability of noise, not signal.',
        source: 'heuristic'
      });
    }

    // Platform-specific
    if (context.platform === 'twitter' && text.includes('thread')) {
      insights.push({
        type: 'info',
        severity: 'low',
        title: '🧶 Thread Alert',
        description: 'Long Twitter threads often contain padding. The first and last tweets usually hold 80% of the value.',
        source: 'heuristic'
      });
    }

    return insights;
  }
};
