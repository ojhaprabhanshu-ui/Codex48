import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ClipboardCheck, RefreshCw, RotateCcw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import PageHeader from '../components/common/PageHeader'
import { getApiErrorMessage } from '../services/apiClient'
import { decideReview, getReviews } from '../services/reviewsApi'

const decisions = [
  { value: 'approve', label: 'Approve', icon: Check, style: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  { value: 'request_changes', label: 'Request changes', icon: RotateCcw, style: 'border border-line bg-surface text-secondary hover:bg-canvas' },
  { value: 'reject', label: 'Reject', icon: X, style: 'bg-rose-600 text-white hover:bg-rose-700' },
]

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `review-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [comments, setComments] = useState({})
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getReviews()
      setReviews(Array.isArray(result) ? result : result?.items || result?.reviews || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function submitDecision(submission, decision) {
    setProcessingId(submission.id)
    setError('')
    try {
      await decideReview(submission.id, {
        decision,
        comment: comments[submission.id]?.trim() || null,
        reviewer_name: 'Reviewer',
        client_request_id: requestId(),
      })
      setReviews((current) => current.filter((item) => item.id !== submission.id))
      toast.success(decision === 'request_changes' ? 'Changes requested' : `Submission ${decision === 'approve' ? 'approved' : 'rejected'}`)
    } catch (requestError) {
      const message = getApiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        eyebrow="Reviewer workspace"
        title="Review submitted content."
        description="Check the latest analysis, leave a note, and record a decision for each submission."
        action={(
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-secondary hover:bg-canvas disabled:opacity-50">
            <RefreshCw size={14} aria-hidden="true" /> Refresh queue
          </button>
        )}
      />
      {error && <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>}
      {loading ? <LoadingSkeleton rows={4} /> : reviews.length === 0 ? (
        <EmptyState title="The review queue is clear" description="Submissions will appear here after they are analyzed and sent for review." />
      ) : (
        <div className="space-y-4">
          {reviews.map((submission) => (
            <article key={submission.id} className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{submission.brand_name || submission.brand?.name || 'Brand'}</p>
                  <h2 className="mt-1 text-base font-semibold text-ink">{submission.title || 'Untitled submission'}</h2>
                  <p className="mt-1 text-xs text-muted">{submission.content_type?.replaceAll('_', ' ')}{submission.platform ? ` · ${submission.platform}` : ''}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">{submission.findings_count ?? 0} findings</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-canvas p-4 text-sm leading-6 text-secondary">{submission.content}</p>
              <label className="mt-4 block text-xs font-semibold text-ink" htmlFor={`review-comment-${submission.id}`}>Reviewer note <span className="font-normal text-muted">(optional)</span></label>
              <textarea
                id={`review-comment-${submission.id}`}
                value={comments[submission.id] || ''}
                onChange={(event) => setComments((current) => ({ ...current, [submission.id]: event.target.value }))}
                maxLength={5000}
                rows={2}
                className="field-control mt-2 min-h-20 resize-y"
                placeholder="Add context for the decision…"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {decisions.map(({ value, label, icon: Icon, style }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submitDecision(submission, value)}
                    disabled={processingId !== null}
                    className={'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ' + style}
                  >
                    <Icon size={13} aria-hidden="true" /> {processingId === submission.id ? 'Saving…' : label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-muted"><ClipboardCheck size={14} aria-hidden="true" /> Decisions are saved to the submission review history.</div>
    </motion.div>
  )
}
