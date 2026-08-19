import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    if (error.name === 'ChunkLoadError' || error.message?.includes('Failed to fetch dynamically imported module')) {
      window.location.reload()
    }
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (error.name === 'ChunkLoadError' || error.message?.includes('Failed to fetch dynamically imported module')) {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex h-screen w-screen items-center justify-center bg-background'>
          <div className='text-center space-y-4'>
            <h2 className='text-xl font-bold text-white'>Updating Application...</h2>
            <p className='text-muted-foreground'>Please wait while we load the latest version.</p>
            <button onClick={() => window.location.reload()} className='btn-neon px-4 py-2'>
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
