import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, CheckCheck, Clock3, MessageSquareText, RefreshCw, Search, ShieldAlert, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import FindingCard from '../components/analyzer/FindingCard'
import HighlightedContent from '../components/analyzer/HighlightedContent'
import { getSubmissions } from '../services/submissionsApi'
import { getAnalysis } from '../services/analysisApi'
import { decideReview, getReviews } from '../services/reviewsApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

const reviewStatuses = ['pending_review', 'approved', 'rejected', 'changes_requested']
const decisionDetails = {
  approve: { label: 'Approve', title: 'Approve this submission?', description: 'Confirm the human review decision for this submission.', status: 'approved' },
  reject: { label: 'Reject', title: 'Reject this submission?', description: 'Add a reviewer comment explaining why this content is rejected.', status: 'rejected' },
  request_changes: { label: 'Request changes', title: 'Request changes?', description: 'Add a comment describing what the brand team should update.', status: 'changes_requested' },
}

function listFrom(response) { return Array.isArray(response) ? response : response?.submissions || response?.reviews || response?.items || response?.data || [] }

export default function ReviewQueuePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [dialogDecision, setDialogDecision] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) { setLoading(true); setError('') }
    try {
      const [reviewResponse, submissionResponse] = await Promise.all([getReviews(), getSubmissions()])
      const pending = listFrom(reviewResponse).map((item) => item.submission || item)
      const reviewed = listFrom(submissionResponse).filter((item) => ['approved', 'rejected', 'changes_requested'].includes(item.status))
      setSubmissions([...pending, ...reviewed].filter((item, index, list) => reviewStatuses.includes(item.status) && list.findIndex((other) => String(other.id) === String(item.id)) === index).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    } catch (requestError) { setError(getApiErrorMessage(requestError)) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([getReviews(), getSubmissions()]).then(([reviewResponse, submissionResponse]) => {
      const pending = listFrom(reviewResponse).map((item) => item.submission || item)
      const reviewed = listFrom(submissionResponse).filter((item) => ['approved', 'rejected', 'changes_requested'].includes(item.status))
      const queue = [...pending, ...reviewed].filter((item, index, list) => reviewStatuses.includes(item.status) && list.findIndex((other) => String(other.id) === String(item.id)) === index).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      if (alive) setSubmissions(queue)
    }).catch((requestError) => { if (alive) setError(getApiErrorMessage(requestError)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const brands = useMemo(() => [...new Map(submissions.map((item) => [item.brand_id, item.brand]).filter(([, brand]) => brand).entries())], [submissions])
  const filtered = useMemo(() => submissions.filter((item) => {
    const matchesBrand = brandFilter === 'all' || String(item.brand_id) === String(brandFilter)
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [item.title, item.id, item.content, item.brand?.name].some((value) => String(value || '').toLowerCase().includes(query))
    return matchesBrand && matchesStatus && matchesSearch
  }), [submissions, brandFilter, statusFilter, search])
  const selected = submissions.find((item) => String(item.id) === String(id)) || null

  useEffect(() => {
    let alive = true
    if (!id) return undefined
    getAnalysis(id).then((result) => { if (alive) setAnalysis(result) }).catch(() => { if (alive) setAnalysis(null) })
    return () => { alive = false }
  }, [id])

  function beginDecision(decision) {
    setComment('')
    setDialogDecision(decision)
  }

  async function confirmDecision() {
    if (!selected || !dialogDecision) return
    if (['reject', 'request_changes'].includes(dialogDecision) && !comment.trim()) {
      toast.error('A reviewer comment is required for this decision.')
      return
    }
    setSaving(true)
    try {
      const updated = await decideReview(selected.id, { decision: dialogDecision, comment: comment.trim() })
      setSubmissions((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item))
      setDialogDecision(null)
      toast.success('Review decision saved')
      await load()
      if (statusFilter === 'pending_review') navigate('/reviews')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      toast.error(getApiErrorMessage(requestError))
    } finally { setSaving(false) }
  }

  const modal = dialogDecision ? decisionDetails[dialogDecision] : null
  const findings = analysis?.findings || []

  return (
    <div>
      <PageHeader eyebrow="Human review" title="Review queue" description="Review submitted content and its cited findings before recording a human decision." action={<button type="button" onClick={load} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-secondary hover:bg-canvas"><RefreshCw size={14} /> Refresh</button>} />
      {USE_MOCK_API && <div className="notice-warning mb-5 rounded-2xl border px-4 py-3 text-xs leading-5"><strong>Demo review workflow.</strong> Fixture decisions are stored in this browser as demo data.</div>}
      {error && <div className="mb-5"><ErrorState compact message={error} onRetry={load} /></div>}

      <section className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_190px_190px]">
          <label className="relative block"><span className="sr-only">Search submissions</span><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, content or ID" className="field-control search-field-control h-10 w-full pl-12 pr-4" /></label>
          <label><span className="sr-only">Filter by brand</span><select className="field-control h-10" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}><option value="all">All brands</option>{brands.map(([brandId, brand]) => <option key={brandId} value={brandId}>{brand.name}</option>)}</select></label>
          <label><span className="sr-only">Filter by status</span><select className="field-control h-10" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="pending_review">Pending review</option><option value="all">All review statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="changes_requested">Changes requested</option></select></label>
        </div>
      </section>

      {loading ? <LoadingSkeleton rows={5} /> : filtered.length === 0 && !selected ? <EmptyState title="No matching review submissions" description={statusFilter === 'pending_review' ? 'There are no pending items that match these filters.' : 'Try changing the search or filters.'} action={<Link to="/analyze" className="text-xs font-semibold text-accent">Analyze content</Link>} /> : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-label="Submissions">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5"><h2 className="text-xs font-semibold text-ink">Submissions</h2><span className="text-[10px] text-muted">{filtered.length} item{filtered.length === 1 ? '' : 's'}</span></div>
            <div className="divide-y divide-line">
              {filtered.map((item) => <Link key={item.id} to={'/reviews/' + encodeURIComponent(item.id)} className={'block px-4 py-4 transition hover:bg-canvas ' + (String(item.id) === String(id) ? 'bg-accent-soft/60' : '')}>
                <div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-ink">{item.title || 'Untitled submission'}</span><span className="mt-1 block text-[10px] text-muted">{item.brand?.name || item.brand_id} · {item.id}</span></span><StatusBadge status={item.status} /></div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-secondary"><span>{item.findings_count || 0} cited finding{item.findings_count === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-1"><Clock3 size={11} /> {item.platform || item.content_type || 'No platform'}</span></div>
              </Link>)}
              {filtered.length === 0 && <p className="p-5 text-xs text-secondary">No submissions match these filters.</p>}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-live="polite">
            {!selected ? <EmptyState title="Select a submission" description="Choose an item from the queue to inspect its content and cited findings." /> : <>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent">{selected.brand?.name || selected.brand_id} · {selected.id}</p><h2 className="mt-1 text-base font-semibold text-ink">{selected.title || 'Untitled submission'}</h2><p className="mt-1 text-xs text-secondary">{selected.platform || selected.content_type || 'Content'} · submitted {selected.created_at ? new Date(selected.created_at).toLocaleString() : 'date not supplied'}</p></div><StatusBadge status={selected.status} /></div>
              {selected.content && <div className="mt-5 rounded-xl border border-line bg-canvas p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Submitted content</p><HighlightedContent content={selected.content} findings={findings} /></div>}
              <div className="mt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-ink">Cited findings</h3><span className="text-[10px] text-muted">{findings.length}</span></div>
                {findings.length ? <div className="space-y-3">{findings.map((finding, index) => <FindingCard key={finding.id || index} finding={finding} />)}</div> : <p className="rounded-xl bg-canvas px-3.5 py-3 text-xs leading-5 text-secondary">{analysis ? 'No deterministic rule findings were returned.' : 'No analysis details are attached to this submission.'}</p>}
              </div>
              {selected.reviewer_comment && <div className="notice-info mt-5 rounded-xl border p-3.5"><p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"><MessageSquareText size={13} /> Reviewer comment</p><p className="mt-1 text-xs leading-5">{selected.reviewer_comment}</p></div>}
              <div className="mt-5 border-t border-line pt-4">
                {selected.status === 'pending_review' ? <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => beginDecision('approve')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"><Check size={14} /> Approve</button>
                  <button type="button" onClick={() => beginDecision('request_changes')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-xs font-semibold text-secondary hover:bg-canvas"><MessageSquareText size={14} /> Request changes</button>
                  <button type="button" onClick={() => beginDecision('reject')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-danger-border px-3 text-xs font-semibold text-danger-ink hover:bg-danger-bg"><X size={14} /> Reject</button>
                </div> : <div className="flex items-center gap-2 text-xs text-secondary"><CheckCheck size={15} /> This submission already has a human review decision.</div>}
                <Link to={'/analysis/' + encodeURIComponent(selected.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Open full analysis <ShieldAlert size={13} /></Link>
              </div>
            </>}</section>
        </div>
      )}

      <ConfirmDialog open={Boolean(modal)} title={modal?.title} description={modal?.description} confirmLabel={modal?.label} danger={dialogDecision === 'reject'} busy={saving} onClose={() => { setDialogDecision(null); setComment('') }} onConfirm={confirmDecision}>
        {['reject', 'request_changes'].includes(dialogDecision) && <label className="block text-xs font-semibold text-ink">Reviewer comment <span className="text-rose-600">Required</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} placeholder="Explain what needs attention…" className="field-control mt-2 resize-y" /><span className="mt-1 block text-right text-[10px] font-normal text-muted">{comment.length} / 1,000</span></label>}
      </ConfirmDialog>
    </div>
  )
}
