import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenText, Check, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import { useAppContext } from '../context/useAppContext'
import { getGuidelines } from '../services/guidelinesApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

function normalizeList(response) {
  if (Array.isArray(response)) return response
  return response?.guidelines || response?.items || response?.data || []
}

export default function GuidelinesPage() {
  const { activeBrand, activeBrandId } = useAppContext()
  const [guidelines, setGuidelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setGuidelines(normalizeList(await getGuidelines(activeBrandId)))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [activeBrandId])

  useEffect(() => {
    let alive = true
    getGuidelines(activeBrandId)
      .then((response) => {
        if (alive) {
          setError('')
          setGuidelines(normalizeList(response))
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
  const groups = guidelines.reduce((result, item) => {
    const key = item.category || item.type || 'Guideline'
    result[key] = result[key] || []
    result[key].push(item)
    return result
  }, {})

  return (
    <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        eyebrow="Brand standards"
        title="Guidelines that ground every check."
        description={'A read-only view of the active rules for ' + (activeBrand?.name || 'your selected brand') + '.'}
      />
      {USE_MOCK_API && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><strong>Demo guideline set.</strong> The {activeBrand?.name || 'selected brand'} profile and rules are illustrative fixtures.</div>}
      {!USE_MOCK_API && <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-3 text-xs leading-5 text-secondary">This build displays guideline records returned by the API. Editing and deletion are scheduled for a later build stage.</div>}
      {error && <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>}
      {loading ? <LoadingSkeleton rows={5} /> : guidelines.length === 0 ? (
        <EmptyState title="No guidelines found" description="Guidelines will appear when the active brand has records in the connected API." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.6fr)]">
          <div className="space-y-5">
            {Object.entries(groups).map(([category, items]) => (
              <section key={category} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><BookOpenText size={15} aria-hidden="true" /></div>
                    <h2 className="text-sm font-semibold text-ink">{category}</h2>
                  </div>
                  <span className="text-[10px] text-muted">{items.length} {items.length === 1 ? 'rule' : 'rules'}</span>
                </div>
                <div className="divide-y divide-line">
                  {items.map((rule) => (
                    <article key={rule.rule_code || rule.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-canvas px-2 py-1 font-mono text-[10px] font-semibold text-secondary">{rule.rule_code || rule.id}</span>
                        <span className="text-xs font-semibold text-ink">{rule.title || rule.name || rule.type || 'Brand guideline'}</span>
                        {rule.active !== false && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700"><Check size={10} aria-hidden="true" /> Active</span>}
                      </div>
                      <p className="mt-2.5 text-sm leading-6 text-secondary">{rule.text || rule.rule_text || rule.description || 'No guideline text was supplied.'}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="h-fit rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={18} aria-hidden="true" /></div>
            <h2 className="mt-4 text-sm font-semibold text-ink">{activeBrand?.name || 'Active brand'}</h2>
            <p className="mt-1 text-xs leading-5 text-secondary">{activeBrand?.description || 'Brand profile details are supplied by the connected API.'}</p>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Citation policy</p>
              <p className="mt-2 text-xs leading-5 text-secondary">A finding should cite a stable guideline ID and show the source wording returned with that finding.</p>
            </div>
          </aside>
        </div>
      )}
    </motion.div>
  )
}
