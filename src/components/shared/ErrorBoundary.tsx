import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="h-16 w-16 rounded-3xl bg-danger-500/10 flex items-center justify-center">
            <span className="text-2xl">⚠</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-noor-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-noor-600 transition-colors"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
