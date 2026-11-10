import { act, render, screen } from '@testing-library/react'
import { ToastProvider } from './Toast'
import { useToast } from './toastContext'
import { TOAST_DURATION_MS } from '../../constants/app'
import { LABELS } from '../../constants/messages'

function Trigger() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Saved it')}>ok</button>
      <button onClick={() => toast.error('Broke it')}>fail</button>
    </>
  )
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('success toasts auto-dismiss; error toasts persist until dismissed; region is polite', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'ok' }).click())
    act(() => screen.getByRole('button', { name: 'fail' }).click())
    expect(screen.getByRole('region', { name: LABELS.NOTIFICATIONS })).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Saved it')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByText('Saved it')).not.toBeInTheDocument()
    expect(screen.getByText('Broke it')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: LABELS.DISMISS }).click())
    expect(screen.queryByText('Broke it')).not.toBeInTheDocument()
  })

  it('clears pending timers on unmount', () => {
    const { unmount } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'ok' }).click())
    unmount()
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
  })
})
