import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateApiKey, hashApiKey } from '@/lib/auth'
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

// GET /api/keys - List all API keys (admin only)
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
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
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Failed to list keys:', error)
    return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 })
  }
}

// POST /api/keys - Create a new API key (admin only)
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
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

// DELETE /api/keys?id=xxx - Revoke an API key (admin only)
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
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
