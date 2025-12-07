import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/setup')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next') ||
                        request.nextUrl.pathname.startsWith('/icons') ||
                        request.nextUrl.pathname.includes('.')

  // Skip protection for API routes and static assets
  if (isApiRoute || isStaticAsset) {
    return response
  }

  // Redirect unauthenticated users to login (except auth pages)
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Check onboarding status for authenticated users (not on onboarding or auth pages)
  if (user && !isAuthPage && !isOnboardingPage) {
    try {
      // Check if user has completed onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('store_id, stores(onboarding_completed)')
        .eq('id', user.id)
        .single()

      const storeData = userData?.stores as unknown as { onboarding_completed: boolean } | null
      const needsOnboarding = !storeData || !storeData.onboarding_completed

      if (needsOnboarding) {
        const url = request.nextUrl.clone()
        url.pathname = '/setup'
        return NextResponse.redirect(url)
      }
    } catch {
      // If we can't check onboarding status, let the request through
      // The page can handle showing appropriate error state
    }
  }

  // Redirect users who have completed onboarding away from setup page
  if (user && isOnboardingPage) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('store_id, stores(onboarding_completed)')
        .eq('id', user.id)
        .single()

      const storeData = userData?.stores as unknown as { onboarding_completed: boolean } | null
      
      if (storeData?.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    } catch {
      // Let the request through if check fails
    }
  }

  return response
}
