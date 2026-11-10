import { LABELS } from '../../constants/messages'
import { SKELETON_ROWS } from '../../constants/ui'

const bar = 'block h-3 rounded-sm bg-surface-muted'

// Static placeholder rows shaped like the table (no shimmer animation).
export default function Skeleton({ rows = SKELETON_ROWS }) {
  return (
    <div role="status" aria-label={LABELS.LOADING_TASKS} className="divide-y divide-line rounded-md border border-line bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <span className={`${bar} w-2/5`} />
          <span className={`${bar} ml-auto w-14`} />
          <span className={`${bar} w-20`} />
          <span className={`${bar} hidden w-24 md:block`} />
        </div>
      ))}
    </div>
  )
}
