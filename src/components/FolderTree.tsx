'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderNode } from '@/lib/folders'

interface FolderTreeProps {
  tree: FolderNode
  selectedPath?: string
  onSelect?: (path: string) => void
}

function FolderItem({ 
  node, 
  depth = 0, 
  selectedPath
}: { 
  node: FolderNode
  depth?: number
  selectedPath?: string
}) {
  const [isOpen, setIsOpen] = useState(depth < 2) // Auto-expand first 2 levels
  const hasChildren = node.children.length > 0
  const isSelected = selectedPath === node.path

  if (node.name === 'root') {
    return (
      <div className="space-y-1">
        {node.children.map(child => (
          <FolderItem 
            key={child.path} 
            node={child} 
            depth={0}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
          isSelected 
            ? 'bg-blue-600/30 text-blue-300' 
            : 'hover:bg-gray-700/50 text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse arrow */}
        {hasChildren ? (
          <button 
            onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen) }}
            className={`text-xs transition-transform hover:text-white ${isOpen ? 'rotate-90' : ''}`}
          >
            ▶
          </button>
        ) : (
          <span className="w-3" />
        )}
        
        {/* Folder link */}
        <Link 
          href={`/notes?folder=${encodeURIComponent(node.path)}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {/* Folder/file icon */}
          <span className="text-sm">
            {hasChildren ? (isOpen ? '📂' : '📁') : '🏷️'}
          </span>
          
          {/* Name */}
          <span className="flex-1 truncate text-sm">{node.name}</span>
        </Link>
        
        {/* Note count */}
        {node.noteCount > 0 && (
          <span className="text-xs text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
            {node.noteCount}
          </span>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isOpen && (
        <div className="mt-0.5">
          {node.children.map(child => (
            <FolderItem 
              key={child.path} 
              node={child} 
              depth={depth + 1}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FolderTree({ tree, selectedPath, onSelect }: FolderTreeProps) {
  return (
    <nav className="text-sm">
      <div className="mb-3 px-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Dossiers
        </h3>
      </div>
      
      {/* All notes link */}
      <Link
        href="/notes"
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors mb-2 ${
          !selectedPath 
            ? 'bg-blue-600/30 text-blue-300' 
            : 'hover:bg-gray-700/50 text-gray-300'
        }`}
      >
        <span className="w-3" />
        <span className="text-sm">📚</span>
        <span className="text-sm">Toutes les notes</span>
      </Link>
      
      {tree.children.length > 0 ? (
        <FolderItem 
          node={tree} 
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ) : (
        <p className="px-2 text-xs text-gray-500 italic">
          Utilisez des tags avec "/" pour créer des dossiers
          <br />
          Ex: "projet/neuralmd"
        </p>
      )}
    </nav>
  )
}
