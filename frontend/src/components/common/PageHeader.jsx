export default function PageHeader({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={'mb-7 flex flex-wrap items-end justify-between gap-5 ' + className}>
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-[34px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}
