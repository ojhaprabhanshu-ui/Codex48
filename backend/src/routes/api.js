import { Router } from 'express'
import { pool, inTransaction } from '../db/pool.js'
import { runRuleEngine } from '../services/ruleEngine.js'
import { analyzeWithAI, validateAIResult } from '../services/aiBridge.js'
import { asyncHandler, HttpError, parseId } from '../utils/http.js'

const router = Router()
const contentTypes = new Set(['paid_promo', 'organic_post', 'ad_copy', 'email'])
const decisions = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' }

function guidelineView(row) {
  return { ...row, config_json: row.config_json || {}, active: Boolean(row.active) }
}

async function getGuidelines(brandId) {
  const { rows } = await pool.query('SELECT * FROM guidelines WHERE brand_id = $1 AND active = true ORDER BY id', [brandId])
  return rows.map(guidelineView)
}

function findingView(row) {
  return {
    ...row,
    guideline_text: row.guideline_text || null, guideline_title: row.guideline_title || null,
  }
}

async function submissionView(row, includeRelations = false) {
  const view = { ...row }
  if (!includeRelations) return view
  const { rows: findings } = await pool.query(
    `SELECT f.*, g.text AS guideline_text, g.title AS guideline_title
     FROM findings f LEFT JOIN guidelines g ON g.brand_id = $2 AND g.rule_code = f.rule_code
     WHERE f.submission_id = $1 AND f.analysis_version = $3 ORDER BY f.id`,
    [row.id, row.brand_id, row.analysis_version],
  )
  const { rows: reviews } = await pool.query('SELECT * FROM reviews WHERE submission_id = $1 ORDER BY reviewed_at DESC', [row.id])
  const shapedFindings = findings.map(findingView)
  return { ...view, findings: shapedFindings, findings_count: shapedFindings.filter((item) => !item.advisory).length, review_history: reviews, reviews }
}

router.get('/health', asyncHandler(async (_req, res) => {
  let db = 'ok'
  try { await pool.query('SELECT 1') } catch { db = 'error' }
  let ai = 'not_configured'
  if (process.env.AI_SERVICE_URL) {
    try {
      const response = await fetch(new URL('/health', process.env.AI_SERVICE_URL), { signal: AbortSignal.timeout(2500) })
      ai = response.ok ? 'ok' : 'error'
    } catch { ai = 'error' }
  }
  const healthy = db === 'ok'
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', database: db, ai_service: ai, timestamp: new Date().toISOString() })
}))

router.get('/brands', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM brands ORDER BY name')
  res.json(rows)
}))

router.get('/brands/:id/guidelines', asyncHandler(async (req, res) => {
  res.json(await getGuidelines(parseId(req.params.id, 'brand id')))
}))
router.get('/guidelines', asyncHandler(async (req, res) => {
  if (!req.query.brand_id) throw new HttpError(422, 'brand_id is required.', 'VALIDATION_ERROR')
  res.json(await getGuidelines(parseId(req.query.brand_id, 'brand_id')))
}))

