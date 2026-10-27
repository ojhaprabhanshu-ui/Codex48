import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, FileCheck2, FileSearch2, Plus, ShieldAlert, Sparkles, Clock3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/useAppContext'
import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { getSubmissions } from '../services/submissionsApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

function normalizeList(response) {
  if (Array.isArray(response)) return response
  return response?.submissions || response?.items || response?.data || []
}

function localDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function makeTrend(submissions) {
  const days = []
  const today = new Date()
  for (let daysBack = 6; daysBack >= 0; daysBack -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - daysBack)
    const key = localDateKey(date)
    const items = submissions.filter((item) => item.created_at && localDateKey(new Date(item.created_at)) === key)
    days.push({
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      submissions: items.length,
      flagged: items.filter((item) => Number(item.findings_count ?? item.findings?.length ?? 0) > 0).length,
    })
  }
  return days
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { activeBrand, activeBrandId } = useAppContext()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getSubmissions(activeBrandId ? { brand_id: activeBrandId } : undefined)
      setSubmissions(normalizeList(response))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [activeBrandId])

  useEffect(() => {
    let alive = true
    getSubmissions(activeBrandId ? { brand_id: activeBrandId } : undefined)
      .then((response) => {
        if (alive) {
          setError('')
          setSubmissions(normalizeList(response))
        }
      })
      .catch((requestError) => {
        if (alive) setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [activeBrandId])

  const total = submissions.length
  const pending = submissions.filter((item) => item.status === 'pending_review').length
  const approved = submissions.filter((item) => item.status === 'approved' || item.review_decision === 'approve').length
  const rejected = submissions.filter((item) => item.status === 'rejected' || item.review_decision === 'reject').length
  const flagged = submissions.filter((item) => Number(item.findings_count ?? item.findings?.length ?? 0) > 0).length
  const trend = useMemo(() => makeTrend(submissions), [submissions])
  const hasTrend = trend.some((point) => point.submissions > 0)

  return (
    <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        eyebrow="Brand compliance overview"
        title="Welcome back."
        description={'A clear view of content checks and review activity for ' + (activeBrand?.name || 'your active brand') + '.'}
        action={<div className="flex flex-wrap gap-2"><Link to="/analyze" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-900/10 transition hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Plus size={15} aria-hidden="true" /> Analyze new content</Link><Link to="/reviews" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-secondary hover:bg-canvas"><Clock3 size={14} aria-hidden="true" /> Review queue</Link></div>}
      />

      {USE_MOCK_API && (
        <div className="notice-warning mb-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-5">
          <Sparkles size={15} className="notice-warning-strong mt-0.5 shrink-0" aria-hidden="true" />
          <p><strong>Development sample data.</strong> The figures and recent records below are illustrative fixtures, not live compliance metrics.</p>
        </div>
      )}

      {error && <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total submissions" value={loading ? '—' : total} note={USE_MOCK_API ? 'Development sample records' : 'Returned by the submissions API'} icon={FileCheck2} tone="violet" />
        <StatCard label="Pending reviews" value={loading ? '—' : pending} note="Awaiting a human decision" icon={Clock3} tone="amber" />
        <StatCard label="Approved" value={loading ? '—' : approved} note="Confirmed by a reviewer" icon={CheckCircle2} tone="green" />
        <StatCard label="Rejected" value={loading ? '—' : rejected} note="Recorded human decisions" icon={ShieldAlert} tone="rose" />
        <StatCard label="With findings" value={loading ? '—' : flagged} note="One or more reported findings" icon={ShieldAlert} tone="rose" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="trend-title">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 id="trend-title" className="text-sm font-semibold text-ink">Submission activity</h2>
              <p className="mt-1 text-xs text-secondary">Content checked and items with findings · last 7 days</p>
            </div>
            <span className="rounded-lg bg-canvas px-2.5 py-1 text-[10px] font-medium text-muted">Daily</span>
          </div>
          {loading ? <LoadingSkeleton rows={3} /> : hasTrend ? (
            <div className="h-[235px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="submissionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6658e8" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6658e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 10 }} dy={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 10 }} dx={-2} />
                  <Tooltip contentStyle={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', color: 'var(--ink)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#6658e8" strokeWidth={2.2} fill="url(#submissionFill)" />
                  <Area type="monotone" dataKey="flagged" name="With findings" stroke="#e8767b" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No activity to chart yet" description="Submission activity will appear here when the active brand has records." />
          )}
        </section>

        <section className="callout-panel relative overflow-hidden rounded-2xl border border-line p-6 shadow-card">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className="callout-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium text-accent">
              <Sparkles size={12} aria-hidden="true" /> Ready for a review
            </span>
            <h2 className="mt-5 max-w-xs text-[22px] font-semibold leading-7 tracking-[-0.03em]">Make the next post your most confident one.</h2>
            <p className="callout-secondary mt-2 max-w-xs text-xs leading-5">Check your draft against the active brand’s guidelines before it goes to review.</p>
            <Link to="/analyze" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-surface px-3.5 text-xs font-semibold text-ink transition hover:bg-canvas">
              <FileSearch2 size={15} aria-hidden="true" /> Start a content check <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/guidelines" className="callout-secondary mt-4 flex items-center gap-1.5 text-[11px] font-medium hover:text-accent">
              Browse brand guidelines <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="recent-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="recent-title" className="text-sm font-semibold text-ink">Recent submissions</h2>
            <p className="mt-1 text-xs text-secondary">Latest activity for {activeBrand?.name || 'the active brand'}</p>
          </div>
          <span className="text-[10px] font-medium text-muted">Latest {Math.min(5, submissions.length)}</span>
        </div>
        {loading ? <div className="p-5"><LoadingSkeleton rows={3} /></div> : submissions.length === 0 ? (
          <div className="p-5"><EmptyState title="No submissions yet" description="Analyze a draft to start building a review history." action={<Link to="/analyze" className="text-xs font-semibold text-accent hover:underline">Analyze content</Link>} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-canvas/70 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
                <tr><th className="px-6 py-3">Submission</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3">Findings</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Submitted</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissions.slice(0, 5).map((item) => (
                  <tr key={item.id} className="transition hover:bg-canvas/50">
                    <td className="px-6 py-3.5"><Link to={'/history/' + encodeURIComponent(item.id)} className="text-xs font-semibold text-ink hover:text-accent">{item.title || 'Untitled submission'}</Link><p className="mt-1 text-[10px] text-muted">{item.id}</p></td>
                    <td className="px-4 py-3.5 text-xs text-secondary">{item.platform || item.content_type || '—'}</td>
                    <td className="px-4 py-3.5"><span className="text-xs font-medium text-ink">{item.findings_count ?? item.findings?.length ?? 0}</span></td>
                    <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                    <td className="px-6 py-3.5 text-right text-xs text-secondary">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted">
        <ShieldAlert size={12} aria-hidden="true" />
        <span>AI analysis supports review; only a human reviewer can approve content.</span>
      </div>
    </motion.div>
  )
}
