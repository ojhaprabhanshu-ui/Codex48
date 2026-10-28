const CLAIM_RE = /\b(?:cure|cures|cured|curing|treat|treats|treated|treating|heal|heals|healed|healing|support|supports|supported|improve|improves|improved|reduce|reduces|reduced|eliminate|eliminates|eliminated|prevent|prevents|prevented|restore|restores|restored|repair|repairs|repaired)\b[^.!?;\n]*/giu
const PROMOTIONAL_CTA_RE = /\b(?:buy|shop|order)\s+now\b|\b(?:buy|shop)\s+today\b|\badd\s+to\s+cart\b|\bget\s+yours?\s+now\b/giu
const WORD_CHAR = '[\\p{L}\\p{N}_]'
const TOKEN_RE = /[\p{L}\p{N}’'-]+/gu
const NEGATIONS = new Set(['no', 'not', 'never', 'without', 'avoid', "don't", "doesn't", "didn't", 'cannot', "can't"])

function configOf(guideline) {
  return guideline?.config_json && typeof guideline.config_json === 'object'
    ? guideline.config_json
    : {}
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}

function asWordBoundaryRegex(source) {
  try {
    return new RegExp('(?<!' + WORD_CHAR + ')(?:' + source + ')(?!' + WORD_CHAR + ')', 'giu')
  } catch {
    return null
  }
}

function hasRecentNegation(content, start, configured = []) {
  const tokens = [...content.slice(0, start).matchAll(TOKEN_RE)]
    .slice(-3)
    .map((match) => match[0].toLowerCase())
  const guards = new Set([...NEGATIONS, ...configured.map((item) => String(item).toLowerCase())])
  return tokens.some((token) => guards.has(token))
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .trim()
}

function approvedFactsFrom(guidelines) {
  return guidelines.flatMap((guideline) => {
    const config = configOf(guideline)
    const facts = config.approved_facts ?? guideline.approved_facts ?? []
    if (!Array.isArray(facts)) return []
    return facts
      .filter((fact) => fact && (
        typeof fact === 'string' || fact.status == null || fact.status === 'approved'
      ))
      .map((fact) => typeof fact === 'string' ? fact : fact.text)
      .filter((fact) => typeof fact === 'string' && fact.trim())
  })
}

function findGuideline(guidelines, exactCode, fallbackPattern) {
  return guidelines.find((guideline) => guideline.rule_code === exactCode)
    || guidelines.find((guideline) => fallbackPattern.test([
      guideline.type,
      guideline.category,
      guideline.title,
      guideline.rule_code,
    ].filter(Boolean).join(' ')))
    || null
}

function getSeverity(guideline, fallback = 'high') {
  const severity = configOf(guideline).severity
  return ['high', 'medium', 'low', 'info'].includes(severity) ? severity : fallback
}

function makeFinding(ruleId, severity, excerpt, explanation, suggestion) {
  return {
    ruleId,
    source: 'deterministic',
    severity,
    excerpt,
    explanation,
    suggestion: suggestion || null,
  }
}

function bannedTermFindings(content, guidelines) {
  const findings = []
  for (const guideline of guidelines) {
    const config = configOf(guideline)
    const terms = Array.isArray(config.banned_terms) ? config.banned_terms : []
    const patterns = Array.isArray(config.patterns) ? config.patterns : []
    const matchers = [
      ...terms
        .filter((term) => typeof term === 'string' && term.trim())
        .map((term) => ({ source: escapeRegExp(term.trim()) })),
      ...patterns
        .filter((pattern) => typeof pattern?.regex === 'string' && pattern.regex.trim())
        .map((pattern) => ({ ...pattern, source: pattern.regex })),
    ]

    for (const matcher of matchers) {
      const expression = asWordBoundaryRegex(matcher.source)
      if (!expression) continue
      for (const match of content.matchAll(expression)) {
        const negations = matcher.negations || config.negations || []
        if (config.negation_guard !== false && hasRecentNegation(content, match.index, negations)) continue
        findings.push(makeFinding(
          guideline.rule_code,
          ['high', 'medium', 'low', 'info'].includes(matcher.severity)
            ? matcher.severity
            : getSeverity(guideline),
          match[0],
          matcher.explanation || config.explanation || guideline.text
            || 'This term is not allowed by the stored brand guideline.',
          matcher.suggestion || config.suggestion || null,
        ))
      }
    }
  }
  return findings
}

function unsupportedClaimFindings(content, guidelines, approvedFacts) {
  const guideline = findGuideline(guidelines, 'C-02', /approved.?fact|claim/i)
  if (!guideline) return []
  const config = configOf(guideline)
  const approved = approvedFacts.map(normalize).filter(Boolean)
  const findings = []

  for (const match of content.matchAll(CLAIM_RE)) {
    if (config.negation_guard !== false && hasRecentNegation(content, match.index, config.negations || [])) continue
    const excerpt = match[0].trim()
    const claim = normalize(excerpt)
    const isApproved = approved.some((fact) =>
      claim === fact || claim.includes(fact) || fact.includes(claim),
    )
    if (isApproved) continue

    findings.push(makeFinding(
      guideline.rule_code || 'C-02',
      getSeverity(guideline),
      excerpt,
      config.unsupported_claim_explanation || guideline.text
        || 'This claim does not match an approved product fact.',
      config.suggestion || 'Replace this claim with wording from the approved facts list.',
    ))
  }
  return findings
}

function disclosureFindings(content, guidelines, contentType) {
  const guideline = findGuideline(guidelines, 'D-01', /disclos|paid.?promo/i)
  if (!guideline) return []
  const cta = [...content.matchAll(PROMOTIONAL_CTA_RE)][0]
  const config = configOf(guideline)
  const requiredTypes = Array.isArray(config.required_for_content_types)
    ? config.required_for_content_types
    : ['paid_promo', 'ad_copy']
  const paidType = requiredTypes.includes(String(contentType || '').toLowerCase())
  if ((!cta && !paidType) || /#ad\b/i.test(content)) return []

  return [makeFinding(
    guideline.rule_code || 'D-01',
    getSeverity(guideline),
    cta?.[0] || null,
    config.required_explanation || guideline.text || 'Promotional content must include #ad.',
    config.suggestion || 'Add #ad to the promotional post.',
  )]
}

export function runDeterministicRules(content, guidelines = [], contentType = '') {
  if (typeof content !== 'string' || !content.trim()) return []
  const active = guidelines.filter((guideline) => guideline && guideline.active !== false)
  const approvedFacts = approvedFactsFrom(active)
  const findings = [
    ...bannedTermFindings(content, active),
    ...unsupportedClaimFindings(content, active, approvedFacts),
    ...disclosureFindings(content, active, contentType),
  ]

  const seen = new Set()
  return findings.filter((finding) => {
    const key = finding.ruleId + '\u0000' + normalize(finding.excerpt)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Keeps the existing route's database and response shape stable until step 2.
export function runRuleEngine(content, guidelines = [], contentType = '') {
  return runDeterministicRules(content, guidelines, contentType).map((finding) => {
    const guideline = guidelines.find((item) => item.rule_code === finding.ruleId)
    const start = finding.excerpt ? content.indexOf(finding.excerpt) : -1
    return {
      rule_code: finding.ruleId,
      source: 'rule_engine',
      category: guideline?.type || (finding.ruleId === 'D-01' ? 'disclosure' : 'claims'),
      severity: finding.severity,
      quoted_span: finding.excerpt,
      start_idx: start >= 0 ? start : null,
      end_idx: start >= 0 ? start + finding.excerpt.length : null,
      explanation: finding.explanation,
      suggestion: finding.suggestion,
      advisory: false,
    }
  })
}

