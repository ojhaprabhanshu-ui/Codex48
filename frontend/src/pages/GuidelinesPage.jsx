import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpenText, Check, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useAppContext } from '../context/useAppContext'
import { createGuideline, deleteGuideline, getGuidelines, updateGuideline } from '../services/guidelinesApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

const blankRule = { title: '', category: '', text: '', approved_fact: '', active: true }
function normalizeList(response) { return Array.isArray(response) ? response : response?.guidelines || response?.items || response?.data || [] }

export default function GuidelinesPage() {
  const { activeBrand, activeBrandId } = useAppContext()
  const [guidelines, setGuidelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankRule)
  const [validation, setValidation] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) { setLoading(true); setError('') }
    try { setGuidelines(normalizeList(await getGuidelines(activeBrandId))) } catch (requestError) { setError(getApiErrorMessage(requestError)) } finally { setLoading(false) }
  }, [activeBrandId])
  useEffect(() => {
    let alive = true
    getGuidelines(activeBrandId).then((response) => { if (alive) setGuidelines(normalizeList(response)) }).catch((requestError) => { if (alive) setError(getApiErrorMessage(requestError)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activeBrandId])

  const categories = useMemo(() => [...new Set(guidelines.map((rule) => rule.category || rule.type || 'General'))].sort(), [guidelines])
  const visible = useMemo(() => guidelines.filter((rule) => {
    const group = rule.category || rule.type || 'General'
    const query = search.trim().toLowerCase()
    return (category === 'all' || category === group) && (!query || [rule.rule_code, rule.id, rule.title, rule.text, rule.approved_fact, group].some((value) => String(value || '').toLowerCase().includes(query)))
  }), [guidelines, search, category])
  const groups = useMemo(() => visible.reduce((result, rule) => {
    const group = rule.category || rule.type || 'General'
    result[group] ||= []
    result[group].push(rule)
    return result
  }, {}), [visible])

  function openCreate() {
    setEditing(null)
    setForm({ ...blankRule, category: categories[0] || 'General' })
    setValidation('')
    setFormOpen(true)
  }

  function openEdit(rule) {
    setEditing(rule)
    setForm({ title: rule.title || '', category: rule.category || rule.type || '', text: rule.text || rule.rule_text || rule.description || '', approved_fact: rule.approved_fact || '', active: rule.active !== false })
    setValidation('')
    setFormOpen(true)
  }

  async function saveRule(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.category.trim() || !form.text.trim()) {
      setValidation('Title, category, and guideline text are required.')
      return
    }
    setSaving(true)
    setValidation('')
    try {
      const payload = { ...form, title: form.title.trim(), category: form.category.trim(), type: form.category.trim().toLowerCase().replaceAll(' ', '_'), text: form.text.trim(), approved_fact: form.approved_fact.trim() || null, brand_id: activeBrandId }
      if (editing) {
        await updateGuideline(editing.id || editing.rule_code, payload)
        toast.success('Guideline updated')
      } else {
        const created = await createGuideline(payload)
        toast.success('Guideline created · ' + (created.rule_code || created.id))
      }
      setFormOpen(false)
      await load()
    } catch (requestError) {
      setValidation(getApiErrorMessage(requestError))
    } finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteGuideline(deleting.id || deleting.rule_code)
      toast.success('Guideline deleted')
      setDeleting(null)
      await load()
    } catch (requestError) { setError(getApiErrorMessage(requestError)); toast.error(getApiErrorMessage(requestError)) } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Brand standards" title="Brand guidelines" description={'Manage the active rule set for ' + (activeBrand?.name || 'your selected brand') + '.'} action={<button type="button" onClick={openCreate} disabled={!activeBrandId} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-dark disabled:opacity-50"><Plus size={15} /> Add guideline</button>} />
    {USE_MOCK_API && <div className="notice-warning mb-5 rounded-2xl border px-4 py-3 text-xs leading-5"><strong>Demo guideline set.</strong> Rules are fictional fixtures; edits stay in this browser session and do not change the limited sample rule matcher.</div>}
    {!USE_MOCK_API && <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-3 text-xs leading-5 text-secondary">Guideline changes are sent to the configured API. Confirm the proposed endpoint contract with the backend team before production use.</div>}
    {error && <div className="mb-5"><ErrorState compact message={error} onRetry={load} /></div>}

    <section className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_220px]">
        <label className="relative block"><span className="sr-only">Search guidelines</span><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input className="field-control search-field-control h-10 w-full pl-12 pr-4" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, rule ID or wording" /></label>
        <label><span className="sr-only">Filter category</span><select className="field-control h-10" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
    </section>

    {loading ? <LoadingSkeleton rows={5} /> : guidelines.length === 0 ? <EmptyState title="No guidelines found" description="Add the active brand’s first guideline to build a rule set." action={<button type="button" onClick={openCreate} className="text-xs font-semibold text-accent">Add guideline</button>} /> : visible.length === 0 ? <EmptyState title="No matching guidelines" description="Try another title, rule code, or category." /> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.6fr)]">
      <div className="space-y-5">{Object.entries(groups).map(([group, rules]) => <section key={group} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><BookOpenText size={15} /></div><h2 className="text-sm font-semibold text-ink">{group}</h2></div><span className="text-[10px] text-muted">{rules.length} rule{rules.length === 1 ? '' : 's'}</span></div>
        <div className="divide-y divide-line">{rules.map((rule) => <article key={rule.rule_code || rule.id} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-canvas px-2 py-1 font-mono text-[10px] font-semibold text-secondary">{rule.rule_code || rule.id}</span><span className="text-xs font-semibold text-ink">{rule.title || rule.name || rule.type || 'Brand guideline'}</span>{rule.active !== false && <span className="notice-success inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium"><Check size={10} /> Active</span>}{rule.active === false && <span className="rounded-full bg-canvas px-2 py-0.5 text-[9px] font-medium text-muted">Inactive</span>}</div>
            <p className="mt-2.5 text-sm leading-6 text-secondary">{rule.text || rule.rule_text || rule.description || 'No guideline text was supplied.'}</p>{rule.approved_fact && <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs leading-5 text-secondary"><strong className="text-ink">Approved wording:</strong> {rule.approved_fact}</p>}
          </div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEdit(rule)} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-canvas hover:text-ink" aria-label={'Edit ' + (rule.title || rule.id)}><Pencil size={14} /></button><button type="button" onClick={() => setDeleting(rule)} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-danger-bg hover:text-danger-ink" aria-label={'Delete ' + (rule.title || rule.id)}><Trash2 size={14} /></button></div></div>
        </article>)}</div>
      </section>)}</div>
      <aside className="h-fit rounded-2xl border border-line bg-surface p-5 shadow-card"><div className="tone-green grid h-10 w-10 place-items-center rounded-xl"><ShieldCheck size={18} /></div><h2 className="mt-4 text-sm font-semibold text-ink">{activeBrand?.name || 'Active brand'}</h2><p className="mt-1 text-xs leading-5 text-secondary">{activeBrand?.description || 'Brand profile details are supplied by the connected API.'}</p><div className="mt-5 border-t border-line pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Citation policy</p><p className="mt-2 text-xs leading-5 text-secondary">Keep each rule ID stable so analysis findings can cite the source record accurately.</p></div></aside>
    </div>}

    {formOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="guideline-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-elevated sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-accent">{editing ? 'Edit rule' : 'New rule'}</p><h2 id="guideline-form-title" className="mt-1 text-base font-semibold text-ink">{editing ? 'Update guideline' : 'Add a guideline'}</h2>{editing && <p className="mt-1 font-mono text-[10px] text-muted">Stable ID: {editing.rule_code || editing.id}</p>}</div><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-canvas"><X size={16} /></button></div>
        <form onSubmit={saveRule} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-ink">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} required className="field-control mt-2" placeholder="e.g. Avoid unqualified health claims" /></label>
          <label className="block text-xs font-semibold text-ink">Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={60} required list="guideline-category-options" className="field-control mt-2" placeholder="e.g. Claims" /><datalist id="guideline-category-options">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label className="block text-xs font-semibold text-ink">Guideline text<textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} maxLength={1200} required rows={4} className="field-control mt-2 resize-y" placeholder="Write the brand rule that should be checked." /></label>
          <label className="block text-xs font-semibold text-ink">Approved wording <span className="font-normal text-muted">Optional</span><textarea value={form.approved_fact} onChange={(event) => setForm({ ...form, approved_fact: event.target.value })} maxLength={500} rows={2} className="field-control mt-2 resize-y" placeholder="A safe alternative or approved fact." /></label>
          <label className="flex items-center gap-2 text-xs font-medium text-secondary"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="accent-indigo-600" /> Rule is active</label>
          {validation && <p role="alert" className="notice-error rounded-xl border px-3 py-2.5 text-xs leading-5">{validation}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="h-10 rounded-xl border border-line px-4 text-xs font-semibold text-secondary">Cancel</button><button type="submit" disabled={saving} className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create guideline'}</button></div>
        </form>
      </section>
    </div>}
    <ConfirmDialog open={Boolean(deleting)} title="Delete this guideline?" description={`This removes “${deleting?.title || deleting?.rule_code || 'this rule'}” from the active fixture set. Existing saved analyses keep their cited finding text.`} confirmLabel="Delete guideline" danger busy={saving} onClose={() => setDeleting(null)} onConfirm={confirmDelete} />
  </div>
}
