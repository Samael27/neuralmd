# 🧠 NeuralMD

> AI-Native Knowledge Base with Semantic Connections

NeuralMD is your second brain — a place where **humans and AI** collaborate to store, connect, and retrieve knowledge. Unlike traditional note-taking apps, NeuralMD uses semantic embeddings to automatically find connections between your ideas.

## ✨ Features

- **📝 Markdown First** — Write in plain markdown. Simple, portable, version-control friendly.
- **🔍 Semantic Search** — Find notes by meaning, not just keywords. "What did I learn about X?" just works.
- **🤖 AI-Native** — Your AI assistant can read AND write notes via API or MCP.
- **🔗 Auto-Connections** — Automatically discover related notes based on semantic similarity.
- **🏠 Self-Hosted** — Your data stays yours. Deploy on your own infrastructure.
- **☁️ Cloud Ready** — Or use our hosted version (coming soon).

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/Samael27/neuralmd.git
cd neural-md

# Copy environment file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start with Docker Compose
docker compose up -d
```

App will be available at `http://localhost:3000`

### Manual Setup

```bash
# Install dependencies
npm install

# Setup database (PostgreSQL with pgvector required)
npx prisma db push

# Start development server
npm run dev
```

## 📡 API

### Create a Note

```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting Notes - Project Alpha",
    "content": "Discussed the new architecture...",
    "tags": ["meetings", "project-alpha"],
    "source": "human"
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What decisions did we make about architecture?",
    "limit": 10
  }'
```

### List Notes

```bash
curl http://localhost:3000/api/notes?limit=20&tag=meetings
```

## 🔌 MCP Integration

NeuralMD implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for seamless AI assistant integration.

### HTTP Transport (Recommended for SaaS/Remote)

```bash
# Discovery endpoint
curl https://your-instance.com/api/mcp

# MCP JSON-RPC calls
curl -X POST https://your-instance.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_notes",
      "arguments": {"query": "architecture decisions", "limit": 5}
    }
  }'
```

### stdio Transport (For Self-Hosted)

```json
{
  "mcpServers": {
    "neuralmd": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "OLLAMA_URL": "http://localhost:11434"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create a note with auto-embedding |
| `search_notes` | Semantic search across notes |
| `get_note` | Get note by ID |
| `update_note` | Update note (re-embeds) |
| `delete_note` | Delete note |
| `list_notes` | List notes with pagination |
| `list_tags` | List all unique tags |

### Clawdbot Skill

A ready-to-use skill is included in `skills/neuralmd/`. Copy it to your Clawdbot skills directory or reference it directly.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + pgvector
- **ORM**: Prisma
- **Embeddings**: Ollama (nomic-embed-text) or OpenAI (text-embedding-3-small)
- **MCP**: Model Context Protocol (HTTP + stdio transports)
- **Language**: TypeScript

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with 🧠 by humans and AI working together.
