# AGENTS.md - NeuralMD AI Assistant Guide

> Instructions for AI assistants working with this codebase.

## Project Overview

NeuralMD is an AI-native knowledge base with semantic search. It exposes a Model Context Protocol (MCP) server that allows AI assistants to store and retrieve knowledge.

## Architecture

```
neuralmd/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── notes/       # REST API for notes
│   │   │   ├── search/      # Semantic search endpoint
│   │   │   ├── mcp/         # MCP HTTP transport
│   │   │   └── health/      # Health check
│   │   └── page.tsx         # Landing page
│   ├── lib/
│   │   ├── db.ts            # Prisma client
│   │   └── embeddings.ts    # Ollama/OpenAI embeddings
│   └── mcp/
│       └── server.ts        # MCP stdio server
├── prisma/
│   └── schema.prisma        # Database schema
├── skills/
│   └── neuralmd/            # Clawdbot skill
├── docker-compose.yml       # Full stack deployment
├── Dockerfile               # Next.js container
├── INSTALL.md               # Human + AI installation guide
└── MCP.md                   # MCP protocol documentation
```

## Key Files

### When modifying the API
- `src/app/api/notes/route.ts` - CRUD operations
- `src/app/api/search/route.ts` - Semantic search
- `src/app/api/mcp/route.ts` - MCP HTTP endpoint

### When modifying embeddings
- `src/lib/embeddings.ts` - Embedding provider abstraction

### When modifying the database
- `prisma/schema.prisma` - Schema definition
- Run `npx prisma db push` after changes

### When modifying MCP tools
- `src/mcp/server.ts` - stdio server (tools defined here)
- `src/app/api/mcp/route.ts` - HTTP server (mirrors stdio)

## Common Tasks

### Add a new MCP tool

1. Add tool definition in `src/mcp/server.ts` under `server.setRequestHandler(ListToolsRequestSchema, ...)`
2. Add handler in `handleToolCall()` function
3. Mirror the same in `src/app/api/mcp/route.ts`
4. Update `skills/neuralmd/SKILL.md` documentation

### Modify note schema

1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Update API handlers if needed
4. Update MCP tool arguments if needed

### Add a new embedding provider

1. Add provider in `src/lib/embeddings.ts`
2. Add environment variables to `.env.example`
3. Update `INSTALL.md` with new provider instructions

## Testing

```bash
# Local development
npm run dev

# Test API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/mcp

# Test MCP call
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_notes","arguments":{}}}'
```

## Deployment

Deployments are handled via Coolify. Push to `main` branch triggers auto-deploy.

- **Production URL**: https://your-neuralmd-instance.example.com
- **MCP Endpoint**: https://your-neuralmd-instance.example.com/api/mcp

## MCP Protocol

See `MCP.md` for full protocol documentation.

Quick reference:
- GET `/api/mcp` → Server discovery
- POST `/api/mcp` → JSON-RPC 2.0 calls

Available methods:
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources

## Do's and Don'ts

### Do
- Test MCP changes with curl before pushing
- Update SKILL.md when adding/modifying tools
- Keep embeddings provider-agnostic
- Document environment variables

### Don't
- Don't commit `.env` files
- Don't hardcode URLs (use env vars)
- Don't bypass the embeddings abstraction layer
- Don't forget to update both MCP servers (stdio + HTTP)
