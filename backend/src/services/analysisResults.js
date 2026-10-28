function makeMlFinding(mlRisk) {
  const label = Number(mlRisk?.risk_label)
  if (label !== 0 && label !== 1) return null

  const score = Number(mlRisk?.risk_score)
  const severity = label === 0 ? 'info' : (Number.isFinite(score) && score >= 0.8 ? 'high' : 'medium')
  const defaultMessage = label === 1
    ? 'Potential content risk detected. Review the content.'
    : 'No generic content risk detected by this classifier.'

  return {
    rule_code: 'ML-RISK',
    source: 'ml',
    category: 'ml_risk',
    severity,
    quoted_span: null,
    start_idx: null,
    end_idx: null,
    explanation: typeof mlRisk?.message === 'string' ? mlRisk.message : defaultMessage,
    suggestion: null,
    advisory: true,
  }
}

export function mergeAnalysisResults({
  content,
  guidelines = [],
  deterministicFindings = [],
  geminiFindings = [],
  geminiResult = { available: true },
  mlResult = { available: true, data: {} },
}) {
  const ruleFindings = deterministicFindings.map((finding) => {
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

  const mlData = mlResult.available ? (mlResult.data || {}) : {}
  const mlRisk = mlData.ml_risk ?? mlData.ml_risk_json ?? mlData.risk ?? null
  const mlFinding = mlRisk ? makeMlFinding(mlRisk) : null
  const mlFindings = mlFinding ? [mlFinding] : []

  const findings = [...ruleFindings, ...mlFindings, ...geminiFindings]
  const persistedFindings = [
    ...ruleFindings.map((finding) => ({ ...finding, source_type: 'deterministic' })),
    ...mlFindings.map((finding) => ({ ...finding, source_type: 'ml' })),
    ...geminiFindings.map((finding) => ({ ...finding, source_type: 'ai' })),
  ]
  const warnings = []
  if (!mlResult.available) {
    warnings.push({
      code: 'ML_UNAVAILABLE',
      message: mlResult.warning || 'ML service is unavailable.',
    })
  }
  if (!geminiResult.available) {
    warnings.push({
      code: 'AI_UNAVAILABLE',
      message: geminiResult.warning || 'AI unavailable.',
    })
  }

  const suggestedRewrite = geminiResult.available && typeof geminiResult.suggested_rewrite === 'string'
    ? geminiResult.suggested_rewrite
    : (typeof mlData.suggested_rewrite === 'string' ? mlData.suggested_rewrite : null)

  return { findings, persistedFindings, warnings, mlRisk, suggestedRewrite }
}
