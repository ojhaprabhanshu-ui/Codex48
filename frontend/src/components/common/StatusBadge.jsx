const states = {
  submitted: { label: 'Submitted', style: 'bg-slate-100 text-slate-700 ring-slate-200' },
  analyzing: { label: 'Analyzing', style: 'bg-blue-50 text-blue-700 ring-blue-100' },
  analyzed: { label: 'Analyzed', style: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  pending_review: { label: 'In review', style: 'bg-amber-50 text-amber-800 ring-amber-100' },
  approved: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  rejected: { label: 'Rejected', style: 'bg-rose-50 text-rose-700 ring-rose-100' },
  changes_requested: { label: 'Changes requested', style: 'bg-orange-50 text-orange-700 ring-orange-100' },
  failed: { label: 'Needs attention', style: 'bg-rose-50 text-rose-700 ring-rose-100' },
}

export default function StatusBadge({ status = 'submitted', children }) {
  const state = states[status] || { label: status.replaceAll('_', ' '), style: 'bg-slate-100 text-slate-700 ring-slate-200' }
  return (
    <span className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ring-inset ' + state.style}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children || state.label}
    </span>
  )
}
