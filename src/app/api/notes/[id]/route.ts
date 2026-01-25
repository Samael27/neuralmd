import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/embeddings'
import { detectSecrets } from '@/lib/secrets-detector'
import { authCheck, authErrorResponse } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for updates
const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  allowSecrets: z.boolean().optional().default(false),
  sanitizeSecrets: z.boolean().optional().default(false),
})

// GET /api/notes/[id] - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { id } = await params
  
  try {
    const note = await prisma.note.findUnique({
      where: { id },
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
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ note })
  } catch (error) {
    console.error('Failed to get note:', error)
    return NextResponse.json(
      { error: 'Failed to get note' },
      { status: 500 }
    )
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { id } = await params
  
  try {
    const body = await request.json()
    const data = updateNoteSchema.parse(body)
    
    // Check if note exists
    const existing = await prisma.note.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }
    
    // 🔐 Security: Detect secrets in updated content
    const newTitle = data.title || existing.title
    const newContent = data.content || existing.content
    const fullText = `${newTitle}\n${newContent}`
    const secretsCheck = detectSecrets(fullText)
    
    if (secretsCheck.hasSensitiveData && !data.allowSecrets && !data.sanitizeSecrets) {
      return NextResponse.json({
        error: 'Sensitive data detected',
        message: 'Your note contains potential secrets. Use allowSecrets=true or sanitizeSecrets=true.',
        secrets: secretsCheck.matches.map(m => ({
          type: m.type,
          pattern: m.pattern,
          masked: m.masked
        }))
      }, { status: 422 })
    }
    
    // Sanitize if requested
    if (data.sanitizeSecrets && secretsCheck.hasSensitiveData) {
      if (data.title) {
        data.title = detectSecrets(data.title).sanitizedContent
      }
      if (data.content) {
        data.content = detectSecrets(data.content).sanitizedContent
      }
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.tags !== undefined) updateData.tags = data.tags
    
    // If content or title changed, regenerate embedding
    if (data.title !== undefined || data.content !== undefined) {
      const newTitle = data.title || existing.title
      const newContent = data.content || existing.content
      const textForEmbedding = `${newTitle}\n\n${newContent}`
      const embedding = await generateEmbedding(textForEmbedding)
      
      if (embedding) {
        // Update with new embedding using raw SQL
        const embeddingStr = `[${embedding.join(',')}]`
        const note = await prisma.$queryRaw`
          UPDATE notes 
          SET 
            title = ${newTitle},
            content = ${newContent},
            tags = ${data.tags || existing.tags},
            embedding = ${embeddingStr}::vector,
            "updatedAt" = NOW()
          WHERE id = ${id}
          RETURNING id, title, content, tags, source, "sourceRef", "createdAt", "updatedAt"
        `
        const result = Array.isArray(note) ? note[0] : note
        return NextResponse.json({ note: result, embeddingRegenerated: true })
      }
    }
    
    // Update without changing embedding
    const note = await prisma.note.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json({ note, embeddingRegenerated: false })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Failed to update note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { id } = await params
  
  try {
    const note = await prisma.note.findUnique({ where: { id } })
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }
    
    await prisma.note.delete({ where: { id } })
    
    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error('Failed to delete note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
