export default function HighlightedContent({ content = '', findings = [] }) {
  const spans = findings
    .map((finding) => ({
      start: finding.start_idx ?? finding.start,
      end: finding.end_idx ?? finding.end,
      severity: finding.severity || 'high',
    }))
    .filter((finding) => Number.isInteger(finding.start) && Number.isInteger(finding.end) && finding.end > finding.start)
    .sort((a, b) => a.start - b.start)

  const segments = []
  let cursor = 0
  for (const span of spans) {
    if (span.start < cursor || span.start > content.length || span.end > content.length) continue
    if (span.start > cursor) segments.push({ text: content.slice(cursor, span.start) })
    segments.push({ text: content.slice(span.start, span.end), severity: span.severity })
    cursor = span.end
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor) })

  return (
    <p className="whitespace-pre-wrap text-sm leading-7 text-ink">
      {segments.map((segment, index) => segment.severity
        ? <mark key={index} className={'rounded px-0.5 ' + (segment.severity === 'high' ? 'highlight-high' : 'highlight-medium')}>{segment.text}</mark>
        : <span key={index}>{segment.text}</span>)}
    </p>
  )
}
