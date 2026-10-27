import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <div className={'notice-error flex items-start gap-3 rounded-2xl border ' + (compact ? 'p-4' : 'p-5')}>
      <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">We couldn’t load this information</p>
        <p className="mt-1 text-sm leading-5">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold hover:underline">
            <RefreshCw size={13} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  )
}
