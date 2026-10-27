import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Moon, Sun, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/common/PageHeader'
import { useAppContext } from '../context/useAppContext'
import apiClient, { API_BASE_URL, USE_MOCK_API, getApiErrorMessage } from '../services/apiClient'

export default function SettingsPage() {
  const { brands, activeBrand, activeBrandId, setActiveBrandId, theme, setTheme } = useAppContext()
  const [apiStatus, setApiStatus] = useState(USE_MOCK_API ? 'fixtures' : 'checking')
  const [checking, setChecking] = useState(!USE_MOCK_API)
  const [apiError, setApiError] = useState('')

  const checkApi = useCallback(async () => {
    if (USE_MOCK_API) { setApiStatus('fixtures'); return }
    setChecking(true)
    setApiError('')
    try {
      await apiClient.get('/health')
      setApiStatus('connected')
      toast.success('API health endpoint responded')
    } catch (error) {
      setApiStatus('unavailable')
      setApiError(getApiErrorMessage(error))
    } finally { setChecking(false) }
  }, [])

  useEffect(() => {
    if (USE_MOCK_API) return undefined
    let alive = true
    apiClient.get('/health').then(() => { if (alive) setApiStatus('connected') }).catch((error) => {
      if (alive) { setApiStatus('unavailable'); setApiError(getApiErrorMessage(error)) }
    }).finally(() => { if (alive) setChecking(false) })
    return () => { alive = false }
  }, [])

  return <div>
    <PageHeader eyebrow="Workspace preferences" title="Settings" description="Manage the active brand, theme preference, and connection visibility for this workspace." />
    {USE_MOCK_API && <div className="notice-warning mb-5 rounded-2xl border px-4 py-3 text-xs leading-5"><strong>Fixture mode is active.</strong> The connected backend is not used in this development session.</div>}

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Appearance</h2><p className="mt-1 text-xs leading-5 text-secondary">Choose a theme for the full workspace, including the left navigation.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }].map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={theme === id} onClick={() => setTheme(id)} className={'flex items-center justify-between rounded-2xl border p-4 text-left transition ' + (theme === id ? 'border-accent bg-accent-soft/70' : 'border-line hover:bg-canvas')}>
            <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-accent"><Icon size={17} /></span><span><span className="block text-xs font-semibold text-ink">{label} theme</span><span className="mt-1 block text-[10px] text-secondary">{id === 'light' ? 'Bright surfaces throughout' : 'Dark surfaces throughout'}</span></span></span>{theme === id && <CheckCircle2 size={17} className="text-accent" />}
          </button>)}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Active brand</h2><p className="mt-1 text-xs leading-5 text-secondary">The selected brand scopes analysis and guideline management.</p>
        <label htmlFor="settings-brand" className="mt-4 block text-xs font-semibold text-ink">Current brand</label>
        <select id="settings-brand" value={activeBrandId || ''} onChange={(event) => { setActiveBrandId(event.target.value); toast.success('Active brand updated') }} className="field-control mt-2 h-11">
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          {brands.length === 0 && <option value="">No brands available</option>}
        </select>
        <div className="mt-4 rounded-xl bg-canvas p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Brand profile</p><p className="mt-1 text-xs font-semibold text-ink">{activeBrand?.name || 'No active brand'}</p><p className="mt-1 text-xs leading-5 text-secondary">{activeBrand?.description || 'Brand details will appear when available.'}</p></div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">API connection</h2><p className="mt-1 text-xs leading-5 text-secondary">Connection state is based on the health endpoint response.</p></div><div className={'grid h-9 w-9 place-items-center rounded-xl ' + (apiStatus === 'connected' || apiStatus === 'fixtures' ? 'tone-green' : apiStatus === 'unavailable' ? 'tone-rose' : 'tone-neutral')}>{apiStatus === 'connected' || apiStatus === 'fixtures' ? <Wifi size={17} /> : <WifiOff size={17} />}</div></div>
        <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-secondary">Status</dt><dd className="font-semibold text-ink">{apiStatus === 'fixtures' ? 'Development fixtures active' : apiStatus === 'connected' ? 'Connected' : apiStatus === 'unavailable' ? 'Unavailable' : checking ? 'Checking…' : 'Not checked'}</dd></div><div className="flex justify-between gap-4"><dt className="text-secondary">API base URL</dt><dd className="max-w-[65%] break-all text-right font-mono text-[10px] text-ink">{API_BASE_URL}</dd></div><div className="flex justify-between gap-4"><dt className="text-secondary">Mock mode</dt><dd className="font-semibold text-ink">{USE_MOCK_API ? 'Enabled for development' : 'Disabled'}</dd></div></dl>
        {apiError && <p role="alert" className="notice-error mt-4 rounded-xl border px-3 py-2.5 text-xs leading-5">{apiError}</p>}
        {!USE_MOCK_API && <button type="button" onClick={checkApi} disabled={checking} className="mt-4 h-9 rounded-xl border border-line px-3 text-xs font-semibold text-secondary hover:bg-canvas disabled:opacity-50">{checking ? 'Checking…' : 'Check connection'}</button>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Application</h2><p className="mt-1 text-xs leading-5 text-secondary">Build and runtime information for this frontend.</p>
        <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-secondary">Version</dt><dd className="font-mono font-semibold text-ink">0.1.0</dd></div><div className="flex justify-between gap-4"><dt className="text-secondary">Environment</dt><dd className="font-semibold text-ink">{import.meta.env.MODE}</dd></div><div className="flex justify-between gap-4"><dt className="text-secondary">Analysis behavior</dt><dd className="text-right font-semibold text-ink">{USE_MOCK_API ? 'Deterministic demo rules only' : 'Configured API response'}</dd></div></dl>
      </section>
    </div>
  </div>
}
