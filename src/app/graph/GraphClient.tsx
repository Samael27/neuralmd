'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface GraphNode {
  id: string
  title: string
  tags: string[]
  source: string
}

interface GraphEdge {
  source: string
  target: string
  similarity: number
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: {
    totalNotes: number
    connectedNotes: number
    connections: number
    threshold: number
  }
}

interface Props {
  initialData: GraphData
  initialThreshold: number
}

export default function GraphClient({ initialData, initialThreshold }: Props) {
  const router = useRouter()
  const [data] = useState<GraphData>(initialData)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: Math.max(500, window.innerHeight - 250)
          })
        }
      }
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  const handleThresholdChange = (newThreshold: number) => {
    setThreshold(newThreshold)
    // Refresh page with new threshold
    router.push(`/graph?threshold=${newThreshold}`)
  }

  const graphData = data ? {
    nodes: data.nodes.map(n => ({
      ...n,
      val: 1 + (data.edges.filter(e => e.source === n.id || e.target === n.id).length * 0.5)
    })),
    links: data.edges.map(e => ({
      source: e.source,
      target: e.target,
      value: e.similarity
    }))
  } : { nodes: [], links: [] }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/notes" className="text-gray-400 hover:text-white transition-colors">
              ← Notes
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🔗 Graphe des connexions
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Seuil similarité:</span>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={threshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="w-12 text-right">{Math.round(threshold * 100)}%</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="flex gap-4 mb-4 text-sm text-gray-400">
            <span>📊 {data.stats.connectedNotes} notes connectées</span>
            <span>🔗 {data.stats.connections} connexions</span>
            <span>📝 {data.stats.totalNotes} notes total</span>
          </div>
        )}

        {/* Graph Container */}
        <div 
          ref={containerRef}
          className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative"
          style={{ minHeight: '500px' }}
        >
          {data && data.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-400">Aucune connexion trouvée</p>
                <p className="text-gray-500 text-sm mt-1">
                  Les notes ont besoin d&apos;embeddings pour calculer les similarités
                </p>
              </div>
            </div>
          )}

          {data && data.nodes.length > 0 && (
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel={(node: any) => node.title}
              nodeColor={(node: any) => node.source === 'ai' ? '#a855f7' : '#22c55e'}
              nodeRelSize={6}
              linkColor={() => 'rgba(100, 100, 100, 0.5)'}
              linkWidth={(link: any) => link.value * 3}
              onNodeClick={(node: any) => setSelectedNode(node as GraphNode)}
              backgroundColor="#111827"
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const label = node.title?.slice(0, 20) + (node.title?.length > 20 ? '...' : '')
                const fontSize = 12 / globalScale
                ctx.font = `${fontSize}px Sans-Serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = node.source === 'ai' ? '#a855f7' : '#22c55e'
                
                // Draw node circle
                ctx.beginPath()
                ctx.arc(node.x, node.y, (node.val || 1) * 2, 0, 2 * Math.PI)
                ctx.fill()
                
                // Draw label
                ctx.fillStyle = '#fff'
                ctx.fillText(label, node.x, node.y + (node.val || 1) * 2 + fontSize)
              }}
            />
          )}
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedNode.title}</h3>
                <div className="flex gap-2 mt-2">
                  {selectedNode.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-700 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/notes/${selectedNode.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                Voir la note →
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Notes AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Notes Humain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-500"></div>
            <span>Connexion (plus épais = plus similaire)</span>
          </div>
        </div>
      </div>
    </main>
  )
}
