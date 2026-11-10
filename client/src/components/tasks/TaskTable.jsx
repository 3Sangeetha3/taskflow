import TaskRow from './TaskRow'
import { TABLE_COLUMNS } from '../../constants/ui'
import { cx } from '../../utils/cx'

export default function TaskTable({ tasks, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <table className="block w-full text-left md:table">
        <thead className="sr-only border-b border-line bg-canvas md:not-sr-only md:table-header-group">
          <tr>
            {TABLE_COLUMNS.map((column) => (
              <th key={column.key} scope="col" className={cx('px-4 py-2 text-xs font-medium text-ink-muted', column.srOnly && 'text-right')}>
                {column.srOnly ? <span className="sr-only">{column.label}</span> : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block divide-y divide-line md:table-row-group">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
