import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basic Auth middleware - configurable via env vars
// If UI_USERNAME and UI_PASSWORD are set, require authentication
// If empty, allow public access (current behavior)

export function middleware(request: NextRequest) {
  const username = process.env.UI_USERNAME
  const password = process.env.UI_PASSWORD
  
  // If no credentials configured, allow public access
  if (!username || !password) {
    return NextResponse.next()
  }
  
  // Skip auth for API routes (they have their own auth)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Check for Basic Auth header
  const authHeader = request.headers.get('authorization')
  
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')
    
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const [user, pass] = decoded.split(':')
      
      if (user === username && pass === password) {
        return NextResponse.next()
      }
    }
  }
  
  // Request authentication
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="NeuralMD"',
    },
  })
}

// Apply to all routes except static files and api
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
