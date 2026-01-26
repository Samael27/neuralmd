'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  source: string
  createdAt: string
  updatedAt: string
  similarity?: number
}

interface NotesListProps {
  notes: Note[]
  showSimilarity?: boolean
}

export default function NotesList({ notes, showSimilarity = false }: NotesListProps) {
  const router = useRouter()
  const [draggedNote, setDraggedNote] = useState<Note | null>(null)

  const handleDragStart = (e: React.DragEvent, note: Note) => {
    setDraggedNote(note)
    e.dataTransfer.setData('application/json', JSON.stringify({ noteId: note.id, noteTitle: note.title }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedNote(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/notes/${note.id}`}
          draggable
          onDragStart={(e) => handleDragStart(e, note)}
          onDragEnd={handleDragEnd}
          className={`block p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 
                     hover:border-gray-600 transition-all cursor-grab active:cursor-grabbing
                     ${draggedNote?.id === note.id ? 'opacity-50 scale-[0.98]' : ''}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate mb-1">
                {note.title}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">
                {truncateContent(note.content)}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-xs text-gray-500">
                {formatDate(note.createdAt)}
              </span>
              {showSimilarity && note.similarity !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                  {Math.round(note.similarity * 100)}%
                </span>
              )}
            </div>
          </div>
          
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {note.tags.slice(0, 5).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 5 && (
                <span className="text-xs text-gray-500">
                  +{note.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
