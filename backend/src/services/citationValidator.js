const SEVERITIES = new Set(['high', 'medium', 'low', 'info'])

function excerptOf(candidate) {
  const excerpt = candidate.quoted_span || candidate.quote || candidate.exact_text
  return typeof excerpt === 'string' ? excerpt : ''
}

function ruleIdOf(candidate) {
  const value = candidate.rule_code || candidate.rule_id || candidate.guideline_id
  return typeof value === 'string' ? value : ''
}

function explanationOf(candidate, fallback) {
  const value = candidate.explanation || candidate.reason || fallback
  return typeof value === 'string' ? value : fallback
}

export function validateCitations(candidates, content, guidelines = []) {
  if (!Array.isArray(candidates) || typeof content !== 'string') return []
  const known = new Map(
    guidelines
      .filter((guideline) => typeof guideline?.rule_code === 'string')
      .map((guideline) => [guideline.rule_code, guideline]),
  )
  const findings = []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const excerpt = excerptOf(candidate)
    if (!excerpt) continue

    const start = content.indexOf(excerpt)
    if (start < 0) continue

    const ruleId = ruleIdOf(candidate)
    const guideline = known.get(ruleId)
    if (!guideline) {
      const label = ruleId ? 'Unrecognized guideline ID "' + ruleId + '"' : 'Missing guideline ID'
      const detail = explanationOf(candidate, 'The AI cited a guideline that is not stored for this brand.')
      findings.push({
        rule_code: 'UNCITED_OBSERVATION',
        source: 'gemini',
        category: 'uncited_observation',
        severity: 'info',
        quoted_span: excerpt,
        start_idx: start,
        end_idx: start + excerpt.length,
        explanation: label + '; uncited observation, needs human review. ' + detail,
        suggestion: typeof candidate.suggestion === 'string' ? candidate.suggestion : null,
        advisory: true,
      })
      continue
    }

    findings.push({
      rule_code: ruleId,
      source: 'gemini',
      category: guideline.type,
      severity: SEVERITIES.has(candidate.severity) ? candidate.severity : 'medium',
      quoted_span: excerpt,
      start_idx: start,
      end_idx: start + excerpt.length,
      explanation: explanationOf(candidate, guideline.text),
      suggestion: typeof candidate.suggestion === 'string' ? candidate.suggestion : null,
      advisory: Boolean(candidate.advisory),
    })
  }

  return findings
}

