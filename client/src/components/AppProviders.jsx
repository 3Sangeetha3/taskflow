import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './ErrorBoundary'
import { ToastProvider } from './ui/Toast'
import { QUERY_RETRY } from '../constants/app'

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: QUERY_RETRY, refetchOnWindowFocus: false } } })

// App-wide providers. Tests pass their own queryClient (retries off).
export default function AppProviders({ queryClient, children }) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
