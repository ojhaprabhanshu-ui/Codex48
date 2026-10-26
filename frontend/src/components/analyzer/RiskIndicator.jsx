import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

export default function RiskIndicator({ risk }) {
  if (!risk) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <ShieldQuestion size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">ML risk signal unavailable</p>
          <p className="mt-0.5 text-xs text-secondary">No classifier prediction is generated in fixture mode.</p>
        </div>
      </div>
    )
  }

  const label = String(risk.label || risk.risk_label || 'unknown')
  const normalized = label.toLowerCase()
  const isHigh = normalized === 'high' || normalized === '1'
  const isLow = normalized === 'low' || normalized === '0'
  const Icon = isHigh ? ShieldAlert : isLow ? ShieldCheck : ShieldQuestion
  const tone = isHigh ? 'text-rose-700 bg-rose-50' : isLow ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4">
      <div className={'grid h-10 w-10 place-items-center rounded-xl ' + tone}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Generic claim-risk signal · {label}</p>
        <p className="mt-0.5 text-xs text-secondary">{risk.note || 'Advisory only. This is not a cited guideline violation.'}</p>
      </div>
    </div>
  )
}
