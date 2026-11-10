import { CircleAlert, RotateCw } from 'lucide-react'
import Button from './Button'
import { LABELS } from '../../constants/messages'

export default function ErrorBanner({ title, message, onRetry, isRetrying = false }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 sm:flex-row sm:items-center">
      <CircleAlert className="hidden size-5 shrink-0 text-danger sm:block" aria-hidden />
      <div className="flex-1">
        {title && <p className="font-medium text-danger">{title}</p>}
        <p className="text-ink">{message}</p>
      </div>
      {onRetry && (
        <Button icon={RotateCw} onClick={onRetry} loading={isRetrying}>
          {LABELS.RETRY}
        </Button>
      )}
    </div>
  )
}
