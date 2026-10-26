import { Component, type ErrorInfo, type ReactNode } from 'react'
import { profile } from '../data'

type Props = { children: ReactNode }
type State = { failed: boolean }

// Last line of defence: if rendering throws, show a readable page with the essentials instead of a blank screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render failure:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fallback" role="alert">
        <h1>{profile.name}</h1>
        <p>{profile.role}</p>
        <p className="muted">Something went wrong while drawing this page. The essentials are below.</p>
        <p>
          <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={profile.github}>GitHub</a> ·{' '}
          <a href={profile.linkedin}>LinkedIn</a>
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    )
  }
}
