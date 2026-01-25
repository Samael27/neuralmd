import Link from 'next/link'

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

export default function NoteCard({ note, showSimilarity = false }: { note: Note; showSimilarity?: boolean }) {
  const preview = note.content.slice(0, 150) + (note.content.length > 150 ? '...' : '')
  const date = new Date(note.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <Link href={`/notes/${note.id}`}>
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 hover:border-blue-500/50 hover:bg-gray-800 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
              {note.title}
            </h3>
            <p className="text-gray-400 text-sm mt-2 line-clamp-2">
              {preview}
            </p>
          </div>
          {showSimilarity && note.similarity !== undefined && (
            <div className="flex-shrink-0">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {Math.round(note.similarity * 100)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-gray-500">{date}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${note.source === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
            {note.source === 'ai' ? '🤖 AI' : '👤 Human'}
          </span>
          {note.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {note.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                  #{tag}
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
