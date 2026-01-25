#!/bin/bash
# NeuralMD CLI helper
# Usage: neuralmd.sh <command> [args...]

NEURALMD_URL="${NEURALMD_URL:?NEURALMD_URL environment variable is required}"

mcp_call() {
  local method="$1"
  local name="$2"
  local args="$3"
  
  curl -s -X POST "${NEURALMD_URL}/api/mcp" \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"${method}\",
      \"params\": {
        \"name\": \"${name}\",
        \"arguments\": ${args}
      }
    }"
}

case "$1" in
  search)
    shift
    query="$*"
    mcp_call "tools/call" "search_notes" "{\"query\": \"${query}\", \"limit\": 5}"
    ;;
  create)
    title="$2"
    content="$3"
    tags="${4:-[]}"
    mcp_call "tools/call" "create_note" "{\"title\": \"${title}\", \"content\": \"${content}\", \"tags\": ${tags}, \"source\": \"ai\"}"
    ;;
  list)
    limit="${2:-20}"
    mcp_call "tools/call" "list_notes" "{\"limit\": ${limit}}"
    ;;
  get)
    id="$2"
    mcp_call "tools/call" "get_note" "{\"id\": \"${id}\"}"
    ;;
  delete)
    id="$2"
    mcp_call "tools/call" "delete_note" "{\"id\": \"${id}\"}"
    ;;
  tags)
    mcp_call "tools/call" "list_tags" "{}"
    ;;
  info)
    curl -s "${NEURALMD_URL}/api/mcp"
    ;;
  *)
    echo "NeuralMD CLI"
    echo "Usage: neuralmd.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  search <query>           Search notes semantically"
    echo "  create <title> <content> Create a new note"
    echo "  list [limit]             List notes"
    echo "  get <id>                 Get note by ID"
    echo "  delete <id>              Delete note"
    echo "  tags                     List all tags"
    echo "  info                     Server info"
    ;;
esac
