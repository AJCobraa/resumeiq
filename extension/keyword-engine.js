/**
 * keyword-engine.js
 * Pure JavaScript keyword extraction and resume matching.
 * Runs entirely in the browser — no backend, no latency.
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','we','you','they','he','she','it','our',
  'your','their','its','my','who','which','what','when','where','how',
  'all','any','both','each','few','more','most','other','some','such',
  'than','then','so','yet','not','no','nor','as','if','also','while',
  'about','above','after','before','between','during','through','under',
  'very','just','only','own','same','too','can','work','experience',
  'ability','skills','including','strong','good','excellent','great',
  'required','preferred','looking','team','role','position','join',
  'company','years','plus','least','across','multiple','using','well',
  'ensure','provide','develop','design','build','create','manage','support'
]);

/**
 * Extract meaningful keywords from text.
 * Returns array of { term, weight, count } objects sorted by importance.
 */
function extractKeywords(text, maxKeywords = 40) {
  if (!text) return [];

  const normalized = text.toLowerCase().replace(/[^\w\s\+\#\.]/g, ' ');

  // Single word tokens
  const words = normalized.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Count frequencies
  const freq = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Extract tech-specific terms that appear in original casing
  const techTerms = extractTechTerms(text);

  // Build bigrams for multi-word technical phrases
  const bigrams = extractBigrams(normalized, STOP_WORDS);

  // Combine: bigrams get 2x weight, tech terms get 1.5x weight
  const combined = {};

  for (const [term, count] of Object.entries(freq)) {
    if (count >= 1) {
      combined[term] = { term, count, weight: count };
    }
  }

  for (const [bigram, count] of Object.entries(bigrams)) {
    if (count >= 1) {
      combined[bigram] = { term: bigram, count, weight: count * 2 };
    }
  }

  for (const tech of techTerms) {
    const key = tech.toLowerCase();
    if (combined[key]) {
      combined[key].weight *= 1.5;
      combined[key].isTech = true;
    } else {
      combined[key] = { term: key, displayTerm: tech, count: 1, weight: 1.5, isTech: true };
    }
  }

  return Object.values(combined)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxKeywords);
}

function extractTechTerms(text) {
  // Match capitalized words, acronyms, and known tech patterns
  const techPatterns = [
    /\b[A-Z][a-zA-Z]*(?:\.[a-zA-Z]+)+/g,    // e.g. Node.js, Vue.js
    /\b[A-Z]{2,}\b/g,                          // e.g. REST, API, SQL, AWS
    /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,       // e.g. JavaScript, TypeScript, MongoDB
    /\b(?:C\+\+|C#|\.NET|F#)\b/g,             // Special cases
  ];

  const found = new Set();
  for (const pattern of techPatterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      if (m.length > 1 && !STOP_WORDS.has(m.toLowerCase())) {
        found.add(m);
      }
    }
  }
  return [...found];
}

function extractBigrams(text, stopWords) {
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (!stopWords.has(a) && !stopWords.has(b) && a.length > 2 && b.length > 2) {
      const bigram = `${a} ${b}`;
      bigrams[bigram] = (bigrams[bigram] || 0) + 1;
    }
  }
  return bigrams;
}

/**
 * Match a list of keywords against resume text.
 * Returns { matched: [], missing: [], score: 0-100 }
 */
function matchKeywordsAgainstResume(keywords, resumeText) {
  if (!resumeText || !keywords.length) return { matched: [], missing: [], score: 0 };

  const resumeLower = resumeText.toLowerCase();
  const matched = [];
  const missing = [];

  for (const kw of keywords) {
    const term = (kw.displayTerm || kw.term).toLowerCase();
    const found = resumeLower.includes(term);
    if (found) {
      matched.push({ ...kw, inResume: true });
    } else {
      missing.push({ ...kw, inResume: false });
    }
  }

  // Weight score: matched keywords weighted by their importance
  const totalWeight = keywords.reduce((s, k) => s + k.weight, 0);
  const matchedWeight = matched.reduce((s, k) => s + k.weight, 0);
  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  return { matched, missing, score };
}

/**
 * Score ALL resumes against a JD and return ranked results.
 * resumeList: array of { resumeId, resumeTitle, meta, sections }
 */
function rankResumesAgainstJD(jdText, resumeList) {
  const keywords = extractKeywords(jdText, 40);

  const results = resumeList.map(resume => {
    const resumeText = resumeToText(resume);
    const { matched, missing, score } = matchKeywordsAgainstResume(keywords, resumeText);
    return {
      resumeId: resume.resumeId,
      resumeTitle: resume.resumeTitle || resume.meta?.title || 'Untitled',
      score,
      matched: matched.slice(0, 20),
      missing: missing.slice(0, 20),
      totalKeywords: keywords.length,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Convert resume JSON to flat text for matching.
 */
function resumeToText(resume) {
  const lines = [];
  const meta = resume.meta || {};

  if (meta.title) lines.push(meta.title);
  if (meta.summary) lines.push(meta.summary);

  for (const section of (resume.sections || [])) {
    const t = section.type;
    if (t === 'experience') {
      lines.push(section.company || '', section.role || '');
      for (const b of (section.bullets || [])) { if (b.text) lines.push(b.text); }
    } else if (t === 'skills') {
      for (const cat of (section.categories || [])) {
        lines.push(cat.label || '', (cat.items || []).join(' '));
      }
    } else if (t === 'projects') {
      for (const item of (section.items || [])) {
        lines.push(item.name || '', item.techStack || '', item.description || '');
        for (const b of (item.bullets || [])) { if (b.text) lines.push(b.text); }
      }
    } else if (t === 'education') {
      for (const item of (section.items || [])) {
        lines.push(item.degree || '', item.institution || '');
      }
    } else if (t === 'certifications') {
      for (const item of (section.items || [])) {
        lines.push(item.title || '', item.issuer || '');
      }
    }
  }

  return lines.join(' ').toLowerCase();
}

// Export for use in content script and sidebar
if (typeof window !== 'undefined') {
  window.ResumeIQKeywordEngine = { extractKeywords, matchKeywordsAgainstResume, rankResumesAgainstJD, resumeToText };
}
