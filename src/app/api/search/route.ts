import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding, isEmbeddingEnabled } from '@/lib/embeddings'
import { authCheck, authErrorResponse } from '@/lib/auth'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.3),
})

// POST /api/search - Semantic search
export async function POST(request: NextRequest) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  try {
    const body = await request.json()
    const { query, limit, threshold } = searchSchema.parse(body)
    
    // Check if embeddings are enabled
    if (!isEmbeddingEnabled()) {
      // Fallback to basic text search
      const results = await prisma.note.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
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
      
      return NextResponse.json({
        query,
        results: results.map(r => ({ ...r, similarity: null })),
        count: results.length,
        searchType: 'text'
      })
    }
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)
    
    if (!queryEmbedding) {
      return NextResponse.json(
        { error: 'Failed to generate query embedding' },
        { status: 500 }
      )
    }
    
    // Perform semantic search using cosine similarity
    const embeddingStr = `[${queryEmbedding.join(',')}]`
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        title,
        content,
        tags,
        source,
        "createdAt",
        "updatedAt",
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM notes
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `
    
    return NextResponse.json({
      query,
      results,
      count: Array.isArray(results) ? results.length : 0,
      searchType: 'semantic'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Search failed:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
