import { Pencil, Trash2 } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import StatusSelect from './StatusSelect'
import DueDate from './DueDate'
import { TEXT } from '../../constants/messages'
import { PRIORITY_TONES } from '../../constants/ui'

const cell = 'md:table-cell md:px-4 md:py-2.5 md:align-middle'

// ≥md: a table row. Below md: the same cells wrap into a compact bordered row (one DOM, no duplication).
export default function TaskRow({ task, onEdit, onDelete }) {
  return (
    <tr className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-150 hover:bg-canvas md:table-row md:p-0">
      <th scope="row" className={`basis-full min-w-0 text-left font-normal md:w-[46%] md:max-w-0 ${cell}`}>
        <span className="block truncate font-medium text-ink" title={task.title}>
          {task.title}
        </span>
        {task.description && (
          <span className="block truncate text-ink-muted" title={task.description}>
            {task.description}
          </span>
        )}
      </th>
      <td className={cell}>
        <Badge tone={PRIORITY_TONES[task.priority]}>{task.priority}</Badge>
      </td>
      <td className={cell}>
        <StatusSelect task={task} />
      </td>
      <td className={cell}>
        <DueDate task={task} />
      </td>
      <td className={`ml-auto ${cell}`}>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" icon={Pencil} aria-label={TEXT.editTask(task.title)} onClick={() => onEdit(task)} />
          <Button
            variant="ghost"
            size="icon"
            icon={Trash2}
            aria-label={TEXT.deleteTask(task.title)}
            onClick={() => onDelete(task)}
            className="hover:text-danger"
          />
        </div>
      </td>
    </tr>
  )
}
