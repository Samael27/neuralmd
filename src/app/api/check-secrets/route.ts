import { NextRequest, NextResponse } from 'next/server'
import { detectSecrets, getSecretTypes } from '@/lib/secrets-detector'
import { z } from 'zod'

const checkSchema = z.object({
  content: z.string().min(1),
})

// POST /api/check-secrets - Check content for sensitive data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content } = checkSchema.parse(body)
    
    const result = detectSecrets(content)
    
    return NextResponse.json({
      hasSensitiveData: result.hasSensitiveData,
      secretsCount: result.matches.length,
      secrets: result.matches.map(m => ({
        type: m.type,
        pattern: m.pattern,
        masked: m.masked,
        position: { start: m.startIndex, end: m.endIndex }
      })),
      sanitizedPreview: result.hasSensitiveData ? result.sanitizedContent : null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    )
  }
}

// GET /api/check-secrets - Get supported secret types
export async function GET() {
  return NextResponse.json({
    supportedTypes: getSecretTypes(),
    description: 'Types of secrets that can be detected'
  })
}
