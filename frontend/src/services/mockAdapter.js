import { demoBrands, demoGuidelines, demoSubmissions } from '../data/mockData'

const SUBMISSIONS_KEY = 'brandproof-demo-submissions-v1'
const GUIDELINES_KEY = 'brandproof-demo-guidelines-v1'
let memorySubmissions = null
let memoryGuidelines = null

function readStorage(key) {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null } catch { return null }
}

function writeStorage(key, value) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory fixture state remains available. */ }
}

function readSessionStorage(key) {
  try { return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null } catch { return null }
}

function writeSessionStorage(key, value) {
  try { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory fixture state remains available. */ }
}

function removeSessionStorage(key) {
  try { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key) } catch { /* In-memory fixture state is cleared independently. */ }
}

function readSubmissions() {
  if (memorySubmissions) return memorySubmissions
  try {
    const saved = readStorage(SUBMISSIONS_KEY)
    if (saved) memorySubmissions = JSON.parse(saved)
  } catch { /* Restore the bundled sample data if stored fixture data is invalid. */ }
  memorySubmissions ||= demoSubmissions.map((item) => ({ ...item, analysis_history: [], review_events: [] }))
  return memorySubmissions
}

function writeSubmissions(items) {
  memorySubmissions = items
  writeStorage(SUBMISSIONS_KEY, items)
}

function readGuidelines() {
  if (memoryGuidelines) return memoryGuidelines
  try {
    const saved = readSessionStorage(GUIDELINES_KEY)
    if (saved) memoryGuidelines = JSON.parse(saved)
  } catch { /* Restore bundled fixtures if stored fixture data is invalid. */ }
  memoryGuidelines ||= demoGuidelines.map((item) => ({ ...item }))
  return memoryGuidelines
}

function writeGuidelines(items) {
  memoryGuidelines = items
  writeSessionStorage(GUIDELINES_KEY, items)
}

function getBrand(brandId) {
  return demoBrands.find((brand) => String(brand.id) === String(brandId)) || demoBrands[0]
}

function getGuideline(ruleCode) {
  return readGuidelines().find((rule) => String(rule.rule_code || rule.id) === String(ruleCode) && rule.active !== false)
}

function latestAnalysis(item) {
  if (item.analysis) return item.analysis
  return item.analysis_history?.at(-1) || null
}

function makeFinding(submissionId, ruleCode, match, extra = {}) {
  const guideline = getGuideline(ruleCode)
  const span = match?.[0] ?? null
  const start = match?.index ?? null
  return {
    id: submissionId + '-' + ruleCode.toLowerCase() + '-' + (start ?? 'disclosure'),
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
    while ((match = resultPromise.exec(content)) !== null) findings.push(makeFinding(submission.id, 'MOR-001', match, {
      suggestion: 'Describe the routine without promising a specific time to see results.',
    }))
  } else {
    const medicalClaim = /\b(?:cure|cures|cured|curing|treat|treats|treated|heal|heals|healed)\s+(?:acne|skin conditions?)\b(?:\s+in\s+\d+\s+days?)?/gi
    while ((match = medicalClaim.exec(content)) !== null) findings.push(makeFinding(submission.id, 'RULE-001', match, {
      suggestion: 'Replace this with an approved product fact, such as “supports healthy-looking skin.”',
    }))
  }

  if (['paid_promo', 'ad_copy'].includes(submission.content_type) && !/#(?:ad|sponsored)\b/i.test(content)) {
    findings.push(makeFinding(submission.id, isMorrowSkin ? 'MOR-002' : 'RULE-002', null, {
      explanation: 'This sample disclosure rule applies to paid promotional content. Add #ad or #sponsored.',
      suggestion: 'Add #ad or #sponsored to this paid promotion.',
    }))
  }

  if (!isMorrowSkin) {
    const pressurePhrase = /\b(?:buy\s+now|last\s+chance|only\s+today|hurry)\b/gi
    while ((match = pressurePhrase.exec(content)) !== null) findings.push(makeFinding(submission.id, 'RULE-004', match, {
      severity: 'medium',
      explanation: 'The brand asks for informative wording and advises against pressure-based calls to action.',
      suggestion: 'Consider a neutral call to action such as “Explore the collection.”',
    }))
  }

  return findings.filter((finding) => finding.guideline_text).sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER))
}

