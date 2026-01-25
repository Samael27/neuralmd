import type { EmbeddingProvider } from './index'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'

// Dimensions for common Ollama embedding models
const MODEL_DIMENSIONS: Record<string, number> = {
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  'snowflake-arctic-embed': 1024,
}

export class OllamaProvider implements EmbeddingProvider {
  name = 'ollama'
  
  getDimensions(): number {
    return MODEL_DIMENSIONS[OLLAMA_MODEL] || 768
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama embedding failed: ${error}`)
    }
    
    const data = await response.json()
    return data.embedding
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch embeddings, so we do them sequentially
    const embeddings: number[][] = []
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text)
      embeddings.push(embedding)
    }
    return embeddings
  }
}
