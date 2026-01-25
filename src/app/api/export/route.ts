import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authCheck, authErrorResponse } from '@/lib/auth'

// GET /api/export - Export all notes
// ?format=json (default) | markdown
export async function GET(request: NextRequest) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const tag = searchParams.get('tag') // Optional: filter by tag
  
  try {
    const where = tag ? { tags: { has: tag } } : {}
    
    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: 'asc' },
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
    
    if (format === 'markdown') {
      // Export as single markdown file with all notes
      const markdown = notes.map(note => {
        const frontmatter = [
          '---',
          `id: ${note.id}`,
          `title: "${note.title.replace(/"/g, '\\"')}"`,
          `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`,
          `source: ${note.source}`,
          `created: ${note.createdAt}`,
          `updated: ${note.updatedAt}`,
          '---',
        ].join('\n')
        
        return `${frontmatter}\n\n# ${note.title}\n\n${note.content}`
      }).join('\n\n---\n\n')
      
      const filename = `neuralmd-export-${new Date().toISOString().split('T')[0]}.md`
      
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      })
    }
    
    // Default: JSON export
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      count: notes.length,
      notes: notes
    }
    
    const filename = `neuralmd-export-${new Date().toISOString().split('T')[0]}.json`
    
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}
