import Badge from '../ui/Badge'
import { LABELS } from '../../constants/messages'
import { OVERDUE_TONE } from '../../constants/ui'
import { formatDate, isOverdue, toInputDate } from '../../utils/date'

export default function DueDate({ task }) {
  if (!task.dueDate) return <span className="text-ink-subtle">{LABELS.NO_DUE_DATE}</span>
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <time dateTime={toInputDate(task.dueDate)} className="text-ink tabular-nums">
        {formatDate(task.dueDate)}
      </time>
      {isOverdue(task) && <Badge tone={OVERDUE_TONE}>{LABELS.OVERDUE}</Badge>}
    </span>
  )
}
