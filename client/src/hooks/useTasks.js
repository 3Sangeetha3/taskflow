import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../constants/app'
import { taskApi } from '../services/api'

// List query. keepPreviousData keeps the table on screen while a new page/filter loads.
export const useTasks = (params) =>
  useQuery({
    queryKey: [QUERY_KEYS.TASKS, params],
    queryFn: () => taskApi.list(params),
    placeholderData: keepPreviousData,
  })
