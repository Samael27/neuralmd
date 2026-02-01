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

let modelPulled = false

async function ensureModelLoaded(): Promise<void> {
  if (modelPulled) return
  
  try {
    // Check if model exists
    const response = await fetch(`${OLLAMA_URL}/api/tags`)
    if (response.ok) {
      const data = await response.json()
      const models = data.models || []
      const hasModel = models.some((m: any) => 
        m.name === OLLAMA_MODEL || m.name === `${OLLAMA_MODEL}:latest`
      )
      
      if (!hasModel) {
        console.log(`📥 Pulling Ollama model: ${OLLAMA_MODEL}...`)
        const pullResponse = await fetch(`${OLLAMA_URL}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: OLLAMA_MODEL, stream: false }),
        })
        
        if (pullResponse.ok) {
          console.log(`✅ Model ${OLLAMA_MODEL} pulled successfully`)
        } else {
          console.warn(`⚠️ Failed to pull model: ${await pullResponse.text()}`)
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not check/pull Ollama model:', error)
  }
  
  modelPulled = true
}

export class OllamaProvider implements EmbeddingProvider {
  name = 'ollama'
  
  // Max tokens for nomic-embed-text is 8192. ~4 chars per token, keep margin.
  private maxChars = parseInt(process.env.OLLAMA_EMBEDDING_MAX_CHARS || '24000')
  
  getDimensions(): number {
    return MODEL_DIMENSIONS[OLLAMA_MODEL] || 768
  }
  
  private truncateText(text: string): string {
    if (text.length <= this.maxChars) return text
    console.warn(`⚠️ Text truncated for embedding: ${text.length} chars → ${this.maxChars} chars`)
    return text.slice(0, this.maxChars)
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    await ensureModelLoaded()
    
    const truncated = this.truncateText(text)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout
    
    try {
      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: truncated,
        }),
        signal: controller.signal,
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ollama embedding failed: ${error}`)
      }
      
      const data = await response.json()
      return data.embedding
    } finally {
      clearTimeout(timeout)
    }
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
