# 🧠 NeuralMD

> AI-Native Knowledge Base with Semantic Connections

NeuralMD is your **second brain** — a place where humans and AI collaborate to store, connect, and retrieve knowledge. Unlike traditional note-taking apps, NeuralMD uses **semantic embeddings** to automatically find connections between your ideas.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791)

## ✨ Features

- **🔍 Semantic Search** — Find notes by meaning, not just keywords
- **🔗 Auto-Connections** — Discover related notes via similarity graph
- **🤖 AI-Native** — MCP protocol for AI assistant integration
- **🏠 100% Self-Hosted** — Your data stays on your infrastructure
- **🔐 Secure** — API keys + optional Basic Auth for web UI
- **🆓 No API Keys Required** — Uses Ollama for free local embeddings
- **📝 Markdown First** — Simple, portable, version-control friendly

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose

### Installation

```bash
git clone https://github.com/Samael27/neuralmd.git
cd neuralmd
cp .env.example .env
docker compose up -d
```

**That's it!** Open http://localhost:3000 🎉

> First startup takes a few minutes (Ollama downloads the embedding model).

### Optional: Secure Your Instance

Edit `.env` to enable authentication:

```bash
# API Authentication (recommended for production)
API_AUTH_REQUIRED=true
INTERNAL_API_TOKEN=<generate-with: openssl rand -hex 32>
ADMIN_SECRET=<your-admin-secret>

# Web UI Authentication (optional Basic Auth)
UI_USERNAME=admin
UI_PASSWORD=<your-password>
```

## 🖥️ Screenshots

| Notes List | Semantic Graph |
|------------|----------------|
| Browse and search your knowledge | Visualize connections between ideas |

## 📡 API

### With Authentication

```bash
# Create an API key (requires ADMIN_SECRET)
curl -X POST https://your-instance/api/keys \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
# Returns: { "key": "nmd_xxx..." }

# Use the API key
curl https://your-instance/api/notes \
  -H "Authorization: Bearer nmd_xxx..."
```

### Create a Note

```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting Notes",
    "content": "Discussed the new architecture...",
    "tags": ["meetings", "architecture"],
    "source": "human"
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "architecture decisions", "limit": 10}'
```

## 🔌 MCP Integration

NeuralMD implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for seamless AI assistant integration.

### Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create a note with auto-embedding |
| `search_notes` | Semantic search across notes |
| `get_note` | Get note by ID |
| `update_note` | Update note content |
| `delete_note` | Delete a note |
| `list_notes` | List with pagination & filters |
| `list_tags` | List all unique tags |

### HTTP Transport

```bash
curl -X POST https://your-instance/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_notes",
      "arguments": {"query": "architecture", "limit": 5}
    }
  }'
```

### Clawdbot Integration

A ready-to-use skill is included in `skills/neuralmd/`.

## ☁️ Deploy to Production

### Coolify (Recommended)

1. Add new resource → Application → Docker Compose
2. Source: GitHub → `Samael27/neuralmd`
3. Docker Compose Location: `/docker-compose.coolify.yml`
4. Set environment variables in Coolify UI
5. Deploy!

See [INSTALL.md](INSTALL.md) for detailed instructions.

### Other Platforms

Works with any Docker-compatible platform:
- Portainer
- CapRover
- Railway
- Your own VPS

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Embeddings | Ollama (default) or OpenAI |
| Protocol | MCP (HTTP + stdio) |
| Auth | API keys + Basic Auth |

## 🤝 Contributing

Contributions welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit PRs

## 📄 License

[MIT License](LICENSE) — use it however you want.

---

<p align="center">
  Built with 🧠 by humans and AI working together
</p>
