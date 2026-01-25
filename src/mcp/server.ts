#!/usr/bin/env node
/**
 * NeuralMD MCP Server
 * 
 * Model Context Protocol server for NeuralMD note-taking system.
 * Provides tools for creating, searching, and managing notes with semantic embeddings.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Embedding configuration
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'ollama';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
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
      // Ollama
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

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'neuralmd',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_note',
        description: 'Create a new note with automatic semantic embedding generation',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the note',
            },
            content: {
              type: 'string',
              description: 'Content of the note (markdown supported)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
            source: {
              type: 'string',
              enum: ['human', 'ai', 'import'],
              description: 'Source of the note',
              default: 'ai',
            },
            sourceRef: {
              type: 'string',
              description: 'Reference to source (URL, file path, etc.)',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'search_notes',
        description: 'Search notes using semantic similarity (vector search)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - will find semantically similar notes',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
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
            id: {
              type: 'string',
              description: 'Note ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_note',
        description: 'Update an existing note',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Note ID to update',
            },
            title: {
              type: 'string',
              description: 'New title',
            },
            content: {
              type: 'string',
              description: 'New content',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'New tags',
            },
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
            id: {
              type: 'string',
              description: 'Note ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_notes',
        description: 'List all notes with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of notes to return',
              default: 50,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
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
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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

        // Generate embedding
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
          note = (result as any[])[0];
        } else {
          note = await prisma.note.create({
            data: { title, content, tags, source, sourceRef },
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                note,
                embeddingGenerated: !!embedding,
              }, null, 2),
            },
          ],
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
          // Fallback to text search
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
            content: [
              {
                type: 'text',
                text: JSON.stringify({ notes, searchType: 'text' }, null, 2),
              },
            ],
          };
        }

        // Vector similarity search
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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ notes, searchType: 'semantic' }, null, 2),
            },
          ],
        };
      }

      case 'get_note': {
        const { id } = args as { id: string };
        const note = await prisma.note.findUnique({ where: { id } });
        
        if (!note) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Note not found' }) }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
        };
      }

      case 'update_note': {
        const { id, title, content, tags } = args as {
          id: string;
          title?: string;
          content?: string;
          tags?: string[];
        };

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (tags !== undefined) updateData.tags = tags;

        // Regenerate embedding if content changed
        if (title !== undefined || content !== undefined) {
          const existing = await prisma.note.findUnique({ where: { id } });
          if (existing) {
            const newTitle = title ?? existing.title;
            const newContent = content ?? existing.content;
            const embedding = await generateEmbedding(`${newTitle}\n\n${newContent}`);
            
            if (embedding) {
              const embeddingStr = `[${embedding.join(',')}]`;
              await prisma.$executeRaw`
                UPDATE notes 
                SET title = ${newTitle},
                    content = ${newContent},
                    tags = ${tags ?? existing.tags},
                    embedding = ${embeddingStr}::vector,
                    "updatedAt" = NOW()
                WHERE id = ${id}
              `;
              const updated = await prisma.note.findUnique({ where: { id } });
              return {
                content: [{ type: 'text', text: JSON.stringify({ success: true, note: updated }, null, 2) }],
              };
            }
          }
        }

        const note = await prisma.note.update({
          where: { id },
          data: updateData,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, note }, null, 2) }],
        };
      }

      case 'delete_note': {
        const { id } = args as { id: string };
        await prisma.note.delete({ where: { id } });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: id }) }],
        };
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
          select: {
            id: true,
            title: true,
            tags: true,
            source: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const total = await prisma.note.count({
          where: tags && tags.length > 0 ? { tags: { hasSome: tags } } : undefined,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify({ notes, total, limit, offset }, null, 2) }],
        };
      }

      case 'list_tags': {
        const result = await prisma.$queryRaw`
          SELECT DISTINCT unnest(tags) as tag FROM notes ORDER BY tag
        `;
        const tags = (result as any[]).map(r => r.tag);
        return {
          content: [{ type: 'text', text: JSON.stringify({ tags }) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

/**
 * List available resources (notes as resources)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const notes = await prisma.note.findMany({
    take: 100,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true },
  });

  return {
    resources: notes.map(note => ({
      uri: `note://${note.id}`,
      name: note.title,
      mimeType: 'text/markdown',
    })),
  };
});

/**
 * Read a specific resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^note:\/\/(.+)$/);
  
  if (!match) {
    throw new Error(`Invalid URI: ${uri}`);
  }

  const id = match[1];
  const note = await prisma.note.findUnique({ where: { id } });

  if (!note) {
    throw new Error(`Note not found: ${id}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: `# ${note.title}\n\n${note.content}\n\n---\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}\nUpdated: ${note.updatedAt}`,
      },
    ],
  };
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NeuralMD MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
