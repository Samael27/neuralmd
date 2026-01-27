import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// Rate limiting store (in-memory, reset on restart)
// For production, use Redis
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100 // requests per window

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const prefix = 'nmd_'
  const key = crypto.randomBytes(24).toString('base64url')
  return `${prefix}${key}`
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Extract API key from request
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }
  
  // Check query parameter (less secure, but useful for testing)
  const url = new URL(request.url)
  const apiKeyParam = url.searchParams.get('api_key')
  if (apiKeyParam) {
    return apiKeyParam
  }
  
  return null
}

/**
 * Validate API key and return associated data
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean
  keyId?: string
  name?: string
  userId?: string  // For multi-tenant mode
  error?: string
}> {
  if (!key || !key.startsWith('nmd_')) {
    return { valid: false, error: 'Invalid API key format' }
  }
  
  const hashedKey = hashApiKey(key)
  
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hashedKey }
    })
    
    if (!apiKey) {
      return { valid: false, error: 'API key not found' }
    }
    
    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is disabled' }
    }
    
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    })
    
    return { 
      valid: true, 
      keyId: apiKey.id, 
      name: apiKey.name,
      userId: apiKey.userId ?? undefined  // Multi-tenant: API key is tied to a user
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

/**
 * Check rate limit for an identifier (API key or IP)
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }
  
  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetAt: record.resetAt }
}

/**
 * Auth middleware result
 */
export interface AuthResult {
  authenticated: boolean
  keyId?: string
  keyName?: string
  userId?: string  // For multi-tenant mode
  error?: string
  rateLimited?: boolean
}

/**
 * Full auth check: API key validation + rate limiting
 */
export async function authCheck(request: NextRequest): Promise<AuthResult> {
  // Check if auth is required (can be disabled via env)
  const authRequired = process.env.API_AUTH_REQUIRED !== 'false'
  
  // Check for internal SSR token (server-side only, never exposed to client)
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    const requestToken = request.headers.get('X-Internal-Token')
    if (requestToken === internalToken) {
      return { authenticated: true }
    }
  }
  
  if (!authRequired) {
    // Rate limit by IP when auth is disabled
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateLimit = checkRateLimit(`ip:${ip}`)
    
    if (!rateLimit.allowed) {
      return { authenticated: false, rateLimited: true, error: 'Rate limit exceeded' }
    }
    
    return { authenticated: true }
  }
  
  // Extract and validate API key
  const apiKey = extractApiKey(request)
  
  if (!apiKey) {
    return { authenticated: false, error: 'API key required' }
  }
  
  const validation = await validateApiKey(apiKey)
  
  if (!validation.valid) {
    return { authenticated: false, error: validation.error }
  }
  
  // Rate limit by API key
  const rateLimit = checkRateLimit(`key:${validation.keyId}`)
  
  if (!rateLimit.allowed) {
    return { authenticated: false, rateLimited: true, error: 'Rate limit exceeded' }
  }
  
  return {
    authenticated: true,
    keyId: validation.keyId,
    keyName: validation.name,
    userId: validation.userId  // Multi-tenant: pass through user ID
  }
}

/**
 * Create auth error response
 */
export function authErrorResponse(result: AuthResult): NextResponse {
  if (result.rateLimited) {
    return NextResponse.json(
      { error: 'Too many requests', message: result.error },
      { status: 429 }
    )
  }
  
  return NextResponse.json(
    { error: 'Unauthorized', message: result.error },
    { status: 401 }
  )
}
