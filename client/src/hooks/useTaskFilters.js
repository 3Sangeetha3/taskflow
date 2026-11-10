import { useState } from 'react'
import { PAGINATION } from '../constants/task'
import { compactParams } from '../utils/query'
import { useDebouncedValue } from './useDebouncedValue'

const NO_FILTER = ''

// Filter + pagination state for the task list. The page is derived: it resets to 1 whenever the
// applied filters change (no effect needed), so a filter change never requests a stale page.
export function useTaskFilters() {
  const [search, setSearch] = useState(NO_FILTER)
  const [status, setStatus] = useState(NO_FILTER)
  const [priority, setPriority] = useState(NO_FILTER)
  const appliedSearch = useDebouncedValue(search)

  // Whitespace-only search is "no search"; otherwise the raw text is sent (the server trims).
  const searchParam = appliedSearch.trim() ? appliedSearch : undefined
  const filterKey = JSON.stringify([searchParam, status, priority])
  const [paging, setPaging] = useState({ key: filterKey, page: PAGINATION.FIRST_PAGE })
  const page = paging.key === filterKey ? paging.page : PAGINATION.FIRST_PAGE
  const setPage = (next) => setPaging({ key: filterKey, page: next })

  const clearFilters = () => {
    setSearch(NO_FILTER)
    setStatus(NO_FILTER)
    setPriority(NO_FILTER)
  }

  return {
    search,
    status,
    priority,
    page,
    setSearch,
    setStatus,
    setPriority,
    setPage,
    clearFilters,
    hasFilters: Boolean(search || status || priority),
    hasAppliedFilters: Boolean(searchParam || status || priority),
    params: compactParams({ search: searchParam, status, priority, page, limit: PAGINATION.PAGE_SIZE }),
  }
}
