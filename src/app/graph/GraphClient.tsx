'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import * as d3 from 'd3-force'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface GraphNode {
  id: string
  title: string
  tags: string[]
  source: string
  val?: number
  x?: number
  y?: number
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

// Extract folder from tags (first segment before /)
function extractFolders(tags: string[]): string[] {
  const folders = new Set<string>()
  tags.forEach(tag => {
    if (tag.includes('/')) {
      folders.add(tag.split('/')[0])
    } else {
      folders.add(tag)
    }
  })
  return Array.from(folders)
}

// Get primary folder for a node
function getPrimaryFolder(tags: string[]): string {
  if (tags.length === 0) return 'uncategorized'
  const firstTag = tags[0]
  return firstTag.includes('/') ? firstTag.split('/')[0] : firstTag
}

// Color palette for folders
const FOLDER_COLORS: Record<string, string> = {}
const COLOR_PALETTE = [
  '#22c55e', // green
  '#a855f7', // purple
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#8b5cf6', // violet
]

function getFolderColor(folder: string): string {
  if (!FOLDER_COLORS[folder]) {
    const index = Object.keys(FOLDER_COLORS).length % COLOR_PALETTE.length
    FOLDER_COLORS[folder] = COLOR_PALETTE[index]
  }
  return FOLDER_COLORS[folder]
}

