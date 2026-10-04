// Job Portal Analyzer
// Extracts job post context + instant heuristics

window.ScoutJobAnalyzer = {
  name: 'Job Scanner',

  extract(doc) {
    const bodyText = doc.body.innerText;
    const titleEl = doc.querySelector('h1, [class*="title" i], [class*="job-title" i], [data-testid*="title"]');
    const companyEl = doc.querySelector('[class*="company" i], [class*="employer" i], a[href*="company"]');
    const descEl = doc.querySelector('[class*="description" i], [class*="jobDescription" i], #job-details, article');

    return {
      jobTitle: titleEl?.innerText?.trim()?.slice(0, 120) || '',
      company: companyEl?.innerText?.trim()?.slice(0, 80) || '',
      description: descEl?.innerText?.trim()?.slice(0, 8000) || bodyText.slice(0, 8000),
      fullText: bodyText.slice(0, 12000),
      url: location.href
    };
  },

  heuristics(doc, context) {
    const insights = [];
    const text = (context.fullText || context.description || '').toLowerCase();

    // Red flag phrase detection
    const redFlags = [
      { pattern: 'rockstar|ninja|guru|wizard|superstar|hero', label: '🚨 Red Flag: Unrealistic Expectations', desc: 'Words like "rockstar" often signal understaffing or hero culture.', severity: 'high' },
      { pattern: 'fast[- ]?paced|high[- ]?pressure|deadline[- ]?driven', label: '⚠️ Caution: High Burnout Risk', desc: 'These phrases often correlate with poor work-life balance.', severity: 'medium' },
      { pattern: 'wear many hats|jack of all trades|other duties', label: '🎭 Scope Creep Alert', desc: 'Vague responsibility expansion usually means "we want 3 roles for 1 salary."', severity: 'high' },
      { pattern: 'unlimited pto|flexible time off', label: '🏝️ "Unlimited PTO" Detected', desc: 'Studies show employees take LESS vacation with unlimited policies. Check Glassdoor.', severity: 'medium' },
      { pattern: 'competitive salary|commensurate with experience', label: '💰 Salary Hidden', desc: 'No posted range often means below-market pay. Research via Levels.fyi or Glassdoor.', severity: 'low' },
      { pattern: 'family|tight-knit|work hard play hard', label: '🎪 Culture Warning', desc: '"Family" in job posts frequently substitutes for boundaries. Verify via current employee reviews.', severity: 'medium' },
      { pattern: 'urgent|immediate start|asap', label: '🚪 High Turnover Signal', desc: 'Rush hires often indicate someone left abruptly or the team is drowning.', severity: 'medium' },
      { pattern: 'passionate about|love what you do|not just a job', label: '❤️ Passion Tax', desc: 'Framing work as a calling often justifies underpaying you.', severity: 'low' }
    ];

    for (const flag of redFlags) {
      const regex = new RegExp(flag.pattern, 'i');
      if (regex.test(text)) {
        insights.push({
          type: 'flag',
          severity: flag.severity,
          title: flag.label,
          description: flag.desc,
          source: 'heuristic'
        });
      }
    }

    // Tech stack extraction (quick local win)
    const techMatches = text.match(/\b(React|Vue|Angular|Svelte|Node\.?js|Python|Go|Rust|Java|Kotlin|Swift|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MongoDB|Redis|GraphQL|REST|TypeScript|JavaScript)\b/gi);
    if (techMatches) {
      const unique = [...new Set(techMatches.map(s => s.toLowerCase()))];
      if (unique.length > 2) {
        insights.push({
          type: 'info',
          severity: 'low',
          title: `🛠️ Stack Detected (${unique.length} technologies)`,
          description: `Mentions: ${unique.slice(0, 8).join(', ')}${unique.length > 8 ? '...' : ''}. Cross-check with your experience.`,
          source: 'heuristic'
        });
      }
    }

    // Salary mention check
    if (!/\$|\d{2,3},?\d{3}|salary:|compensation|pay range/i.test(text)) {
      insights.push({
        type: 'flag',
        severity: 'medium',
        title: '🤫 No Salary Transparency',
        description: 'No compensation details found. Consider this a negotiation disadvantage.',
        source: 'heuristic'
      });
    }

    return insights;
  }
};