function makeRuleDraft(content, findings) {
  let rewrite = content
  const located = findings.filter((finding) => finding.start !== null && finding.end !== null).sort((a, b) => b.start - a.start)
  for (const finding of located) {
    const replacement = finding.rule_code === 'RULE-001' ? 'supports healthy-looking skin'
      : finding.rule_code === 'MOR-001' ? 'A simple daily routine'
        : finding.rule_code === 'RULE-004' ? 'Explore the collection' : null
    if (replacement) rewrite = rewrite.slice(0, finding.start) + replacement + rewrite.slice(finding.end)
  }
  if (findings.some((finding) => ['RULE-002', 'MOR-002'].includes(finding.rule_code)) && rewrite.trim()) rewrite = rewrite.trimEnd() + ' #ad'
  return rewrite
}

function summary(item) {
  const analysis = item.pending_analysis_content ? null : latestAnalysis(item)
  const findings = analysis?.findings || runFixtureRules(item)
  return {
    ...item,
    analysis,
    analysis_history: item.analysis_history || (item.analysis ? [item.analysis] : []),
    review_events: item.review_events || [],
    brand: getBrand(item.brand_id),
    findings_count: findings.filter((finding) => !finding.advisory).length,
    version_count: item.analysis_history?.length || (item.analysis ? 1 : 0),
  }
}

function getSubmissionIndex(items, id) {
  return items.findIndex((submission) => String(submission.id) === String(id))
}

export async function getBrands() {
  return demoBrands.map((brand) => ({ ...brand }))
}

export async function getGuidelines(brandId) {
  return readGuidelines().filter((rule) => !brandId || String(rule.brand_id) === String(brandId)).map((rule) => ({ ...rule }))
}

export async function createGuideline(payload) {
  const items = readGuidelines()
  const prefix = payload.brand_id === 'morrow-skin' ? 'MOR' : 'RULE'
  const ids = items.filter((item) => item.brand_id === payload.brand_id).map((item) => Number(String(item.rule_code || item.id).match(/(\d+)$/)?.[1] || 0))
  const next = String(Math.max(0, ...ids) + 1).padStart(3, '0')
  const id = prefix + '-' + next
  const rule = { ...payload, id, rule_code: id, active: payload.active !== false }
  writeGuidelines([...items, rule])
  return { ...rule }
}

export async function updateGuideline(id, payload) {
  const items = readGuidelines()
  const index = items.findIndex((item) => String(item.id) === String(id) || String(item.rule_code) === String(id))
  if (index < 0) throw new Error('This demo guideline could not be found.')
  items[index] = { ...items[index], ...payload, id: items[index].id, rule_code: items[index].rule_code }
  writeGuidelines(items)
  return { ...items[index] }
}

export async function deleteGuideline(id) {
  const items = readGuidelines()
  const next = items.filter((item) => String(item.id) !== String(id) && String(item.rule_code) !== String(id))
  if (next.length === items.length) throw new Error('This demo guideline could not be found.')
  writeGuidelines(next)
  return { deleted: true, id }
}

export async function getSubmissions(params = {}) {
  return readSubmissions().filter((item) => !params.brand_id || String(item.brand_id) === String(params.brand_id)).map(summary)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function getSubmission(id) {
  const item = readSubmissions().find((submission) => String(submission.id) === String(id))
  if (!item) throw new Error('This demo submission could not be found.')
  return summary(item)
}

export async function createSubmission(payload) {
  const items = readSubmissions()
  let id = 'BP-' + String(Date.now()).slice(-6)
  while (items.some((item) => item.id === id)) id = 'BP-' + String(Number(id.slice(3)) + 1).padStart(6, '0')
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
    analysis_history: [],
    review_events: [],
  }
  writeSubmissions([item, ...items])
  return summary(item)
}

export async function updateSubmission(id, payload) {
  const items = readSubmissions()
  const index = getSubmissionIndex(items, id)
  if (index < 0) throw new Error('This demo submission could not be found.')
  items[index] = { ...items[index], ...payload, id: items[index].id, updated_at: new Date().toISOString(), status: 'submitted', review_decision: null, pending_analysis_content: payload.content }
  writeSubmissions(items)
  return summary(items[index])
}

