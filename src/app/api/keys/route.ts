import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateApiKey, hashApiKey, authCheck } from '@/lib/auth'
import { isMultiTenant, checkPlanLimits, Plan } from '@/lib/multi-tenant'
import { z } from 'zod'

// Admin secret for managing keys (set via env)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production'

function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === ADMIN_SECRET
  }
  const adminHeader = request.headers.get('X-Admin-Secret')
  return adminHeader === ADMIN_SECRET
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().optional(),
})

// GET /api/keys - List API keys
// Admin: sees all keys
// User (multi-tenant): sees only their keys
export async function GET(request: NextRequest) {
  const admin = isAdmin(request)
  
  // In multi-tenant mode, users can list their own keys
  if (!admin && isMultiTenant()) {
    const auth = await authCheck(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const keys = await prisma.apiKey.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ keys })
  }
  
  // Admin access or single-tenant mode
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  
  try {
    const keys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Failed to list keys:', error)
    return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 })
  }
}

// POST /api/keys - Create a new API key
// Admin: can create keys for anyone
// User (multi-tenant): can create keys for themselves (within plan limits)
export async function POST(request: NextRequest) {
  const admin = isAdmin(request)
  let userId: string | null = null
  
  // In multi-tenant mode, users can create their own keys
  if (!admin && isMultiTenant()) {
    const auth = await authCheck(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    userId = auth.userId
    
    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const keyCount = await prisma.apiKey.count({ where: { userId, isActive: true } })
    const limitCheck = checkPlanLimits(user.plan as Plan, { apiKeysCount: keyCount })
    
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: 'Plan limit reached', 
        details: limitCheck.errors 
      }, { status: 403 })
    }
  } else if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { name, expiresInDays } = createKeySchema.parse(body)
    
    // Generate new key
    const plainKey = generateApiKey()
    const keyHash = hashApiKey(plainKey)
    
    // Calculate expiration
    let expiresAt: Date | null = null
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }
    
    // Store hashed key
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        expiresAt,
        userId, // Will be null for admin-created keys in single-tenant mode
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
      }
    })
    
    // Return the plain key (only time it's visible!)
    return NextResponse.json({
      key: plainKey,
      ...apiKey,
      warning: 'Save this key now! It cannot be retrieved later.'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Failed to create key:', error)
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }
}

// DELETE /api/keys?id=xxx - Revoke an API key
// Admin: can revoke any key
// User (multi-tenant): can only revoke their own keys
export async function DELETE(request: NextRequest) {
  const admin = isAdmin(request)
  
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
  }
  
  // In multi-tenant mode, users can revoke their own keys
  if (!admin && isMultiTenant()) {
    const auth = await authCheck(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Verify the key belongs to the user
    const key = await prisma.apiKey.findFirst({ 
      where: { id, userId: auth.userId } 
    })
    
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }
  } else if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  
  try {
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    })
    
    return NextResponse.json({ success: true, message: 'Key revoked' })
  } catch (error) {
    console.error('Failed to revoke key:', error)
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }
}
