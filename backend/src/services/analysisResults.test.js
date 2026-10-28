import test from 'node:test'
import assert from 'node:assert/strict'
import { runDeterministicRules } from './ruleEngine.js'
import { reviewWithGemini } from './geminiReview.js'
import { mergeAnalysisResults } from './analysisResults.js'

const guidelines = [
  {
    rule_code: 'C-02', type: 'claims', active: true,
    text: 'Only claims from approved facts may be used.',
    config_json: { approved_facts: ['Supports healthy-looking skin.'] },
  },
  {
    rule_code: 'D-01', type: 'disclosure', active: true,
    text: 'Promotional posts must include #ad.',
    config_json: {},
  },
]

test('Gemini unavailable keeps deterministic and ML findings and emits AI_UNAVAILABLE', async () => {
  const previous = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  try {
    const content = 'Our cream cures acne in 7 days! Buy now!'
    const deterministicFindings = runDeterministicRules(content, guidelines, 'organic_post')
    const geminiResult = await reviewWithGemini({ content, guidelines, ruleFindings: deterministicFindings })
    const merged = mergeAnalysisResults({
      content,
      guidelines,
      deterministicFindings,
      geminiFindings: [],
      geminiResult,
      mlResult: { available: true, data: { ml_risk: {
        risk_label: 1,
        risk_category: 'potential_risk',
        risk_score: 0.6343,
        advisory: true,
        message: 'Potential content risk detected. Review the content.',
      } } },
    })

    assert.deepEqual(merged.findings.map(({ rule_code }) => rule_code).sort(), ['C-02', 'D-01', 'ML-RISK'])
    assert.equal(merged.mlRisk.risk_label, 1)
    assert.ok(merged.warnings.some((warning) => warning.code === 'AI_UNAVAILABLE'))
    const mlFinding = merged.persistedFindings.find((finding) => finding.source_type === 'ml')
    assert.equal(mlFinding.rule_code, 'ML-RISK')
    assert.equal(mlFinding.source, 'ml')
    assert.equal(mlFinding.advisory, true)
    assert.equal(mlFinding.quoted_span, null)
    assert.deepEqual(
      merged.persistedFindings.filter((finding) => finding.source_type === 'deterministic').map(({ rule_code }) => rule_code).sort(),
      ['C-02', 'D-01'],
    )
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previous
  }
})

test('ML low-risk classification is saved as an advisory info assessment', () => {
  const merged = mergeAnalysisResults({
    content: 'Neutral copy.',
    mlResult: { available: true, data: { ml_risk: { risk_label: 0, risk_score: 0.12 } } },
  })
  assert.equal(merged.persistedFindings.length, 1)
  assert.equal(merged.persistedFindings[0].source_type, 'ml')
  assert.equal(merged.persistedFindings[0].severity, 'info')
})
