import { demoBrands, demoGuidelines, demoSubmissions } from '../data/mockData'

const STORAGE_KEY = 'brandproof-demo-submissions-v1'
let memorySubmissions = null

function readSubmissions() {
  if (memorySubmissions) return memorySubmissions
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        memorySubmissions = JSON.parse(saved)
        return memorySubmissions
      }
    } catch {
      // Storage can be unavailable in private browsing; keep the demo in memory.
    }
  }
  memorySubmissions = demoSubmissions.map((item) => ({ ...item }))
  writeSubmissions(memorySubmissions)
  return memorySubmissions
}

function writeSubmissions(items) {
  memorySubmissions = items
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // The current session remains usable even when storage is full or blocked.
    }
  }
}

function getBrand(brandId) {
  return demoBrands.find((brand) => brand.id === brandId) || demoBrands[0]
}

function getGuideline(ruleCode) {
  return demoGuidelines.find((rule) => rule.rule_code === ruleCode)
}

function makeFinding(submissionId, ruleCode, match, extra = {}) {
  const guideline = getGuideline(ruleCode)
  const span = match?.[0] ?? null
  const start = match?.index ?? null
  return {
    id: submissionId + '-' + ruleCode.toLowerCase(),
    rule_code: ruleCode,
    source: 'rule_engine',
    category: guideline?.type || 'guideline',
    severity: extra.severity || 'high',
    quoted_span: span,
    start,
    end: span === null ? null : start + span.length,
    explanation: extra.explanation || guideline?.text || 'This sample rule may apply.',
    suggestion: extra.suggestion || null,
    advisory: false,
    guideline_text: guideline?.text || null,
    guideline_title: guideline?.title || null,
  }
}

function runFixtureRules(submission) {
  const content = submission.content || ''
  const findings = []
  const isMorrowSkin = submission.brand_id === 'morrow-skin'
  let match
  if (isMorrowSkin) {
    const resultPromise = /\b(?:feel better overnight|overnight results?|immediate results?|instantly)\b/gi
    while ((match = resultPromise.exec(content)) !== null) {
      findings.push(makeFinding(submission.id, 'MOR-001', match, {
        suggestion: 'Describe the routine without promising a specific time to see results.',
      }))
    }
  } else {
    const medicalClaim = /\b(?:cure|cures|cured|curing|treat|treats|treated|heal|heals|healed)\s+(?:acne|skin conditions?)\b(?:\s+in\s+\d+\s+days?)?/gi
    while ((match = medicalClaim.exec(content)) !== null) {
      findings.push(makeFinding(submission.id, 'RULE-001', match, {
        suggestion: 'Replace this with an approved product fact, such as “supports healthy-looking skin.”',
      }))
    }
  }

  const promotional = ['paid_promo', 'ad_copy'].includes(submission.content_type)
  if (promotional && !/#(?:ad|sponsored)\b/i.test(content)) {
    findings.push(makeFinding(submission.id, isMorrowSkin ? 'MOR-002' : 'RULE-002', null, {
      explanation: 'This sample disclosure rule applies to paid promotional content. Add #ad or #sponsored.',
      suggestion: 'Add #ad or #sponsored to this paid promotion.',
    }))
  }

  if (!isMorrowSkin) {
    const pressurePhrase = /\b(?:buy\s+now|last\s+chance|only\s+today|hurry)\b/gi
    while ((match = pressurePhrase.exec(content)) !== null) {
      findings.push(makeFinding(submission.id, 'RULE-004', match, {
        severity: 'medium',
        explanation: 'The brand asks for informative wording and advises against pressure-based calls to action.',
        suggestion: 'Consider a neutral call to action such as “Explore the collection.”',
      }))
    }
  }

  return findings.sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER))
}

