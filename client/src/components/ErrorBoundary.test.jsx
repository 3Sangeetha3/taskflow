import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import { ERRORS } from '../constants/messages'

function Boom() {
  throw new Error('render failure')
}

describe('ErrorBoundary', () => {
  it('renders a fallback instead of crashing', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(ERRORS.CRASH_TITLE)
    expect(screen.getByRole('button', { name: ERRORS.RELOAD })).toBeInTheDocument()
    expect(screen.queryByText('render failure')).not.toBeInTheDocument()
    console.error.mockClear() // React logs the caught error; that is expected here
  })
})
