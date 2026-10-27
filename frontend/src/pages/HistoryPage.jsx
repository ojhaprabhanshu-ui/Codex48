import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Clock3, ExternalLink, Search } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { getSubmissions } from '../services/submissionsApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

function listFrom(response) { return Array.isArray(response) ? response : response?.submissions || response?.items || response?.data || [] }
function when(value) {
  if (!value) return 'Date not supplied'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not supplied' : date.toLocaleString()
}

export default function HistoryPage() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [brand, setBrand] = useState('all')
  const [sortDirection, setSortDirection] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setItems(listFrom(await getSubmissions())) } catch (requestError) { setError(getApiErrorMessage(requestError)) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let alive = true
    getSubmissions().then((response) => { if (alive) setItems(listFrom(response)) }).catch((requestError) => { if (alive) setError(getApiErrorMessage(requestError)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const brands = useMemo(() => [...new Map(items.filter((item) => item.brand).map((item) => [item.brand_id, item.brand])).entries()], [items])
  const visible = useMemo(() => items.filter((item) => {
    const query = search.trim().toLowerCase()
    return (status === 'all' || item.status === status) && (brand === 'all' || String(item.brand_id) === String(brand)) && (!query || [item.title, item.id, item.content, item.brand?.name].some((value) => String(value || '').toLowerCase().includes(query)))
  }).sort((a, b) => (new Date(a.created_at) - new Date(b.created_at)) * (sortDirection === 'asc' ? 1 : -1)), [items, search, status, brand, sortDirection])
  const selected = visible.find((item) => String(item.id) === String(id)) || items.find((item) => String(item.id) === String(id)) || null

  return <div>
    <PageHeader eyebrow="Submission records" title="History" description="Search submissions, inspect saved analysis versions, and see review records returned by the data source." action={<button type="button" onClick={load} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-secondary hover:bg-canvas"><Clock3 size={14} /> Refresh</button>} />
    {USE_MOCK_API && <div className="notice-warning mb-5 rounded-2xl border px-4 py-3 text-xs leading-5"><strong>Demo history.</strong> Fixture items and any changes made in this browser are sample data.</div>}
    {error && <div className="mb-5"><ErrorState compact message={error} onRetry={load} /></div>}

    <section className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_180px_180px_auto]">
        <label className="relative block"><span className="sr-only">Search history</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="field-control h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, content or ID" /></label>
        <label><span className="sr-only">Filter status</span><select className="field-control h-10" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['submitted', 'analyzed', 'pending_review', 'approved', 'rejected', 'changes_requested', 'failed'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        <label><span className="sr-only">Filter brand</span><select className="field-control h-10" value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">All brands</option>{brands.map(([brandId, item]) => <option key={brandId} value={brandId}>{item.name}</option>)}</select></label>
        <button type="button" onClick={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line px-3 text-xs font-semibold text-secondary hover:bg-canvas" aria-label={'Sort by date ' + (sortDirection === 'desc' ? 'oldest first' : 'newest first')}>{sortDirection === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />} Date</button>
      </div>
    </section>

    {loading ? <LoadingSkeleton rows={5} /> : visible.length === 0 ? <EmptyState title="No submissions found" description="Try a different search or filter, or analyze content to start a history." action={<Link to="/analyze" className="text-xs font-semibold text-accent">Analyze content</Link>} /> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-xs font-semibold text-ink">Submissions</h2><span className="text-[10px] text-muted">{visible.length} records</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left">
          <thead className="bg-canvas text-[10px] font-semibold uppercase tracking-[0.1em] text-muted"><tr><th className="px-5 py-3">Submission</th><th className="px-3 py-3">Brand</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Findings</th><th className="px-5 py-3 text-right">Updated</th></tr></thead>
          <tbody className="divide-y divide-line">{visible.map((item) => <tr key={item.id} className={'transition hover:bg-canvas ' + (item.id === id ? 'bg-accent-soft/50' : '')}>
            <td className="px-5 py-3.5"><Link to={'/history/' + encodeURIComponent(item.id)} className="block text-xs font-semibold text-ink hover:text-accent">{item.title || 'Untitled submission'}</Link><span className="mt-1 block text-[10px] text-muted">{item.id} · {item.version_count ? `${item.version_count} saved version${item.version_count === 1 ? '' : 's'}` : 'no saved analysis version'}</span></td>
            <td className="px-3 py-3.5 text-xs text-secondary">{item.brand?.name || item.brand_id || '—'}</td><td className="px-3 py-3.5"><StatusBadge status={item.status} /></td><td className="px-3 py-3.5 text-xs text-secondary">{item.findings_count ?? 0}</td><td className="px-5 py-3.5 text-right text-xs text-secondary">{when(item.updated_at || item.reviewed_at || item.created_at)}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <aside className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        {selected ? <>
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">{selected.id}</p><h2 className="mt-1 text-sm font-semibold text-ink">{selected.title || 'Untitled submission'}</h2><p className="mt-1 text-[10px] text-muted">{selected.brand?.name || selected.brand_id} · {when(selected.created_at)}</p></div><StatusBadge status={selected.status} /></div>
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-canvas p-3.5 text-xs leading-5 text-secondary">{selected.content || 'No content supplied.'}</p>
          <div className="mt-5"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-ink">Saved analysis versions</h3><span className="text-[10px] text-muted">{selected.analysis_history?.length || (selected.analysis ? 1 : 0)}</span></div>
            {selected.analysis_history?.length ? <div className="mt-2 space-y-2">{selected.analysis_history.slice().reverse().map((version) => <Link key={version.id} to={'/analysis/' + encodeURIComponent(version.id)} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 hover:bg-canvas"><span className="text-xs font-medium text-ink">Version {version.version || 1}</span><ExternalLink size={13} className="text-muted" /></Link>)}</div>
              : selected.analysis ? <Link to={'/analysis/' + encodeURIComponent(selected.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">Open analysis <ExternalLink size={13} /></Link>
                : <p className="mt-2 text-xs leading-5 text-secondary">No saved version history was returned for this fixture.</p>}
          </div>
          <div className="mt-5 border-t border-line pt-4"><h3 className="text-xs font-semibold text-ink">Review activity</h3>
            {selected.review_decision && <p className="notice-info mt-3 rounded-xl border p-3 text-xs leading-5">Recorded human decision: <strong>{selected.review_decision.replaceAll('_', ' ')}</strong>{selected.reviewed_at ? ' · ' + when(selected.reviewed_at) : ''}</p>}
            {selected.review_events?.length ? <ol className="mt-3 space-y-3">{selected.review_events.slice().reverse().map((event) => <li key={event.id} className="border-l-2 border-line pl-3"><p className="text-xs font-semibold text-ink">{String(event.action || event.to_status || 'Review event').replaceAll('_', ' ')}</p><p className="mt-1 text-[10px] text-muted">{event.actor || 'Reviewer'} · {when(event.at)}</p>{event.comment && <p className="mt-1 text-xs leading-5 text-secondary">{event.comment}</p>}</li>)}</ol>
              : <p className="mt-2 text-xs leading-5 text-secondary">No review event log was included with this record.</p>}
            {selected.reviewer_comment && <p className="notice-info mt-3 rounded-xl border p-3 text-xs leading-5">Current reviewer comment: {selected.reviewer_comment}</p>}
          </div>
          <Link to={'/analysis/' + encodeURIComponent(selected.id)} className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-semibold text-white">Open submission analysis <ExternalLink size={13} /></Link>
        </> : <EmptyState title="Choose a submission" description="Select a row to inspect its analysis versions and any available review history." />}
      </aside>
    </div>}
  </div>
}
