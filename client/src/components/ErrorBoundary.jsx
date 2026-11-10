import { Component } from 'react'
import Button from './ui/Button'
import { ERRORS } from '../constants/messages'

// Last resort: a render error shows a calm fallback instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="text-lg font-semibold text-ink">{ERRORS.CRASH_TITLE}</h1>
        <p className="mt-1 text-ink-muted">{ERRORS.CRASH_BODY}</p>
        <Button variant="primary" className="mt-4" onClick={() => window.location.reload()}>
          {ERRORS.RELOAD}
        </Button>
      </div>
    )
  }
}
