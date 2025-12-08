'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

interface ErrorFallbackProps {
  error: Error | null
  eventId: string | null
  onReset: () => void
  onReportFeedback: () => void
}

/**
 * Functional component for error fallback UI that supports i18n
 */
function ErrorFallback({ error, eventId, onReset, onReportFeedback }: ErrorFallbackProps) {
  const t = useTranslations('common')

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-red-800">
          {t('errorOccurred')}
        </h2>

        <p className="mb-4 text-sm text-red-600">
          {t('errorDescription')}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-left">
            <p className="text-xs font-mono text-red-700 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={onReset}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t('tryAgain')}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t('reloadPage')}
          </button>

          {eventId && (
            <button
              onClick={onReportFeedback}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('reportError')}
            </button>
          )}
        </div>

        {eventId && (
          <p className="mt-4 text-xs text-gray-500">
            {t('errorCode')}: {eventId}
          </p>
        )}
      </div>
    </div>
  )
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to Sentry
    Sentry.withScope((scope) => {
      scope.setExtras({
        componentStack: errorInfo.componentStack,
      })
      const eventId = Sentry.captureException(error)
      this.setState({ eventId })
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      eventId: null,
    })
  }

  handleReportFeedback = (): void => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId })
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          eventId={this.state.eventId}
          onReset={this.handleReset}
          onReportFeedback={this.handleReportFeedback}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
