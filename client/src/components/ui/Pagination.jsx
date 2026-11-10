import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'
import { LABELS, TEXT } from '../../constants/messages'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={LABELS.PAGINATION} className="flex items-center justify-between gap-3 pt-3">
      <p className="text-ink-muted tabular-nums">{TEXT.pageOf(page, totalPages)}</p>
      <div className="flex gap-2">
        <Button icon={ChevronLeft} onClick={() => onChange(page - 1)} disabled={page <= 1}>
          {LABELS.PREVIOUS}
        </Button>
        <Button onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          {LABELS.NEXT}
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
