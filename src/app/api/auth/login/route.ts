import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isMultiTenant } from '@/lib/multi-tenant'
import { generateApiKey, hashApiKey } from '@/lib/auth'
import crypto from 'crypto'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

/**
 * Verify password against stored hash
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// POST /api/auth/login - Login and get/create API key
export async function POST(request: NextRequest) {
  // Only available in multi-tenant mode
  if (!isMultiTenant()) {
    return NextResponse.json(
      { error: 'Login not available in single-tenant mode' },
      { status: 400 }
    )
  }
  
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)
    
    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        passwordHash: true,
        createdAt: true,
      }
    })
    
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Get existing API keys or create a new one
    const existingKeys = await prisma.apiKey.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true }
    })
    
    let newApiKey: string | null = null
    
    if (existingKeys.length === 0) {
      // Create a new API key if none exist
      newApiKey = generateApiKey()
      await prisma.apiKey.create({
        data: {
          name: 'Login Key',
          keyHash: hashApiKey(newApiKey),
          userId: user.id,
        }
      })
    }
    
    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user
    
    return NextResponse.json({
      user: safeUser,
      apiKeys: existingKeys,
      newApiKey, // Only returned if a new key was created
      message: newApiKey 
        ? 'Login successful. A new API key was created - save it now!'
        : 'Login successful. Use one of your existing API keys.'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Login failed:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