export async function analyzeSubmission(id) {
  const items = readSubmissions()
  const index = getSubmissionIndex(items, id)
  if (index < 0) throw new Error('This demo submission could not be found.')
  const item = items[index]
  const findings = runFixtureRules(item)
  const history = item.analysis_history || (item.analysis ? [item.analysis] : [])
  const analysis = {
    id: 'demo-analysis-' + item.id + '-v' + (history.length + 1),
    submission_id: item.id,
    version: history.length + 1,
    created_at: new Date().toISOString(),
    content_snapshot: item.content,
    status: 'analyzed',
    findings,
    ml_risk: null,
    gemini_findings: [],
    suggested_rewrite: makeRuleDraft(item.content, findings),
    warnings: [{ code: 'MOCK_AI_UNAVAILABLE', message: 'Fixture mode runs sample rule checks only. The ML classifier and Gemini are not invoked.' }],
    demo_mode: true,
    fixture_only: true,
  }
  items[index] = { ...item, status: 'analyzed', analysis, analysis_history: [...history, analysis], pending_analysis_content: null }
  writeSubmissions(items)
  return { ...summary(items[index]), ...analysis, original_content: item.content }
}

export async function getAnalysis(id) {
  const item = readSubmissions().find((submission) => String(submission.id) === String(id) || submission.analysis_history?.some((analysis) => String(analysis.id) === String(id)) || submission.analysis?.id === String(id))
  if (item && String(item.id) === String(id) && item.pending_analysis_content) throw new Error('A current analysis is not available until the revised content has been analyzed.')
  const stored = item?.analysis_history?.find((entry) => String(entry.id) === String(id)) || (item?.analysis?.id === String(id) ? item.analysis : latestAnalysis(item || {}))
  if (!item) throw new Error('No analysis is available for this demo submission yet.')
  const findings = runFixtureRules(item)
  const analysis = stored || (['analyzed', 'pending_review', 'approved', 'rejected', 'changes_requested'].includes(item.status) ? {
    id: 'demo-fixture-analysis-' + item.id,
    submission_id: item.id,
    version: 1,
    created_at: item.created_at,
    content_snapshot: item.content,
    status: 'analyzed',
    findings,
    ml_risk: null,
    gemini_findings: [],
    suggested_rewrite: makeRuleDraft(item.content, findings),
    warnings: [{ code: 'MOCK_AI_UNAVAILABLE', message: 'Fixture mode runs sample rule checks only. The ML classifier and Gemini are not invoked.' }],
    demo_mode: true,
  } : null)
  if (!analysis) throw new Error('No analysis is available for this demo submission yet.')
  return { ...summary(item), ...analysis, original_content: analysis.content_snapshot || item.content, analysis_history: item.analysis_history || [] }
}

export async function submitForReview(id) {
  const items = readSubmissions()
  const index = getSubmissionIndex(items, id)
  if (index < 0) throw new Error('This demo submission could not be found.')
  if (!latestAnalysis(items[index])) throw new Error('Analyze the submission before sending it for review.')
  const item = items[index]
  const event = { id: 'event-' + Date.now(), action: 'submitted_for_review', from_status: item.status, to_status: 'pending_review', actor: 'Brand team', at: new Date().toISOString(), comment: '' }
  items[index] = { ...item, status: 'pending_review', review_decision: null, review_events: [...(item.review_events || []), event] }
  writeSubmissions(items)
  return summary(items[index])
}

export async function getReviews() {
  return readSubmissions().filter((item) => item.status === 'pending_review').map(summary)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export async function decideReview(id, decision) {
  const items = readSubmissions()
  const index = getSubmissionIndex(items, id)
  if (index < 0) throw new Error('This demo review could not be found.')
  if (items[index].status !== 'pending_review') throw new Error('This submission is no longer waiting for review.')
  if (!['approve', 'reject', 'request_changes'].includes(decision.decision)) throw new Error('Choose a valid review decision.')
  if (['reject', 'request_changes'].includes(decision.decision) && !decision.comment?.trim()) throw new Error('Add a comment for rejection or requested changes.')
  const statusByDecision = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' }
  const item = items[index]
  const nextStatus = statusByDecision[decision.decision]
  const event = { id: 'event-' + Date.now(), action: decision.decision, from_status: item.status, to_status: nextStatus, actor: 'Demo reviewer', at: new Date().toISOString(), comment: decision.comment?.trim() || '' }
  items[index] = { ...item, status: nextStatus, review_decision: decision.decision, reviewer_comment: decision.comment?.trim() || '', reviewed_at: event.at, review_events: [...(item.review_events || []), event] }
  writeSubmissions(items)
  return summary(items[index])
}

export function resetMockData() {
  memorySubmissions = null
  memoryGuidelines = null
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SUBMISSIONS_KEY)
      removeSessionStorage(GUIDELINES_KEY)
    }
  } catch { /* Reset the in-memory view even when storage is unavailable. */ }
}
