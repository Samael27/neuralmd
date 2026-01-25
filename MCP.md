# NeuralMD MCP Server

Model Context Protocol (MCP) server for NeuralMD, enabling AI assistants to interact with your knowledge base.

## Features

- **Semantic Search**: Find notes by meaning, not just keywords
- **CRUD Operations**: Create, read, update, delete notes
- **Tag Management**: Filter and organize with tags
- **Auto-Embeddings**: Automatic vector generation for all notes

## Installation

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neuralmd": {
      "command": "node",
      "args": ["/path/to/neuralmd/dist/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/neuralmd",
        "EMBEDDING_PROVIDER": "ollama",
        "OLLAMA_URL": "http://localhost:11434",
        "OLLAMA_EMBEDDING_MODEL": "nomic-embed-text"
      }
    }
  }
}
```

### For Clawdbot

Add to your Clawdbot config (`~/.clawdbot/config.yaml`):

```yaml
mcp:
  servers:
    neuralmd:
      command: node
      args:
        - /path/to/neuralmd/dist/mcp/server.js
      env:
        DATABASE_URL: postgresql://user:pass@localhost:5432/neuralmd
        EMBEDDING_PROVIDER: ollama
        OLLAMA_URL: http://localhost:11434
```

## Available Tools

### `create_note`
Create a new note with automatic embedding generation.

```json
{
  "title": "Meeting Notes",
  "content": "Discussed Q1 roadmap...",
  "tags": ["meetings", "q1"],
  "source": "ai"
}
```

### `search_notes`
Semantic search across all notes.

```json
{
  "query": "what did we discuss about the roadmap?",
  "limit": 5,
  "tags": ["meetings"]
}
```

### `get_note`
Retrieve a specific note by ID.

### `update_note`
Update note content (re-generates embedding automatically).

### `delete_note`
Remove a note from the database.

### `list_notes`
List all notes with pagination and tag filtering.

### `list_tags`
Get all unique tags used in the knowledge base.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `EMBEDDING_PROVIDER` | `ollama` or `openai` | `ollama` |
| `OLLAMA_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_EMBEDDING_MODEL` | Ollama model for embeddings | `nomic-embed-text` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | - |

## Development

```bash
# Run in development mode (with hot reload)
npm run mcp:dev

# Build for production
npm run mcp:build

# Run production build
npm run mcp
```

## Protocol

NeuralMD MCP server uses stdio transport, compatible with any MCP client.
