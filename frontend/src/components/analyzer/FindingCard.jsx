import { ArrowUpRight, BookOpenText, CircleAlert } from 'lucide-react'

const severityStyle = {
  high: 'border-rose-200 bg-rose-50 text-rose-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-sky-200 bg-sky-50 text-sky-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
}

export default function FindingCard({ finding, onViewGuideline }) {
  const severity = (finding.severity || 'info').toLowerCase()
  const citation = finding.rule_code || finding.rule_id || finding.guideline_id
  const quoted = finding.quoted_span || finding.exact_text
  const title = finding.guideline_title || finding.title

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ' + (severityStyle[severity] || severityStyle.info)}>
            {severity}
          </span>
          <span className="text-[11px] font-medium text-muted">{finding.source === 'gemini' ? 'Gemini' : 'Rule engine'}</span>
        </div>
        {citation && (
          <button type="button" onClick={() => onViewGuideline?.(finding)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            {citation}<ArrowUpRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      {quoted && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-canvas px-3 py-2.5">
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">“{quoted}”</p>
        </div>
      )}
      <p className="mt-3 text-sm leading-6 text-secondary">{finding.explanation || finding.reason || 'Review this finding against the cited guideline.'}</p>
      {finding.guideline_text && (
        <button type="button" onClick={() => onViewGuideline?.(finding)} className="mt-3 flex items-start gap-2 text-left text-xs leading-5 text-accent hover:underline">
          <BookOpenText size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span><strong>{title || citation}:</strong> {finding.guideline_text}</span>
        </button>
      )}
      {finding.suggestion && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Suggested adjustment</p>
          <p className="mt-1 text-sm leading-5 text-ink">{finding.suggestion}</p>
        </div>
      )}
    </article>
  )
}