async function createGuideline(req, res) {
  const brandId = parseId(req.params.id || req.body.brand_id, 'brand_id')
  const { rule_code: ruleCode, type, text, config_json: config, title, category, active } = req.body
  if (!ruleCode || !type || typeof text !== 'string' || !text.trim()) throw new HttpError(422, 'rule_code, type, and text are required.', 'VALIDATION_ERROR')
  const { rows } = await pool.query(
    `INSERT INTO guidelines (brand_id, rule_code, type, text, config_json, title, category, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [brandId, ruleCode, type, text, JSON.stringify(config || {}), title || null, category || null, active !== false],
  )
  res.status(201).json(guidelineView(rows[0]))
}
router.post('/brands/:id/guidelines', asyncHandler(createGuideline))
router.post('/guidelines', asyncHandler(createGuideline))
router.put('/guidelines/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const { type, text, config_json: config, title, category, active } = req.body
  const { rows } = await pool.query(
    `UPDATE guidelines SET type=COALESCE($2,type), text=COALESCE($3,text),
      config_json=COALESCE($4::jsonb,config_json), title=COALESCE($5,title), category=COALESCE($6,category),
      active=COALESCE($7,active) WHERE id=$1 RETURNING *`,
    [id, type ?? null, text ?? null, config === undefined ? null : JSON.stringify(config), title ?? null, category ?? null, active ?? null],
  )
  if (!rows[0]) throw new HttpError(404, 'Guideline not found.', 'NOT_FOUND')
  res.json(guidelineView(rows[0]))
}))
router.delete('/guidelines/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE guidelines SET active=false WHERE id=$1', [parseId(req.params.id)])
  if (!rowCount) throw new HttpError(404, 'Guideline not found.', 'NOT_FOUND')
  res.json({ deleted: true })
}))

router.post('/submissions', asyncHandler(async (req, res) => {
  const { brand_id: brandId, content, content_type: contentType, title, platform } = req.body
  if (typeof content !== 'string' || content.length < 1 || content.length > 5000) throw new HttpError(422, 'content must contain between 1 and 5,000 characters.', 'VALIDATION_ERROR')
  if (!contentTypes.has(contentType)) throw new HttpError(422, 'content_type is invalid.', 'VALIDATION_ERROR')
  const brand = parseId(brandId, 'brand_id')
  const { rows } = await pool.query(
    `INSERT INTO submissions (brand_id, content, content_type, title, platform, status)
     VALUES ($1,$2,$3,$4,$5,'draft') RETURNING *`,
    [brand, content, contentType, title || null, platform || null],
  )
  res.status(201).json(await submissionView(rows[0]))
}))

router.post('/submissions/:id/analyze', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const result = await inTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [id])
    const submission = rows[0]
    if (!submission) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND')
    if (!['draft', 'analyzed'].includes(submission.status)) {
      throw new HttpError(409, 'Only draft or analyzed submissions can be analyzed.', 'INVALID_STATE')
    }
    const { rows: guidelineRows } = await client.query('SELECT * FROM guidelines WHERE brand_id=$1 AND active=true ORDER BY id', [submission.brand_id])
    const guidelines = guidelineRows.map(guidelineView)
    const ruleFindings = runRuleEngine(submission.content, guidelines, submission.content_type)
    const ai = await analyzeWithAI({ content: submission.content, guidelines, ruleFindings })
    const aiResult = ai.available ? validateAIResult(ai.data, submission.content, guidelines) : { findings: [], risk: null, rewrite: null }
    const findings = [...ruleFindings, ...aiResult.findings]
    const version = submission.analysis_version + 1
    const rewrite = aiResult.rewrite || submission.content
    await client.query('DELETE FROM findings WHERE submission_id=$1', [id])
    for (const finding of findings) await client.query(
      `INSERT INTO findings (submission_id, analysis_version, rule_code, source, category, severity, quoted_span, start_idx, end_idx, explanation, suggestion, advisory)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, version, finding.rule_code, finding.source, finding.category, finding.severity, finding.quoted_span, finding.start_idx, finding.end_idx, finding.explanation, finding.suggestion, finding.advisory],
    )
    const { rows: updated } = await client.query(
      `UPDATE submissions SET analysis_version=$2, status='analyzed', ml_risk_json=$3,
       suggested_rewrite=$4, updated_at=now() WHERE id=$1 RETURNING *`,
      [id, version, aiResult.risk === null ? null : JSON.stringify(aiResult.risk), rewrite],
    )
    return { submission: updated[0], findings, warnings: ai.warning ? [{ code: 'AI_UNAVAILABLE', message: ai.warning }] : [] }
  })
  const guidelines = await getGuidelines(result.submission.brand_id)
  const enriched = result.findings.map((finding) => {
    const guideline = guidelines.find((item) => item.rule_code === finding.rule_code)
    return { ...finding, start: finding.start_idx, end: finding.end_idx, guideline_text: guideline?.text || null, guideline_title: guideline?.title || null }
  })
  res.json({ ...(await submissionView(result.submission)), submission_id: result.submission.id, status: 'analyzed', original_content: result.submission.content, findings: enriched, gemini_findings: enriched.filter((finding) => finding.source === 'gemini'), suggested_rewrite: result.submission.suggested_rewrite, warnings: result.warnings })
}))

