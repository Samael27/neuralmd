import { OpenAIProvider } from './openai'
import { OllamaProvider } from './ollama'

export interface EmbeddingProvider {
  name: string
  generateEmbedding(text: string): Promise<number[]>
  generateEmbeddings(texts: string[]): Promise<number[][]>
  getDimensions(): number
}

type ProviderType = 'openai' | 'ollama' | 'none'

const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'ollama') as ProviderType

let provider: EmbeddingProvider | null = null

function getProvider(): EmbeddingProvider | null {
  if (provider) return provider
  
  switch (PROVIDER) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not set, embeddings disabled')
        return null
      }
      provider = new OpenAIProvider()
      console.log('✅ Using OpenAI embeddings')
      break
      
    case 'ollama':
      provider = new OllamaProvider()
      console.log('✅ Using Ollama embeddings')
      break
      
    case 'none':
      console.log('ℹ️ Embeddings disabled')
      return null
      
    default:
      console.warn(`⚠️ Unknown embedding provider: ${PROVIDER}, embeddings disabled`)
      return null
  }
  
  return provider
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const p = getProvider()
  if (!p) return null
  
  try {
    return await p.generateEmbedding(text)
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const p = getProvider()
  if (!p) return texts.map(() => null)
  
  try {
    return await p.generateEmbeddings(texts)
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    return texts.map(() => null)
  }
}

export function getEmbeddingDimensions(): number {
  const p = getProvider()
  return p?.getDimensions() ?? 1536 // Default to OpenAI dimensions
}

export function isEmbeddingEnabled(): boolean {
  return getProvider() !== null
}
