# NeuralMD Installation Guide

> For humans AND AI assistants. Follow these steps to deploy NeuralMD.

## Quick Decision Tree

```
Do you have Docker?
├── YES → Use Docker Compose (recommended)
│   ├── Want managed hosting? → Use Coolify
│   └── Self-hosted? → docker compose up
└── NO → Manual installation (Node.js + PostgreSQL)
```

## Prerequisites

### Required
- **PostgreSQL 15+** with pgvector extension
- **Node.js 20+** (for manual install)
- **Docker + Docker Compose** (for containerized install)

### For Embeddings (choose one)
- **Ollama** (recommended, free, self-hosted)
- **OpenAI API** (paid, cloud)

---

## Option 1: Docker Compose (Recommended)

### Step 1: Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/neuralmd.git
cd neuralmd
```

### Step 2: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database (auto-configured by Docker Compose)
DATABASE_URL=postgresql://neuralmd:neuralmd@postgres:5432/neuralmd

# Embeddings - Ollama (default, included in docker-compose)
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OR OpenAI (if you prefer cloud embeddings)
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

### Step 3: Start services

```bash
docker compose up -d
```

This starts:
- **app** (Next.js on port 3000)
- **postgres** (PostgreSQL + pgvector on port 5432)
- **ollama** (Embeddings on port 11434)

### Step 4: Wait for Ollama to download model

First startup takes ~5 minutes while Ollama downloads `nomic-embed-text`.

```bash
# Check logs
docker compose logs -f ollama

# When you see "model loaded", it's ready
```

### Step 5: Verify installation

```bash
# Health check
curl http://localhost:3000/api/health

# MCP endpoint
curl http://localhost:3000/api/mcp
```

Expected MCP response:
```json
{
  "name": "neuralmd",
  "version": "1.0.0",
  "protocol": "mcp",
  "capabilities": ["tools", "resources"],
  "tools": ["create_note", "search_notes", ...]
}
```

---

## Option 2: Coolify Deployment

For managed deployment on your VPS.

### Step 1: Add application in Coolify

1. Go to your Coolify dashboard
2. Add new resource → Application → Docker Compose
3. Source: GitHub → `YOUR_USERNAME/neuralmd`
4. Branch: `main`

### Step 2: Configure environment variables

In Coolify, set these environment variables:

```
POSTGRES_USER=neuralmd
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=neuralmd
DATABASE_URL=postgresql://neuralmd:<password>@postgres:5432/neuralmd
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 3: Configure domain

Add your domain (e.g., `neuralmd.yourdomain.com`) and enable SSL.

### Step 4: Deploy

Click Deploy. Wait 5-10 minutes for initial build + Ollama model download.

---

## Option 3: Manual Installation

### Step 1: Install PostgreSQL with pgvector

```bash
# Ubuntu/Debian
sudo apt install postgresql-15 postgresql-15-pgvector

# macOS
brew install postgresql@15 pgvector
```

Create database:
```sql
CREATE DATABASE neuralmd;
\c neuralmd
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 2: Install Ollama

```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Pull embedding model
ollama pull nomic-embed-text
```

### Step 3: Clone and setup

```bash
git clone https://github.com/YOUR_USERNAME/neuralmd.git
cd neuralmd
npm install
```

### Step 4: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/neuralmd
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Step 5: Initialize database

```bash
npx prisma db push
```

### Step 6: Start

```bash
npm run dev      # Development
npm run build && npm start  # Production
```

---

## MCP Integration

### For Claude Desktop / Cline / Continue

Add to your MCP config:

**HTTP Transport (remote/SaaS):**
```json
{
  "mcpServers": {
    "neuralmd": {
      "transport": "http",
      "url": "https://your-neuralmd-instance.com/api/mcp"
    }
  }
}
```

**stdio Transport (local):**
```json
{
  "mcpServers": {
    "neuralmd": {
      "command": "node",
      "args": ["/path/to/neuralmd/dist/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "OLLAMA_URL": "http://localhost:11434"
      }
    }
  }
}
```

### For Clawdbot

Copy the skill to your skills directory:

```bash
# From NeuralMD repo
cp -r skills/neuralmd /path/to/clawdbot/skills/

# Or reference directly in TOOLS.md
echo "NEURALMD_URL=https://your-instance.com" >> TOOLS.md
```

---

## Verification Checklist

Run these commands to verify your installation:

```bash
# 1. API Health
curl -f http://localhost:3000/api/health && echo "✓ API healthy"

# 2. MCP Discovery
curl -f http://localhost:3000/api/mcp | grep -q "neuralmd" && echo "✓ MCP available"

# 3. Create test note
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Hello NeuralMD!","source":"human"}' \
  && echo "✓ Note creation works"

# 4. Search test
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"hello"}' \
  | grep -q "Test" && echo "✓ Semantic search works"
```

All 4 checks should pass ✓

---

## Troubleshooting

### "Connection refused" on Ollama
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve
```

### "vector type not found" in PostgreSQL
```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Embeddings return empty
```bash
# Verify model is downloaded
ollama list | grep nomic-embed-text

# If not present:
ollama pull nomic-embed-text
```

### Docker build fails on "npm ci"
The Dockerfile uses `npm install --legacy-peer-deps`. If you still have issues:
```bash
# Clean rebuild
docker compose build --no-cache
```

---

## Security Configuration

### Local Development

For local installs, no auth is needed. Set:
```env
API_AUTH_REQUIRED=false
```

### VPS Self-Hosting (Protected Data)

For VPS deployments where you want to protect your data:

```env
# Enable API authentication
API_AUTH_REQUIRED=true

# Generate a random internal token
# openssl rand -hex 32
INTERNAL_API_TOKEN=<your-64-char-hex-token>

# Admin secret for managing API keys
ADMIN_SECRET=<your-admin-secret>
```

**How it works:**
- Web UI uses the internal token (server-side, never exposed)
- External API calls require an API key
- Generate API keys via admin endpoint: `POST /api/keys` with `Authorization: Bearer <ADMIN_SECRET>`

### Generate an API Key

```bash
# Create a new API key
curl -X POST https://your-domain.com/api/keys \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'

# Response: { "key": "nmd_xxx...", "id": "...", "name": "My App" }
# Save the key! It won't be shown again.
```

### Use the API Key

```bash
curl https://your-domain.com/api/notes \
  -H "Authorization: Bearer nmd_xxx..."
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | - | PostgreSQL connection string |
| `EMBEDDING_PROVIDER` | - | `ollama` | `ollama` or `openai` |
| `OLLAMA_URL` | - | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_EMBEDDING_MODEL` | - | `nomic-embed-text` | Model for embeddings |
| `OPENAI_API_KEY` | - | - | Required if using OpenAI |
| `NEXT_PUBLIC_APP_URL` | - | `http://localhost:3000` | Public URL |
| `API_AUTH_REQUIRED` | - | `true` | Enable API key authentication |
| `INTERNAL_API_TOKEN` | - | - | Token for SSR pages (when auth enabled) |
| `ADMIN_SECRET` | - | - | Secret for managing API keys |

---

## AI Assistant Notes

If you're an AI assistant helping someone install NeuralMD:

1. **Detect their environment** first (Docker available? Coolify? Manual?)
2. **Check prerequisites** before starting installation
3. **Run the verification checklist** at the end
4. **Report the MCP endpoint URL** so they can configure their tools

The MCP endpoint is always at `{base_url}/api/mcp`.
