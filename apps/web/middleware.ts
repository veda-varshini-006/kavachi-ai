import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  
  // The Kavach AI backend requires the X-Demo-Role header to authorize requests.
  // Setting it to 'Admin' ensures the frontend has full access to all API routes.
  requestHeaders.set('X-Demo-Role', 'Admin')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  })
}

export const config = {
  matcher: '/api/:path*',
}
