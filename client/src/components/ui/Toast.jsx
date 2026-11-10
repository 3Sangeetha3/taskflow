import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { TOAST_DURATION_MS } from '../../constants/app'
import { LABELS } from '../../constants/messages'
import { FOCUS_RING } from '../../constants/ui'
import { cx } from '../../utils/cx'
import { ToastContext } from './toastContext'

const TONES = {
  success: { icon: CircleCheck, iconClass: 'text-success', autoDismiss: true },
  error: { icon: CircleAlert, iconClass: 'text-danger', autoDismiss: false },
}

// Success toasts auto-dismiss; error toasts stay until dismissed. Announced politely.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone, message) => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [...current, { id, tone, message }])
      if (TONES[tone].autoDismiss) timers.current.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  // Stable value so every consumer doesn't re-render when a toast appears.
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label={LABELS.NOTIFICATIONS}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map(({ id, tone, message }) => {
          const { icon: Icon, iconClass } = TONES[tone]
          return (
            <div key={id} className="pointer-events-auto flex w-full items-start gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 shadow-overlay">
              <Icon className={cx('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden />
              <p className="flex-1 text-ink">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label={LABELS.DISMISS}
                className={cx('-m-1 rounded-sm p-1 text-ink-subtle transition-colors duration-150 hover:text-ink', FOCUS_RING)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </section>
    </ToastContext.Provider>
  )
}