function makeRuleDraft(content, findings) {
  let rewrite = content
  const located = findings
    .filter((finding) => finding.start !== null && finding.end !== null)
    .sort((a, b) => b.start - a.start)

  for (const finding of located) {
    const replacement = finding.rule_code === 'RULE-001'
      ? 'supports healthy-looking skin'
      : finding.rule_code === 'MOR-001'
        ? 'A simple daily routine'
      : finding.rule_code === 'RULE-004'
        ? 'Explore the collection'
        : null
    if (replacement) rewrite = rewrite.slice(0, finding.start) + replacement + rewrite.slice(finding.end)
  }

  if (findings.some((finding) => ['RULE-002', 'MOR-002'].includes(finding.rule_code)) && rewrite.trim()) {
    rewrite = rewrite.trimEnd() + ' #ad'
  }
  return rewrite
}

function summary(item) {
  const findings = item.analysis?.findings || runFixtureRules(item)
  return {
    ...item,
    brand: getBrand(item.brand_id),
    findings_count: findings.filter((finding) => !finding.advisory).length,
  }
}

export async function getBrands() {
  return demoBrands.map((brand) => ({ ...brand }))
}

export async function getGuidelines(brandId) {
  return demoGuidelines
    .filter((rule) => !brandId || rule.brand_id === brandId)
    .map((rule) => ({ ...rule }))
}

export async function getSubmissions(params = {}) {
  return readSubmissions()
    .filter((item) => !params.brand_id || item.brand_id === params.brand_id)
    .map(summary)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function getSubmission(id) {
  const item = readSubmissions().find((submission) => String(submission.id) === String(id))
  if (!item) throw new Error('This demo submission could not be found.')
  return { ...summary(item), analysis: item.analysis || null }
}

export async function createSubmission(payload) {
  const items = readSubmissions()
  const id = 'BP-' + String(Date.now()).slice(-6)
  const item = {
    id,
    brand_id: payload.brand_id,
    title: payload.title.trim(),
    content: payload.content.trim(),
    content_type: payload.content_type,
    platform: payload.platform || null,
    status: 'submitted',
    review_decision: null,
    created_at: new Date().toISOString(),
    analysis: null,
  }
  writeSubmissions([item, ...items])
  return summary(item)
}

export async function analyzeSubmission(id) {
  const items = readSubmissions()
  const index = items.findIndex((item) => String(item.id) === String(id))
  if (index < 0) throw new Error('This demo submission could not be found.')

  const item = items[index]
  const findings = runFixtureRules(item)
  const analysis = {
    id: 'demo-analysis-' + item.id,
    submission_id: item.id,
    status: 'analyzed',
    findings,
    ml_risk: null,
    gemini_findings: [],
    suggested_rewrite: makeRuleDraft(item.content, findings),
    warnings: [{
      code: 'MOCK_AI_UNAVAILABLE',
      message: 'Fixture mode runs sample rule checks only. The ML classifier and Gemini are not invoked.',
    }],
    demo_mode: true,
  }
  items[index] = { ...item, status: 'analyzed', analysis }
  writeSubmissions(items)
  return { ...summary(items[index]), ...analysis, original_content: item.content }
}

export async function getAnalysis(id) {
  const item = readSubmissions().find((submission) =>
    String(submission.id) === String(id) || submission.analysis?.id === id,
  )
  if (!item?.analysis) throw new Error('No analysis is available for this demo submission yet.')
  return { ...summary(item), ...item.analysis, original_content: item.content }
}

export async function getReviews() {
  return readSubmissions()
    .filter((item) => item.status === 'pending_review')
    .map((item) => ({ ...summary(item), analysis: item.analysis || null }))
}

export async function decideReview(id, decision) {
  const items = readSubmissions()
  const index = items.findIndex((item) => String(item.id) === String(id))
  if (index < 0) throw new Error('This demo review could not be found.')
  const statusByDecision = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' }
  items[index] = {
    ...items[index],
    status: statusByDecision[decision.decision] || items[index].status,
    review_decision: decision.decision,
    reviewer_comment: decision.comment || '',
    reviewed_at: new Date().toISOString(),
  }
  writeSubmissions(items)
  return summary(items[index])
}
