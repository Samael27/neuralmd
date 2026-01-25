import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/embeddings'
import { detectSecrets } from '@/lib/secrets-detector'
import { authCheck, authErrorResponse } from '@/lib/auth'

interface ImportedNote {
  title: string
  content: string
  tags?: string[]
  source?: string
  sourceRef?: string
}

// Parse markdown with optional YAML frontmatter
function parseMarkdown(content: string): ImportedNote[] {
  const notes: ImportedNote[] = []
  
  // Split by --- separator (multiple notes in one file)
  const sections = content.split(/\n---\n/).filter(s => s.trim())
  
  for (const section of sections) {
    // Check for YAML frontmatter
    const frontmatterMatch = section.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/m)
    
    if (frontmatterMatch) {
      const [, frontmatter, body] = frontmatterMatch
      const note: ImportedNote = {
        title: '',
        content: body.trim(),
        tags: [],
        source: 'import'
      }
      
      // Parse frontmatter
      const lines = frontmatter.split('\n')
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/)
        if (match) {
          const [, key, value] = match
          if (key === 'title') {
            note.title = value.replace(/^["']|["']$/g, '')
          } else if (key === 'tags') {
            // Parse array format: [tag1, tag2] or tag1, tag2
            const tagsStr = value.replace(/^\[|\]$/g, '')
            note.tags = tagsStr.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
          } else if (key === 'source') {
            note.source = value
          }
        }
      }
      
      // Extract title from first H1 if not in frontmatter
      if (!note.title) {
        const h1Match = note.content.match(/^#\s+(.+)$/m)
        if (h1Match) {
          note.title = h1Match[1]
          // Remove H1 from content
          note.content = note.content.replace(/^#\s+.+\n*/m, '').trim()
        }
      }
      
      if (note.title && note.content) {
        notes.push(note)
      }
    } else {
      // No frontmatter - treat as simple markdown
      const lines = section.trim().split('\n')
      const h1Match = lines[0]?.match(/^#\s+(.+)$/)
      
      if (h1Match) {
        notes.push({
          title: h1Match[1],
          content: lines.slice(1).join('\n').trim(),
          tags: [],
          source: 'import'
        })
      } else if (section.trim()) {
        // Use first line as title
        notes.push({
          title: lines[0].slice(0, 100),
          content: section.trim(),
          tags: [],
          source: 'import'
        })
      }
    }
  }
  
  return notes
}

// POST /api/import - Import notes
// Body: { format: 'json' | 'markdown', data: string, skipSecrets?: boolean }
export async function POST(request: NextRequest) {
  const auth = await authCheck(request)
  if (!auth.authenticated) {
    return authErrorResponse(auth)
  }
  
  try {
    const body = await request.json()
    const { format = 'json', data, skipSecrets = false } = body
    
    if (!data) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      )
    }
    
    let notesToImport: ImportedNote[] = []
    
    if (format === 'json') {
      // Parse JSON export format
      const parsed = JSON.parse(data)
      if (parsed.notes && Array.isArray(parsed.notes)) {
        notesToImport = parsed.notes.map((n: Record<string, unknown>) => ({
          title: n.title as string,
          content: n.content as string,
          tags: (n.tags as string[]) || [],
          source: 'import',
          sourceRef: n.id as string // Keep original ID as reference
        }))
      } else if (Array.isArray(parsed)) {
        notesToImport = parsed
      }
    } else if (format === 'markdown') {
      notesToImport = parseMarkdown(data)
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use json or markdown' },
        { status: 400 }
      )
    }
    
    // Import notes
    const results = {
      total: notesToImport.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    for (const note of notesToImport) {
      try {
        // Check for secrets
        const secretsCheck = detectSecrets(`${note.title}\n${note.content}`)
        if (secretsCheck.hasSensitiveData && !skipSecrets) {
          results.skipped++
          results.errors.push(`Skipped "${note.title}": contains secrets`)
          continue
        }
        
        // Generate embedding
        const textForEmbedding = `${note.title}\n\n${note.content}`
        const embedding = await generateEmbedding(textForEmbedding)
        
        if (embedding) {
          const embeddingStr = `[${embedding.join(',')}]`
          await prisma.$queryRaw`
            INSERT INTO notes (id, title, content, tags, source, "sourceRef", embedding, "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid()::text,
              ${note.title},
              ${note.content},
              ${note.tags || []},
              ${note.source || 'import'},
              ${note.sourceRef || null},
              ${embeddingStr}::vector,
              NOW(),
              NOW()
            )
          `
        } else {
          await prisma.note.create({
            data: {
              title: note.title,
              content: note.content,
              tags: note.tags || [],
              source: note.source || 'import',
              sourceRef: note.sourceRef,
            }
          })
        }
        
        results.imported++
      } catch (err) {
        results.errors.push(`Failed to import "${note.title}": ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Import failed:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
