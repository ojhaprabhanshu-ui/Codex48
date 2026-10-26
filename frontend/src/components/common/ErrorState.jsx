import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <div className={'flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 ' + (compact ? 'p-4' : 'p-5')}>
      <AlertCircle size={19} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">We couldn’t load this information</p>
        <p className="mt-1 text-sm leading-5 text-rose-800">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-rose-900 hover:underline">
            <RefreshCw size={13} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}
