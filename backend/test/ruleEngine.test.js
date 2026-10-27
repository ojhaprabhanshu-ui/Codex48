import test from 'node:test'
import assert from 'node:assert/strict'
import { runRuleEngine } from '../src/services/ruleEngine.js'

const guidelines = [
  { rule_code: 'RULE-001', type: 'prohibited_claim', text: 'No cure claims.', config_json: { patterns: [{ regex: '\\bcures?\\s+acne\\b', flags: 'gi' }] } },
  { rule_code: 'RULE-002', type: 'disclosure', text: 'Add disclosure.', config_json: { required_for_content_types: ['paid_promo'], required_patterns: ['#(?:ad|sponsored)\\b'] } },
]

test('returns JavaScript character offsets and exact quoted spans', () => {
  const content = 'GlowCare cures acne today'
  const [finding] = runRuleEngine(content, guidelines, 'organic_post')
  assert.equal(finding.quoted_span, 'cures acne')
  assert.equal(content.slice(finding.start_idx, finding.end_idx), finding.quoted_span)
  assert.equal(finding.start_idx, 9)
})

test('suppresses a match guarded by a negation in the preceding three tokens', () => {
  const findings = runRuleEngine('This product does not cure acne.', guidelines, 'organic_post')
  assert.equal(findings.some((finding) => finding.rule_code === 'RULE-001'), false)
})

test('does not suppress a match when negation is farther than three tokens away', () => {
  const findings = runRuleEngine('This product is definitely not intended at all to cure acne.', guidelines, 'organic_post')
  assert.equal(findings.some((finding) => finding.rule_code === 'RULE-001'), true)
})

test('emits a required paid-promotion disclosure finding when no disclosure exists', () => {
  const findings = runRuleEngine('A daily skincare routine.', guidelines, 'paid_promo')
  assert.equal(findings.some((finding) => finding.rule_code === 'RULE-002' && finding.start_idx === null), true)
})

test('does not require a disclosure on organic content', () => {
  const findings = runRuleEngine('A daily skincare routine.', guidelines, 'organic_post')
  assert.equal(findings.some((finding) => finding.rule_code === 'RULE-002'), false)
})
