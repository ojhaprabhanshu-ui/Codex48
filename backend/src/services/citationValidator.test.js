import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCitations } from './citationValidator.js'

const guidelines = [{
  rule_code: 'C-02',
  type: 'claims',
  text: 'Only approved product claims may be used.',
}]

test('keeps a finding when its known rule and exact excerpt are cited', () => {
  const content = 'Our cream cures acne in 7 days.'
  const [finding] = validateCitations([{
    rule_code: 'C-02',
    quoted_span: 'cures acne in 7 days',
    severity: 'high',
    explanation: 'The claim is unsupported.',
  }], content, guidelines)
  assert.equal(finding.rule_code, 'C-02')
  assert.equal(finding.source, 'gemini')
  assert.equal(content.slice(finding.start_idx, finding.end_idx), finding.quoted_span)
})

test('drops a finding whose excerpt is absent from the post', () => {
  const findings = validateCitations([{
    rule_code: 'C-02',
    quoted_span: 'heals eczema',
  }], 'Our cream supports healthy-looking skin.', guidelines)
  assert.deepEqual(findings, [])
})

test('relabels an unknown rule as an observation needing human review', () => {
  const [finding] = validateCitations([{
    rule_code: 'GEMINI-MADE-UP',
    quoted_span: 'cures acne',
    explanation: 'This appears risky.',
  }], 'Our cream cures acne.', guidelines)
  assert.equal(finding.rule_code, 'UNCITED_OBSERVATION')
  assert.equal(finding.category, 'uncited_observation')
  assert.equal(finding.advisory, true)
  assert.match(finding.explanation, /uncited observation, needs human review/i)
})

