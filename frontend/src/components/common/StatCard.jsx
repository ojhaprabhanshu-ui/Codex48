export default function StatCard({ label, value, note, icon: Icon, tone = 'violet' }) {
  const tones = {
    violet: 'tone-violet',
    amber: 'tone-amber',
    green: 'tone-green',
    rose: 'tone-rose',
  }
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-secondary">{label}</p>
          <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.05em] text-ink">{value}</p>
        </div>
        <div className={'grid h-10 w-10 place-items-center rounded-xl ' + tones[tone]}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>
      {note && <p className="mt-3 text-[11px] leading-5 text-muted">{note}</p>}
    </article>
  )
}
