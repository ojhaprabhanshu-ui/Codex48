import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) { if (event.key === 'Escape' && !busy) onClose?.() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose?.() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-elevated sm:p-6">
        <div className="flex items-start gap-3">
          <div className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (danger ? 'tone-rose' : 'tone-violet')}>
            {danger ? <AlertTriangle size={17} aria-hidden="true" /> : <span className="text-sm font-semibold">?</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-secondary">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-secondary hover:bg-canvas disabled:opacity-50" aria-label="Close dialog"><X size={16} aria-hidden="true" /></button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-line bg-surface px-4 text-xs font-semibold text-secondary hover:bg-canvas disabled:opacity-50">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={'h-10 rounded-xl px-4 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60 ' + (danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-accent hover:bg-accent-dark')}>
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
