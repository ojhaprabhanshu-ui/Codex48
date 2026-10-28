import test from 'node:test'
import assert from 'node:assert/strict'
import { runDeterministicRules } from './ruleEngine.js'

const guidelines = [
  {
    rule_code: 'C-02', type: 'claims', active: true,
    text: 'Only claims from the approved facts list may be used.',
    config_json: { approved_facts: ['Supports healthy-looking skin.'] },
  },
  {
    rule_code: 'D-01', type: 'disclosure', active: true,
    text: 'Promotional posts must include #ad.', config_json: {},
  },
]

test('unsupported claim with promotional CTA returns C-02 and D-01', () => {
  const findings = runDeterministicRules(
    'Our cream cures acne in 7 days! Buy now!',
    guidelines,
    'organic_post',
  )
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), ['C-02', 'D-01'])
  assert.ok(findings.every((finding) => finding.source === 'deterministic'))
  assert.ok(findings.every((finding) =>
    finding.severity && finding.excerpt && finding.explanation
    && Object.hasOwn(finding, 'suggestion'),
  ))
})

test('approved wording with #ad returns no findings', () => {
  const findings = runDeterministicRules(
    'Our cream supports healthy-looking skin. Shop now! #ad',
    guidelines,
    'organic_post',
  )
  assert.deepEqual(findings, [])
})

test('banned terms are case-insensitive and require word boundaries', () => {
  const storedGuidelines = [{
    rule_code: 'B-01', type: 'banned_term', active: true,
    text: 'Do not use cure.',
    config_json: { banned_terms: ['cure'], severity: 'high' },
  }]
  assert.equal(runDeterministicRules('A CURE is prohibited.', storedGuidelines).length, 1)
  assert.equal(runDeterministicRules('Secure the package.', storedGuidelines).length, 0)
})

test('a changed stored guideline changes the next deterministic analysis', () => {
  const before = [{
    rule_code: 'B-01', type: 'banned_term', active: true,
    text: 'Avoid cure.',
    config_json: { banned_terms: ['cure'] },
  }]
  const after = [{
    ...before[0],
    text: 'Avoid serum.',
    config_json: { banned_terms: ['serum'] },
  }]
  const first = runDeterministicRules('Use cure serum.', before)
  const next = runDeterministicRules('Use cure serum.', after)
  assert.deepEqual(first.map(({ excerpt }) => excerpt), ['cure'])
  assert.deepEqual(next.map(({ excerpt }) => excerpt), ['serum'])
})

