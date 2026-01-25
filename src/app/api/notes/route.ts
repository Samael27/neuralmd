import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding, isEmbeddingEnabled, getEmbeddingDimensions } from '@/lib/embeddings'
import { detectSecrets } from '@/lib/secrets-detector'
import { authCheck, authErrorResponse } from '@/lib/auth'
import { z } from 'zod'

// Validation schema
const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  source: z.enum(['human', 'ai', 'import']).optional().default('human'),
  sourceRef: z.string().optional(),
  // Security options
  allowSecrets: z.boolean().optional().default(false),
  sanitizeSecrets: z.boolean().optional().default(false),
})

// GET /api/notes - List all notes
export async function GET(request: NextRequest) {
  // Auth check (optional, based on API_AUTH_REQUIRED env)
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const tag = searchParams.get('tag')
  
  const where = tag ? { tags: { has: tag } } : {}
  
  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    }
  })
  
  const total = await prisma.note.count({ where })
  
  return NextResponse.json({
    notes,
    pagination: { total, limit, offset },
    embeddingsEnabled: isEmbeddingEnabled()
  })
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  // Auth check
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  try {
    const body = await request.json()
    const data = createNoteSchema.parse(body)
    
    // 🔐 Security: Detect secrets in content
    const fullText = `${data.title}\n${data.content}`
    const secretsCheck = detectSecrets(fullText)
    
    if (secretsCheck.hasSensitiveData) {
      // If secrets found and not explicitly allowed
      if (!data.allowSecrets && !data.sanitizeSecrets) {
        return NextResponse.json({
          error: 'Sensitive data detected',
          message: 'Your note contains potential secrets (API keys, passwords, tokens). Use allowSecrets=true to save anyway, or sanitizeSecrets=true to mask them.',
          secrets: secretsCheck.matches.map(m => ({
            type: m.type,
            pattern: m.pattern,
            masked: m.masked
          }))
        }, { status: 422 })
      }
      
      // Sanitize if requested
      if (data.sanitizeSecrets) {
        const titleCheck = detectSecrets(data.title)
        const contentCheck = detectSecrets(data.content)
        data.title = titleCheck.sanitizedContent
        data.content = contentCheck.sanitizedContent
      }
    }
    
    // Generate embedding for semantic search (if enabled)
    const textForEmbedding = `${data.title}\n\n${data.content}`
    const embedding = await generateEmbedding(textForEmbedding)
    
    let note
    
    if (embedding) {
      // Create note with embedding using raw SQL
      // Cast to vector without dimensions - PostgreSQL infers from data
      const embeddingStr = `[${embedding.join(',')}]`
      note = await prisma.$queryRaw`
        INSERT INTO notes (id, title, content, tags, source, "sourceRef", embedding, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${data.title},
          ${data.content},
          ${data.tags},
          ${data.source},
          ${data.sourceRef || null},
          ${embeddingStr}::vector,
          NOW(),
          NOW()
        )
        RETURNING id, title, content, tags, source, "sourceRef", "createdAt", "updatedAt"
      `
    } else {
      // Create note without embedding
      note = await prisma.note.create({
        data: {
          title: data.title,
          content: data.content,
          tags: data.tags,
          source: data.source,
          sourceRef: data.sourceRef,
        },
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          source: true,
          sourceRef: true,
          createdAt: true,
          updatedAt: true,
        }
      })
    }
    
    const result = Array.isArray(note) ? note[0] : note
    
    return NextResponse.json({
      note: result,
      embeddingGenerated: !!embedding,
      secretsSanitized: data.sanitizeSecrets && secretsCheck.hasSensitiveData,
      secretsAllowed: data.allowSecrets && secretsCheck.hasSensitiveData
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to create note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