router.patch('/submissions/:id/rewrite', asyncHandler(async (req, res) => {
  const rewrite = req.body.edited_rewrite ?? req.body.rewrite
  if (typeof rewrite !== 'string' || rewrite.length > 5000) throw new HttpError(422, 'edited_rewrite must be a string of at most 5,000 characters.', 'VALIDATION_ERROR')
  const { rows } = await pool.query("UPDATE submissions SET edited_rewrite=$2, updated_at=now() WHERE id=$1 RETURNING *", [parseId(req.params.id), rewrite])
  if (!rows[0]) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND')
  res.json(await submissionView(rows[0]))
}))
router.post('/submissions/:id/submit', asyncHandler(async (req, res) => {
  const { rows } = await pool.query("UPDATE submissions SET status='pending_review', updated_at=now() WHERE id=$1 AND status='analyzed' RETURNING *", [parseId(req.params.id)])
  if (!rows[0]) {
    const exists = await pool.query('SELECT status FROM submissions WHERE id=$1', [Number(req.params.id)])
    if (!exists.rowCount) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND')
    throw new HttpError(409, 'Only analyzed submissions can be sent for review.', 'INVALID_STATE')
  }
  res.json(await submissionView(rows[0]))
}))
router.get('/submissions', asyncHandler(async (req, res) => {
  const conditions = []
  const values = []
  if (req.query.status) { values.push(req.query.status); conditions.push(`s.status=$${values.length}`) }
  if (req.query.q) { values.push(`%${String(req.query.q).slice(0, 160)}%`); conditions.push(`(s.title ILIKE $${values.length} OR s.content ILIKE $${values.length})`) }
  if (req.query.brand_id) { values.push(parseId(req.query.brand_id, 'brand_id')); conditions.push(`s.brand_id=$${values.length}`) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(`SELECT s.*, b.name AS brand_name,
    (SELECT count(*)::int FROM findings f WHERE f.submission_id=s.id AND f.analysis_version=s.analysis_version AND f.advisory=false) AS findings_count
    FROM submissions s JOIN brands b ON b.id=s.brand_id ${where} ORDER BY s.created_at DESC LIMIT 250`, values)
  res.json(rows)
}))
router.get('/submissions/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM submissions WHERE id=$1', [parseId(req.params.id)])
  if (!rows[0]) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND')
  res.json(await submissionView(rows[0], true))
}))

async function recordReview(id, body) {
  const { decision, comment = null, reviewer_name: reviewerName = 'Reviewer', client_request_id: requestId = null } = body
  if (!Object.hasOwn(decisions, decision)) throw new HttpError(422, 'decision must be approve, reject, or request_changes.', 'VALIDATION_ERROR')
  return inTransaction(async (client) => {
    if (requestId) {
      const prior = await client.query('SELECT * FROM reviews WHERE submission_id=$1 AND client_request_id=$2', [id, requestId])
      if (prior.rows[0]) return { review: prior.rows[0], idempotent: true }
    }
    const { rows } = await client.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [id])
    if (!rows[0]) throw new HttpError(404, 'Submission not found.', 'NOT_FOUND')
    if (rows[0].status !== 'pending_review') throw new HttpError(409, 'Only pending_review submissions can be reviewed.', 'INVALID_STATE')
    const inserted = await client.query(
      `INSERT INTO reviews (submission_id, decision, comment, reviewer_name, client_request_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`, [id, decision, comment, reviewerName, requestId],
    )
    await client.query('UPDATE submissions SET status=$2, updated_at=now() WHERE id=$1', [id, decisions[decision]])
    return { review: inserted.rows[0], idempotent: false }
  })
}
router.post('/submissions/:id/review', asyncHandler(async (req, res) => {
  const response = await recordReview(parseId(req.params.id), req.body)
  res.status(response.idempotent ? 200 : 201).json(response.review)
}))

router.get('/reviews', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, b.name AS brand_name,
       (SELECT count(*)::int FROM findings f WHERE f.submission_id=s.id AND f.analysis_version=s.analysis_version AND f.advisory=false) AS findings_count
     FROM submissions s JOIN brands b ON b.id=s.brand_id
     WHERE s.status='pending_review' ORDER BY s.updated_at DESC LIMIT 250`,
  )
  res.json(rows)
}))
router.post('/reviews/:id/decision', asyncHandler(async (req, res) => {
  const submissionId = parseId(req.params.id, 'submission id')
  const response = await recordReview(submissionId, req.body)
  res.status(response.idempotent ? 200 : 201).json(response.review)
}))

export default router
