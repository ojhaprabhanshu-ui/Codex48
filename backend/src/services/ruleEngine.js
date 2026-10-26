const TOKEN_RE = /[\p{L}\p{N}’'-]+/gu

function hasRecentNegation(content, start, configured = []) {
  const prefix = content.slice(0, start)
  const tokens = [...prefix.matchAll(TOKEN_RE)].slice(-3).map((match) => match[0].toLowerCase())
  const guards = new Set(['no', 'not', 'never', 'without', 'avoid', "don't", 'doesn\'t', 'didn\'t', 'cannot', 'can\'t', ...configured.map((item) => String(item).toLowerCase())])
  return tokens.some((token) => guards.has(token))
}

export function runRuleEngine(content, guidelines, contentType) {
  const findings = []
  for (const guideline of guidelines) {
    const config = guideline.config_json || {}
    const patterns = Array.isArray(config.patterns) ? config.patterns : []
    for (const pattern of patterns) {
      let expression
      try {
        expression = new RegExp(pattern.regex, pattern.flags || 'gi')
      } catch {
        continue
      }
      let match
      while ((match = expression.exec(content)) !== null) {
        if (!match[0].length) { expression.lastIndex += 1; continue }
        if (config.negation_guard !== false && hasRecentNegation(content, match.index, pattern.negations || config.negations)) continue
        const start = match.index
        findings.push({
          rule_code: guideline.rule_code,
          source: 'rule_engine',
          category: guideline.type,
          severity: pattern.severity || config.severity || 'high',
          quoted_span: match[0], start_idx: start, end_idx: start + match[0].length,
          explanation: pattern.explanation || config.explanation || guideline.text,
          suggestion: pattern.suggestion || config.suggestion || null,
          advisory: Boolean(pattern.advisory || config.advisory),
        })
      }
    }
    if (config.required_for_content_types?.includes(contentType) && !config.required_patterns?.some((regex) => new RegExp(regex, 'i').test(content))) {
      findings.push({
        rule_code: guideline.rule_code, source: 'rule_engine', category: guideline.type,
        severity: config.severity || 'high', quoted_span: null, start_idx: null, end_idx: null,
        explanation: config.required_explanation || guideline.text,
        suggestion: config.suggestion || null, advisory: false,
      })
    }
  }
  return findings.sort((a, b) => (a.start_idx ?? Number.MAX_SAFE_INTEGER) - (b.start_idx ?? Number.MAX_SAFE_INTEGER))
}
