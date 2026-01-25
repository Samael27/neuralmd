import GraphClient from './GraphClient'

// Internal headers for SSR API calls (server-side only)
function getInternalHeaders(): HeadersInit {
  const headers: HeadersInit = {}
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }
  return headers
}

interface GraphData {
  nodes: Array<{
    id: string
    title: string
    tags: string[]
    source: string
  }>
  edges: Array<{
    source: string
    target: string
    similarity: number
  }>
  stats: {
    totalNotes: number
    connectedNotes: number
    connections: number
    threshold: number
  }
}

async function getGraphData(threshold: number = 0.3): Promise<GraphData> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    const res = await fetch(
      `${baseUrl}/api/graph?threshold=${threshold}&limit=100`,
      {
        headers: getInternalHeaders(),
        cache: 'no-store'
      }
    )
    
    if (!res.ok) {
      console.error('Graph fetch failed:', res.status)
      return { nodes: [], edges: [], stats: { totalNotes: 0, connectedNotes: 0, connections: 0, threshold } }
    }
    
    return await res.json()
  } catch (error) {
    console.error('Graph fetch error:', error)
    return { nodes: [], edges: [], stats: { totalNotes: 0, connectedNotes: 0, connections: 0, threshold } }
  }
}

export default async function GraphPage({
  searchParams
}: {
  searchParams: Promise<{ threshold?: string }>
}) {
  const params = await searchParams
  const threshold = parseFloat(params.threshold || '0.3')
  const initialData = await getGraphData(threshold)
  
  return <GraphClient initialData={initialData} initialThreshold={threshold} />
}
