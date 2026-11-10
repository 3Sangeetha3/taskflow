import { Search, X } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { LABELS, TEXT } from '../../constants/messages'
import { PRIORITY_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from '../../constants/options'
import { SEARCH_MAX_LENGTH } from '../../constants/task'
import { FOCUS_RING } from '../../constants/ui'
import { cx } from '../../utils/cx'

const fromEvent = (setter) => (event) => setter(event.target.value)

export default function TaskFilters({ filters, total, isUpdating }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <Input
          type="search"
          aria-label={LABELS.SEARCH}
          placeholder={LABELS.SEARCH_PLACEHOLDER}
          maxLength={SEARCH_MAX_LENGTH}
          value={filters.search}
          onChange={fromEvent(filters.setSearch)}
          className="pr-9 pl-8 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {filters.search && (
          <button
            type="button"
            aria-label={LABELS.CLEAR_SEARCH}
            onClick={() => filters.setSearch('')}
            className={cx('absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-ink-subtle hover:text-ink sm:size-7', FOCUS_RING)}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select aria-label={LABELS.STATUS} options={STATUS_FILTER_OPTIONS} value={filters.status} onChange={fromEvent(filters.setStatus)} className="sm:w-40" />
        <Select aria-label={LABELS.PRIORITY} options={PRIORITY_FILTER_OPTIONS} value={filters.priority} onChange={fromEvent(filters.setPriority)} className="sm:w-40" />
      </div>
      {filters.hasFilters && (
        <Button variant="ghost" icon={X} onClick={filters.clearFilters} className="self-start sm:self-auto">
          {LABELS.CLEAR_FILTERS}
        </Button>
      )}
      <p className="flex items-center gap-3 text-ink-muted tabular-nums sm:ml-auto" aria-live="polite">
        {isUpdating && <span className="text-ink-subtle">{LABELS.UPDATING}</span>}
        {total !== undefined && <span>{TEXT.taskCount(total)}</span>}
      </p>
    </div>
  )
}
