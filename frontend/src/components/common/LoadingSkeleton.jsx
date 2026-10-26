export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-line bg-surface p-4">
          <div className="h-3 w-1/3 rounded bg-line" />
          <div className="mt-3 h-3 w-2/3 rounded bg-canvas" />
        </div>
      ))}
      <span className="sr-only">Loading information…</span>
    </div>
  )
}
