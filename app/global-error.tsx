'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-lg text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
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

            <h1 className="mb-3 text-2xl font-bold text-gray-900">
              Da xay ra loi nghiem trong
            </h1>

            <p className="mb-6 text-gray-600">
              Rat tiec, ung dung da gap su co. Vui long thu lai hoac lien he voi
              bo phan ho tro ky thuat.
            </p>

            {error.digest && (
              <p className="mb-6 text-xs text-gray-400">
                Ma loi: {error.digest}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Thu lai
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Ve trang chu
              </button>
            </div>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Neu van de van tiep tuc, vui long lien he:{' '}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 hover:underline"
            >
              support@example.com
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}
