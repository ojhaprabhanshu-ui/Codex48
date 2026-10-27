import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronRight, FileSearch2, LoaderCircle, RotateCcw, Send, ShieldAlert, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'
import ErrorState from '../components/common/ErrorState'
import EmptyState from '../components/common/EmptyState'
import StatusBadge from '../components/common/StatusBadge'
import FindingCard from '../components/analyzer/FindingCard'
import HighlightedContent from '../components/analyzer/HighlightedContent'
import RiskIndicator from '../components/analyzer/RiskIndicator'
import { getSubmission, submitForReview, updateSubmission } from '../services/submissionsApi'
import { getAnalysis, analyzeSubmission } from '../services/analysisApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

function dateTime(value) {
  if (!value) return 'Time not supplied'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time not supplied' : date.toLocaleString()
}

async function fetchAnalysisRecord(id) {
  let record
  try { record = await getSubmission(id) } catch { record = null }
  let result
  if (record) {
    const analysisId = record.analysis?.id || record.latest_analysis_id || record.analysis_id
    try { result = await getAnalysis(analysisId || id) } catch { result = await getAnalysis(id) }
  } else {
    result = await getAnalysis(id)
  }
  return { submission: record || result, analysis: result }
}

export default function AnalysisDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [citation, setCitation] = useState(null)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) { setLoading(true); setError('') }
    try {
      const data = await fetchAnalysisRecord(id)
      setSubmission(data.submission)
      setAnalysis(data.analysis)
      setContent(data.analysis.original_content || data.analysis.content_snapshot || data.submission.content || '')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let alive = true
    fetchAnalysisRecord(id).then((data) => {
      if (alive) {
        setSubmission(data.submission)
        setAnalysis(data.analysis)
        setContent(data.analysis.original_content || data.analysis.content_snapshot || data.submission.content || '')
      }
    }).catch((requestError) => { if (alive) setError(getApiErrorMessage(requestError)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  async function saveAndAnalyze() {
    if (!submission?.id || !content.trim() || content.trim().length > 5000) {
      setError('Enter content between 1 and 5,000 characters before re-analyzing.')
      return
    }
    setSaving(true)
    setLoading(true)
    setError('')
    try {
      const updated = await updateSubmission(submission.id, { content: content.trim() })
      setSubmission(updated)
      setAnalysis(null)
      const response = await analyzeSubmission(submission.id)
      const result = response?.analysis || response?.data?.analysis || response?.data || response
      const refreshed = await getSubmission(submission.id).catch(() => ({ ...submission, content: content.trim(), status: 'analyzed' }))
      setSubmission(refreshed)
      setAnalysis({ ...result, original_content: content.trim() })
      setContent(content.trim())
      setEditing(false)
      toast.success(USE_MOCK_API ? 'New demo analysis version saved' : 'New analysis version saved')
      navigate('/analysis/' + encodeURIComponent(submission.id), { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      toast.error(getApiErrorMessage(requestError))
    } finally { setSaving(false); setLoading(false) }
  }

  async function sendToReview() {
    if (!submission?.id) return
    setSaving(true)
    setError('')
    try {
      const updated = await submitForReview(submission.id)
      setSubmission(updated)
      toast.success(USE_MOCK_API ? 'Added to the demo review queue' : 'Sent for review')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      toast.error(getApiErrorMessage(requestError))
    } finally { setSaving(false) }
  }

  const allFindings = analysis?.findings || []
  const ruleFindings = allFindings.filter((finding) => !['gemini', 'llm'].includes(String(finding.source || '').toLowerCase()))
  const geminiFindings = analysis?.gemini_findings || allFindings.filter((finding) => ['gemini', 'llm'].includes(String(finding.source || '').toLowerCase()))
  const versions = submission?.analysis_history || []
  const displayVersions = versions.length ? versions : analysis?.fixture_only ? [] : [analysis]
  const canSend = submission?.status === 'analyzed'

  return (
    <div>
      {loading ? <div className="rounded-2xl border border-line bg-surface p-8 text-sm text-secondary">Loading analysis…</div> : error && !analysis ? <ErrorState message={error} onRetry={load} /> : !analysis ? (
        <EmptyState title="Analysis is unavailable" description={error || 'This submission does not have a saved analysis.'} action={<Link to="/history" className="text-xs font-semibold text-accent">Return to history</Link>} />
      ) : <>
        <PageHeader
          eyebrow="Saved analysis"
          title={submission.title || 'Untitled submission'}
          description={`${submission.brand?.name || 'Brand'} · ${submission.id} · version ${analysis.version || 1} · ${dateTime(analysis.created_at)}`}
          action={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={submission.status} /><Link to="/history" className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-secondary hover:bg-canvas">History <ChevronRight size={14} /></Link></div>}
        />

        {USE_MOCK_API && <div className="notice-warning mb-5 rounded-2xl border px-4 py-3 text-xs leading-5"><strong>Demo analysis.</strong> Deterministic sample rules only; no ML classifier or Gemini request was made.</div>}
        {error && <div className="mb-5"><ErrorState compact message={error} /></div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-semibold text-ink">Rule engine findings</h2><p className="mt-1 text-xs text-secondary">Each finding shows the cited rule and any quoted span.</p></div>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-medium text-secondary">{ruleFindings.length} findings</span>
              </div>
              {ruleFindings.length ? <div className="mt-4 space-y-3">{ruleFindings.map((finding, index) => <FindingCard key={finding.id || index} finding={finding} onViewGuideline={setCitation} />)}</div> : <p className="notice-success mt-4 rounded-xl border px-3.5 py-3 text-xs">No deterministic rule findings were returned.</p>}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <h2 className="text-sm font-semibold text-ink">Original content</h2>
              <p className="mt-1 text-xs text-secondary">Highlighted spans refer to rule engine findings.</p>
              <div className="mt-4 rounded-xl bg-canvas p-4"><HighlightedContent content={analysis.original_content || analysis.content_snapshot || submission.content || ''} findings={ruleFindings} /></div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-semibold text-ink">Version history</h2><p className="mt-1 text-xs text-secondary">Open a previous saved analysis version.</p></div>
                <span className="text-[10px] text-muted">{versions.length || 1} version{(versions.length || 1) === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-4 space-y-2">
                {displayVersions.length === 0 && <p className="rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-secondary">This sample result is generated from the fixture rules; no saved analysis version is attached to this record.</p>}
                {displayVersions.slice().reverse().map((version, index) => {
                  const target = versions.length ? (version.id || submission.id) : submission.id
                  return <Link key={target} to={'/analysis/' + encodeURIComponent(target)} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 hover:bg-canvas">
                    <span><span className="block text-xs font-semibold text-ink">Version {version.version || versions.length - index || 1}{target === id ? ' · current' : ''}</span><span className="mt-1 block text-[10px] text-muted">{dateTime(version.created_at)}</span></span>
                    <ChevronRight size={15} className="text-muted" aria-hidden="true" />
                  </Link>
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold text-ink">ML risk signal</h2>
              <p className="mt-1 text-xs text-secondary">Advisory only; it does not cite a brand rule.</p>
              <div className="mt-4"><RiskIndicator risk={analysis.ml_risk || null} /></div>
            </section>
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2"><Sparkles size={15} className="text-accent" /><h2 className="text-sm font-semibold text-ink">Gemini contextual findings</h2></div>
              {geminiFindings.length ? <div className="mt-4 space-y-3">{geminiFindings.map((finding, index) => <FindingCard key={finding.id || index} finding={{ ...finding, source: 'gemini' }} onViewGuideline={setCitation} />)}</div> : <p className="mt-3 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-secondary">{USE_MOCK_API ? 'Unavailable in fixture mode. Gemini was not called.' : 'No Gemini findings were included in this analysis.'}</p>}
            </section>
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2"><FileSearch2 size={15} className="text-accent" /><h2 className="text-sm font-semibold text-ink">Edit and re-analyze</h2></div>
              {!editing ? <>
                <p className="mt-2 text-xs leading-5 text-secondary">Make a revised draft and save another version of this submission’s analysis.</p>
                <button type="button" onClick={() => setEditing(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-xs font-semibold text-secondary hover:bg-canvas"><RotateCcw size={14} /> Edit draft</button>
              </> : <>
                <label htmlFor="analysis-edit" className="mt-3 block text-xs font-semibold text-ink">Revised content</label>
                <textarea id="analysis-edit" value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} className="field-control mt-2 min-h-36 resize-y leading-6" />
                <p className="mt-1 text-right text-[10px] text-muted">{content.length} / 5,000</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setEditing(false); setContent(analysis.original_content || analysis.content_snapshot || submission.content || '') }} disabled={saving} className="h-9 rounded-xl border border-line px-3 text-xs font-semibold text-secondary">Cancel</button>
                  <button type="button" onClick={saveAndAnalyze} disabled={saving || !content.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />} Save and re-analyze</button>
                </div>
              </>}
            </section>
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-accent" /><h2 className="text-sm font-semibold text-ink">Human review</h2></div>
              <p className="mt-2 text-xs leading-5 text-secondary">A human reviewer makes the approval decision. The analysis itself does not approve content.</p>
              {submission.status === 'pending_review' ? <Link to={'/reviews/' + encodeURIComponent(submission.id)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-semibold text-white">View review queue <ChevronRight size={14} /></Link>
                : canSend && <button type="button" onClick={sendToReview} disabled={saving} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50"><Send size={14} /> {saving ? 'Sending…' : 'Send to review'}</button>}
              {['approved', 'rejected', 'changes_requested'].includes(submission.status) && <p className="notice-info mt-3 rounded-xl border px-3 py-2.5 text-xs">Current human review status: {submission.status.replaceAll('_', ' ')}.</p>}
            </section>
            <div className="flex items-center gap-2 text-xs text-secondary"><ShieldAlert size={14} /><span>See <Link to="/guidelines" className="font-semibold text-accent hover:underline">brand guidelines</Link> for the full active rule set.</span></div>
          </div>
        </div>
      </>}

      {citation && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCitation(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="guideline-dialog-title" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-elevated">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent">Cited guideline</p>
          <h2 id="guideline-dialog-title" className="mt-1 text-base font-semibold text-ink">{citation.rule_code || citation.rule_id || citation.guideline_id || 'Guideline source'}</h2>
          <p className="mt-3 text-sm font-semibold text-ink">{citation.guideline_title || 'Brand rule'}</p>
          <p className="mt-2 rounded-xl bg-canvas p-3.5 text-sm leading-6 text-secondary">{citation.guideline_text || 'The API did not include the original guideline wording.'}</p>
          <div className="mt-4 flex justify-between"><Link to="/guidelines" className="text-xs font-semibold text-accent hover:underline">Open guideline library</Link><button type="button" onClick={() => setCitation(null)} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-secondary">Close</button></div>
        </section>
      </div>}
    </div>
  )
}
