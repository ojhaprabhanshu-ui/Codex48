import { validateCitations } from './citationValidator.js'

export async function analyzeWithAI({ content, guidelines, ruleFindings }) {
  const baseUrl = process.env.AI_SERVICE_URL
  if (!baseUrl) return { available: false, warning: 'AI_SERVICE_URL is not configured.' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_SERVICE_TIMEOUT_MS || 20000))
  try {
    const response = await fetch(new URL('/analyze', baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ content, guidelines, rule_findings: ruleFindings }),
    })
    if (!response.ok) throw new Error('AI service returned HTTP ' + response.status)
    const data = await response.json()
    return { available: true, data }
  } catch (error) {
    return { available: false, warning: error.name === 'AbortError' ? 'AI service request timed out.' : error.message }
  } finally { clearTimeout(timer) }
}

export function validateAIResult(data, content, guidelines) {
  const input = Array.isArray(data?.gemini_findings) ? data.gemini_findings
    : Array.isArray(data?.findings) ? data.findings.filter((finding) => String(finding.source || 'gemini').toLowerCase() === 'gemini') : []
  const findings = validateCitations(input, content, guidelines)
  const risk = data?.ml_risk ?? data?.ml_risk_json ?? data?.risk ?? null
  const rewrite = data?.suggested_rewrite ?? data?.suggested_correction ?? null
  return { findings, risk, rewrite: typeof rewrite === 'string' ? rewrite : null }
}

