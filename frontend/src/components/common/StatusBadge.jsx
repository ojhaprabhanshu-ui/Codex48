const states = {
  submitted: { label: 'Submitted', style: 'status-neutral' },
  analyzing: { label: 'Analyzing', style: 'status-info' },
  analyzed: { label: 'Analyzed', style: 'status-violet' },
  pending_review: { label: 'In review', style: 'status-warning' },
  approved: { label: 'Approved', style: 'status-success' },
  rejected: { label: 'Rejected', style: 'status-danger' },
  changes_requested: { label: 'Changes requested', style: 'status-orange' },
  failed: { label: 'Needs attention', style: 'status-danger' },
}

export default function StatusBadge({ status = 'submitted', children }) {
  const state = states[status] || { label: status.replaceAll('_', ' '), style: 'status-neutral' }
  return (
    <span className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ring-inset ' + state.style}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children || state.label}
    </span>
  )
}