export default function GraphClient({ initialData, initialThreshold }: Props) {
  const router = useRouter()
  const [data, setData] = useState<GraphData>(initialData)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(initialData.nodes.length <= 30)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState(1)
  const [spacing, setSpacing] = useState(3) // 1-5, controls how spread out nodes are
  
  // Update data when initialData changes (after navigation)
  useEffect(() => {
    setData(initialData)
    setThreshold(initialThreshold)
    // Auto-hide labels if too many nodes
    setShowLabels(initialData.nodes.length <= 30)
  }, [initialData, initialThreshold])
  
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Extract all unique folders from data
  const allFolders = useMemo(() => {
    if (!data) return []
    const folders = new Set<string>()
    data.nodes.forEach(node => {
      const folder = getPrimaryFolder(node.tags)
      folders.add(folder)
    })
    return Array.from(folders).sort()
  }, [data])

  // Filter data by selected folder
  const filteredData = useMemo(() => {
    if (!data || !selectedFolder) return data
    
    const filteredNodes = data.nodes.filter(node => {
      const folder = getPrimaryFolder(node.tags)
      return folder === selectedFolder
    })
    
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
    
    const filteredEdges = data.edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    )
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: {
        ...data.stats,
        connectedNotes: filteredNodes.length,
        connections: filteredEdges.length
      }
    }
  }, [data, selectedFolder])

  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: Math.max(500, window.innerHeight - 300)
          })
        }
      }
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // Configure d3 forces for better spacing
  useEffect(() => {
    const fg = graphRef.current
    if (!fg) return

    const chargeStrength = -150 * spacing // More spacing = stronger repulsion
    const linkDistance = 40 * spacing     // More spacing = longer links
    const collisionRadius = 8 * spacing   // Prevent node overlap

    // Strong repulsion between nodes
    fg.d3Force('charge')?.strength(chargeStrength)
    
    // Longer links
    fg.d3Force('link')?.distance(linkDistance)
    
    // Collision detection — nodes can't overlap
    fg.d3Force('collision', d3.forceCollide((node: any) => {
      return collisionRadius + (node.val || 1) * 2
    }))
    
    // Weaker center gravity so nodes can spread
    fg.d3Force('center')?.strength(0.03)

    // Reheat simulation to apply changes
    fg.d3ReheatSimulation()
  }, [spacing, filteredData])

  const handleThresholdChange = (newThreshold: number) => {
    setThreshold(newThreshold)
    router.push(`/graph?threshold=${newThreshold}`)
    router.refresh()
  }

  // Calculate node values (size based on connections)
  const graphData = useMemo(() => {
    if (!filteredData) return { nodes: [], links: [] }
    
    const connectionCount: Record<string, number> = {}
    filteredData.edges.forEach(e => {
      connectionCount[e.source] = (connectionCount[e.source] || 0) + 1
      connectionCount[e.target] = (connectionCount[e.target] || 0) + 1
    })
    
    return {
      nodes: filteredData.nodes.map(n => ({
        ...n,
        val: 1 + Math.min((connectionCount[n.id] || 0) * 0.3, 3), // cap size to avoid giant nodes
        folder: getPrimaryFolder(n.tags)
      })),
      links: filteredData.edges.map(e => ({
        source: e.source,
        target: e.target,
        value: e.similarity
      }))
    }
  }, [filteredData])

  // Determine if label should be shown for a node
  const shouldShowLabel = useCallback((node: any): boolean => {
    // Always show if labels toggle is on
    if (showLabels) return true
    // Show if node is hovered
    if (hoveredNode === node.id) return true
    // Show if zoomed in enough
    if (currentZoom > 2) return true
    // Show for hub nodes (>3 connections)
    if (node.val > 2.5) return true
    return false
  }, [showLabels, hoveredNode, currentZoom])

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const nodeRadius = Math.max(3, (node.val || 1) * 1.5)
    const folder = node.folder || 'uncategorized'
    const color = getFolderColor(folder)
    const isHovered = hoveredNode === node.id
    
    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.globalAlpha = isHovered ? 1 : 0.85
    ctx.fill()
    ctx.globalAlpha = 1
    
    // Highlight on hover
    if (isHovered) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
    }
    
    // Draw label if should show
    if (shouldShowLabel(node)) {
      const label = node.title?.slice(0, 25) + (node.title?.length > 25 ? '...' : '')
      const fontSize = Math.max(9, 11 / globalScale)
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      // Background for readability
      const textWidth = ctx.measureText(label).width
      const padding = 2
      const labelY = node.y + nodeRadius + 3
      ctx.fillStyle = 'rgba(17, 24, 39, 0.85)'
      ctx.fillRect(
        node.x - textWidth / 2 - padding,
        labelY - 1,
        textWidth + padding * 2,
        fontSize + padding * 2
      )
      
      // Label text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillText(label, node.x, labelY + 1)
    }
  }, [hoveredNode, shouldShowLabel])

  const handleZoom = useCallback((transform: { k: number }) => {
    setCurrentZoom(transform.k)
  }, [])

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
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          {/* Threshold slider */}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Seuil:</span>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={threshold}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="w-10 text-right font-mono">{Math.round(threshold * 100)}%</span>
          </label>

          {/* Spacing slider */}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Espacement:</span>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={spacing}
              onChange={(e) => setSpacing(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="w-6 text-right font-mono">{spacing}</span>
          </label>

          {/* Labels toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded border-gray-600"
            />
            <span className="text-gray-400">Afficher labels</span>
          </label>

          {/* Folder filter */}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Filtrer:</span>
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value="">Tous les folders</option>
              {allFolders.map(folder => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </label>

          {/* Zoom indicator */}
          <span className="text-sm text-gray-500 ml-auto">
            Zoom: {currentZoom.toFixed(1)}x
          </span>
        </div>

        {/* Stats */}
        {filteredData && (
          <div className="flex gap-4 mb-4 text-sm text-gray-400">
            <span>📊 {filteredData.stats.connectedNotes} notes connectées</span>
            <span>🔗 {filteredData.stats.connections} connexions</span>
            <span>📝 {data?.stats.totalNotes || 0} notes total</span>
            {!showLabels && <span className="text-gray-500">💡 Survolez ou zoomez pour voir les labels</span>}
          </div>
        )}

        {/* Graph Container */}
        <div 
          ref={containerRef}
          className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative"
          style={{ minHeight: '500px' }}
        >
          {filteredData && filteredData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-400">Aucune connexion trouvée</p>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedFolder 
                    ? `Aucune note dans le folder "${selectedFolder}" avec des connexions`
                    : 'Les notes ont besoin d\'embeddings pour calculer les similarités'
                  }
                </p>
              </div>
            </div>
          )}

          {filteredData && filteredData.nodes.length > 0 && (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel=""
              nodeRelSize={4}
              linkColor={() => 'rgba(100, 100, 100, 0.4)'}
              linkWidth={(link: any) => Math.max(0.5, link.value * 2)}
              onNodeClick={(node: any) => setSelectedNode(node as GraphNode)}
              onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
              onZoom={handleZoom}
              backgroundColor="#111827"
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode={() => 'replace'}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedNode.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedNode.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: getFolderColor(getPrimaryFolder([tag])) + '40' }}
                      onClick={() => setSelectedFolder(getPrimaryFolder([tag]))}
                    >
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
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Légende (par folder)</h4>
          <div className="flex flex-wrap gap-3">
            {allFolders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(selectedFolder === folder ? null : folder)}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded transition-colors ${
                  selectedFolder === folder 
                    ? 'bg-gray-600 ring-2 ring-white' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getFolderColor(folder) }}
                />
                <span className="text-gray-300">{folder}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700 text-sm text-gray-500">
            <div className="w-8 h-0.5 bg-gray-500"></div>
            <span>Connexion (plus épais = plus similaire)</span>
          </div>
        </div>
      </div>
    </main>
  )
}
