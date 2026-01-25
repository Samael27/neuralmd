/**
 * NeuralMD MCP HTTP Transport
 * 
 * Exposes MCP protocol over HTTP for remote access.
 * Compatible with MCP clients that support HTTP transport.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Embedding configuration
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'ollama';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate embeddings for text content
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (EMBEDDING_PROVIDER === 'openai' && OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });
      const data = await response.json();
      return data.data?.[0]?.embedding || null;
    } else {
      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: text,
        }),
      });
      const data = await response.json();
      return data.embedding || null;
    }
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

// Tool definitions
const TOOLS = [
  {
    name: 'create_note',
    description: 'Create a new note with automatic semantic embedding generation',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the note' },
        content: { type: 'string', description: 'Content of the note (markdown supported)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        source: { type: 'string', enum: ['human', 'ai', 'import'], description: 'Source of the note', default: 'ai' },
        sourceRef: { type: 'string', description: 'Reference to source (URL, file path, etc.)' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_notes',
    description: 'Search notes using semantic similarity (vector search). Returns notes ranked by relevance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query - will find semantically similar notes' },
        limit: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_note',
    description: 'Get a specific note by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note (re-generates embedding if content changes)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID to update' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of notes to return', default: 50 },
        offset: { type: 'number', description: 'Offset for pagination', default: 0 },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      },
    },
  },
  {
    name: 'list_tags',
    description: 'List all unique tags used across notes',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Handle tool execution
 */
