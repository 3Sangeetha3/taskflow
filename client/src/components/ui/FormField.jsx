import { useId } from 'react'
import { LABELS } from '../../constants/messages'

// Label + control + error + optional counter. The control is rendered by `children(controlProps)`
// so it receives the id, aria-invalid and aria-describedby wiring.
export default function FormField({ label, optional = false, error, counter, children }) {
  const id = useId()
  const errorId = `${id}-error`
  const counterId = `${id}-counter`
  const describedBy = [error && errorId, counter && counterId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
          {optional && <span className="font-normal text-ink-subtle"> ({LABELS.OPTIONAL})</span>}
        </label>
        {counter && (
          <span id={counterId} className="text-xs tabular-nums text-ink-subtle">
            {counter}
          </span>
        )}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
