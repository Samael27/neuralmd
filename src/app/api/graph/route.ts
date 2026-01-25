import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authCheck, authErrorResponse } from '@/lib/auth'

interface GraphNode {
  id: string
  title: string
  tags: string[]
  source: string
}

interface GraphEdge {
  source: string
  target: string
  similarity: number
}

// GET /api/graph - Get graph data for visualization
// ?threshold=0.3 - Minimum similarity for connections (default 0.3)
// ?limit=50 - Maximum number of notes to include
export async function GET(request: NextRequest) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { searchParams } = new URL(request.url)
  const threshold = parseFloat(searchParams.get('threshold') || '0.3')
  const limit = parseInt(searchParams.get('limit') || '50')
  
  try {
    // Get all notes with embeddings
    const notes = await prisma.note.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        tags: true,
        source: true,
      }
    })
    
    // Calculate similarities between all pairs of notes
    // Using raw SQL for vector similarity
    const similarities = await prisma.$queryRaw<Array<{
      id1: string
      id2: string
      similarity: number
    }>>`
      SELECT 
        n1.id as id1,
        n2.id as id2,
        1 - (n1.embedding <=> n2.embedding) as similarity
      FROM notes n1
      CROSS JOIN notes n2
      WHERE n1.id < n2.id
        AND n1.embedding IS NOT NULL
        AND n2.embedding IS NOT NULL
        AND 1 - (n1.embedding <=> n2.embedding) > ${threshold}
      ORDER BY similarity DESC
      LIMIT 500
    `
    
    // Build graph data
    const nodes: GraphNode[] = notes.map(note => ({
      id: note.id,
      title: note.title,
      tags: note.tags,
      source: note.source
    }))
    
    const edges: GraphEdge[] = similarities.map(s => ({
      source: s.id1,
      target: s.id2,
      similarity: Number(s.similarity)
    }))
    
    // Filter nodes to only include those with connections
    const connectedIds = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ])
    const connectedNodes = nodes.filter(n => connectedIds.has(n.id))
    
    return NextResponse.json({
      nodes: connectedNodes,
      edges,
      stats: {
        totalNotes: notes.length,
        connectedNotes: connectedNodes.length,
        connections: edges.length,
        threshold
      }
    })
  } catch (error) {
    console.error('Failed to get graph:', error)
    return NextResponse.json(
      { error: 'Failed to get graph data' },
      { status: 500 }
    )
  }
}