async function executeTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'create_note': {
        const { title, content, tags = [], source = 'ai', sourceRef } = args as {
          title: string;
          content: string;
          tags?: string[];
          source?: string;
          sourceRef?: string;
        };

        const embeddingText = `${title}\n\n${content}`;
        const embedding = await generateEmbedding(embeddingText);

        let note;
        if (embedding) {
          const embeddingStr = `[${embedding.join(',')}]`;
          const result = await prisma.$queryRaw`
            INSERT INTO notes (id, title, content, tags, source, "sourceRef", embedding, "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid()::text,
              ${title},
              ${content},
              ${tags},
              ${source},
              ${sourceRef || null},
              ${embeddingStr}::vector,
              NOW(),
              NOW()
            )
            RETURNING id, title, content, tags, source, "sourceRef", "createdAt", "updatedAt"
          `;
          note = (result as unknown[])[0];
        } else {
          note = await prisma.note.create({
            data: { title, content, tags, source, sourceRef },
          });
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, note, embeddingGenerated: !!embedding }, null, 2) }],
        };
      }

      case 'search_notes': {
        const { query, limit = 10, tags } = args as {
          query: string;
          limit?: number;
          tags?: string[];
        };

        const embedding = await generateEmbedding(query);

        if (!embedding) {
          const notes = await prisma.note.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
              ],
              ...(tags && tags.length > 0 ? { tags: { hasSome: tags } } : {}),
            },
            take: limit,
            orderBy: { updatedAt: 'desc' },
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ notes, searchType: 'text' }, null, 2) }],
          };
        }

        const embeddingStr = `[${embedding.join(',')}]`;
        let notes;

        if (tags && tags.length > 0) {
          notes = await prisma.$queryRaw`
            SELECT id, title, content, tags, source, "sourceRef", "createdAt", "updatedAt",
                   1 - (embedding <=> ${embeddingStr}::vector) as similarity
            FROM notes
            WHERE embedding IS NOT NULL
              AND tags && ${tags}::text[]
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${limit}
          `;
        } else {
          notes = await prisma.$queryRaw`
            SELECT id, title, content, tags, source, "sourceRef", "createdAt", "updatedAt",
                   1 - (embedding <=> ${embeddingStr}::vector) as similarity
            FROM notes
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${limit}
          `;
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ notes, searchType: 'semantic' }, null, 2) }],
        };
      }

      case 'get_note': {
        const { id } = args as { id: string };
        const note = await prisma.note.findUnique({ where: { id } });

        if (!note) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Note not found' }) }], isError: true };
        }

        return { content: [{ type: 'text', text: JSON.stringify(note, null, 2) }] };
      }

      case 'update_note': {
        const { id, title, content, tags } = args as {
          id: string;
          title?: string;
          content?: string;
          tags?: string[];
        };

        const existing = await prisma.note.findUnique({ where: { id } });
        if (!existing) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Note not found' }) }], isError: true };
        }

        const newTitle = title ?? existing.title;
        const newContent = content ?? existing.content;
        const newTags = tags ?? existing.tags;

        if (title !== undefined || content !== undefined) {
          const embedding = await generateEmbedding(`${newTitle}\n\n${newContent}`);

          if (embedding) {
            const embeddingStr = `[${embedding.join(',')}]`;
            await prisma.$executeRaw`
              UPDATE notes 
              SET title = ${newTitle},
                  content = ${newContent},
                  tags = ${newTags},
                  embedding = ${embeddingStr}::vector,
                  "updatedAt" = NOW()
              WHERE id = ${id}
            `;
            const updated = await prisma.note.findUnique({ where: { id } });
            return { content: [{ type: 'text', text: JSON.stringify({ success: true, note: updated }, null, 2) }] };
          }
        }

        const note = await prisma.note.update({
          where: { id },
          data: { title: newTitle, content: newContent, tags: newTags },
        });

        return { content: [{ type: 'text', text: JSON.stringify({ success: true, note }, null, 2) }] };
      }

      case 'delete_note': {
        const { id } = args as { id: string };
        await prisma.note.delete({ where: { id } });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: id }) }] };
      }

      case 'list_notes': {
        const { limit = 50, offset = 0, tags } = args as {
          limit?: number;
          offset?: number;
          tags?: string[];
        };

        const notes = await prisma.note.findMany({
          where: tags && tags.length > 0 ? { tags: { hasSome: tags } } : undefined,
          take: limit,
          skip: offset,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, tags: true, source: true, createdAt: true, updatedAt: true },
        });

        const total = await prisma.note.count({
          where: tags && tags.length > 0 ? { tags: { hasSome: tags } } : undefined,
        });

        return { content: [{ type: 'text', text: JSON.stringify({ notes, total, limit, offset }, null, 2) }] };
      }

      case 'list_tags': {
        const result = await prisma.$queryRaw`
          SELECT DISTINCT unnest(tags) as tag FROM notes ORDER BY tag
        `;
        const tagList = (result as Array<{ tag: string }>).map(r => r.tag);
        return { content: [{ type: 'text', text: JSON.stringify({ tags: tagList }) }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

/**
 * MCP HTTP Handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0') {
      return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } });
    }

    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'neuralmd', version: '1.0.0' },
        };
        break;

      case 'tools/list':
        result = { tools: TOOLS };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        result = await executeTool(name, args || {});
        break;

      case 'resources/list':
        const notes = await prisma.note.findMany({
          take: 100,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true },
        });
        result = {
          resources: notes.map(note => ({
            uri: `note://${note.id}`,
            name: note.title,
            mimeType: 'text/markdown',
          })),
        };
        break;

      case 'resources/read':
        const uri = params.uri;
        const match = uri.match(/^note:\/\/(.+)$/);
        if (!match) {
          return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Invalid URI: ${uri}` } });
        }
        const noteId = match[1];
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) {
          return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Note not found: ${noteId}` } });
        }
        result = {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: `# ${note.title}\n\n${note.content}\n\n---\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}\nUpdated: ${note.updatedAt}`,
          }],
        };
        break;

      default:
        return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }

    return NextResponse.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    console.error('MCP error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' },
    });
  }
}

/**
 * GET endpoint for service discovery / health check
 */
export async function GET() {
  return NextResponse.json({
    name: 'neuralmd',
    version: '1.0.0',
    protocol: 'mcp',
    protocolVersion: '2024-11-05',
    capabilities: ['tools', 'resources'],
    tools: TOOLS.map(t => t.name),
  });
}
