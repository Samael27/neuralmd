import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isMultiTenant } from '@/lib/multi-tenant'
import { generateApiKey, hashApiKey } from '@/lib/auth'
import crypto from 'crypto'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

/**
 * Hash password with salt
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// POST /api/auth/signup - Create a new user account
export async function POST(request: NextRequest) {
  // Only available in multi-tenant mode
  if (!isMultiTenant()) {
    return NextResponse.json(
      { error: 'Signup not available in single-tenant mode' },
      { status: 400 }
    )
  }
  
  try {
    const body = await request.json()
    const { email, password, name } = signupSchema.parse(body)
    
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }
    
    // Create user
    const passwordHash = hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        plan: 'free',
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      }
    })
    
    // Create a default API key for the user
    const apiKey = generateApiKey()
    await prisma.apiKey.create({
      data: {
        name: 'Default Key',
        keyHash: hashApiKey(apiKey),
        userId: user.id,
      }
    })
    
    return NextResponse.json({
      user,
      apiKey, // Return the key once (user must save it)
      message: 'Account created successfully. Save your API key - it cannot be retrieved later.'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Signup failed:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}
