---
name: neuralmd
description: Interact with NeuralMD knowledge base via MCP HTTP API. Use for creating notes, semantic search, managing knowledge. Triggers on "neuralmd", "knowledge base", "notes", "second brain", or when user wants to store/retrieve information semantically.
---

# NeuralMD Skill

AI-native knowledge base with semantic search via MCP protocol.

## Configuration

Set the NeuralMD endpoint in your environment or TOOLS.md:

```
NEURALMD_URL=https://your-neuralmd-instance.example.com
```

Or for self-hosted:
```
NEURALMD_URL=http://localhost:3000
```

## MCP Endpoint

All operations use JSON-RPC 2.0 via POST to `${NEURALMD_URL}/api/mcp`

## Available Tools

### create_note
Create a note with automatic semantic embedding.

```bash
curl -X POST "${NEURALMD_URL}/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_note",
      "arguments": {
        "title": "Note Title",
        "content": "Markdown content here",
        "tags": ["tag1", "tag2"],
        "source": "ai"
      }
    }
  }'
```

### search_notes
Semantic search across all notes. Returns ranked by similarity.

```bash
curl -X POST "${NEURALMD_URL}/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_notes",
      "arguments": {
        "query": "your search query",
        "limit": 5,
        "tags": ["optional-filter"]
      }
    }
  }'
```

### list_notes
List all notes with pagination.

```bash
curl -X POST "${NEURALMD_URL}/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_notes",
      "arguments": {"limit": 20, "offset": 0}
    }
  }'
```

### get_note
Get a specific note by ID.

### update_note
Update note content (regenerates embedding).

### delete_note
Delete a note by ID.

### list_tags
List all unique tags.

## Usage Patterns

### Store information for later
When user shares information worth remembering:
1. Create a note with relevant title and tags
2. Use "ai" as source to mark AI-created notes

### Recall information
When user asks about something that might be in notes:
1. Search semantically with their query
2. Return relevant notes with similarity scores

### Knowledge management
- Use tags for categorization
- Link related notes via content references
- Regular cleanup of outdated notes

## Response Format

All tools return JSON-RPC responses:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "..."}]
  }
}
```

Parse the `text` field as JSON for structured data.
