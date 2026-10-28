import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGeminiHttpOptions, getGeminiTimeoutMs, reviewWithGemini } from './geminiReview.js'

test('uses two bounded retries for transient Gemini gateway errors', () => {
  const options = buildGeminiHttpOptions(45000)
  assert.equal(options.timeout, 45000)
  assert.equal(options.retryOptions.attempts, 3)
  assert.equal(options.retryOptions.initialDelay, 1)
  assert.equal(options.retryOptions.maxDelay, 3)
  assert.equal(options.retryOptions.expBase, 2)
  assert.equal(options.retryOptions.jitter, 0.2)
  assert.ok(options.retryOptions.httpStatusCodes.includes(504))
})


test('caps configured Gemini timeout per attempt', () => {
  assert.equal(getGeminiTimeoutMs('120000'), 70000)
  assert.equal(getGeminiTimeoutMs('30000'), 30000)
  assert.equal(getGeminiTimeoutMs('invalid'), 70000)
})
test('returns a safe unavailable result when GEMINI_API_KEY is missing', async () => {
  const prior = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  try {
    const result = await reviewWithGemini({
      content: 'Our cream cures acne.',
      guidelines: [{ rule_code: 'C-02', type: 'claims', active: true }],
    })
    assert.equal(result.available, false)
    assert.deepEqual(result.findings, [])
    assert.match(result.warning, /GEMINI_API_KEY is not configured/)
  } finally {
    if (prior === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = prior
  }
})
