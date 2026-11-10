import { useEffect, useEffectEvent, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from './Button'
import { LABELS } from '../../constants/messages'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible modal: role=dialog + aria-modal, labelled by its title, focus moves inside
// (to [data-autofocus] or the first focusable), Tab is trapped, Escape closes,
// and focus returns to whatever opened it.
export default function Modal({ open, onClose, title, children }) {
  const panelRef = useRef(null)
  const titleId = useId()
  const close = useEffectEvent(() => onClose())

  useEffect(() => {
    if (!open) return undefined
    const trigger = document.activeElement
    const panel = panelRef.current
    const focusables = () => [...panel.querySelectorAll(FOCUSABLE)]
    ;(panel.querySelector('[data-autofocus]') ?? focusables()[0] ?? panel).focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      trigger?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-backdrop p-0 sm:items-start sm:p-6 sm:pt-[12vh]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full flex-col rounded-t-md border border-line bg-surface shadow-overlay sm:max-w-lg sm:rounded-md"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          <Button variant="ghost" size="icon" icon={X} aria-label={LABELS.CLOSE} onClick={onClose} />
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
