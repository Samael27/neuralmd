import OpenAI from 'openai'
import type { EmbeddingProvider } from './index'

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

// Dimensions for different OpenAI models
const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
}

export class OpenAIProvider implements EmbeddingProvider {
  name = 'openai'
  private client: OpenAI
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  
  getDimensions(): number {
    return MODEL_DIMENSIONS[EMBEDDING_MODEL] || 1536
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    })
    return response.data[0].embedding
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    })
    return response.data.map(d => d.embedding)
  }
}
