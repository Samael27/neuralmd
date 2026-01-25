import Link from 'next/link'
import { notFound } from 'next/navigation'
import DeleteButton from './DeleteButton'
import EditForm from './EditForm'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  source: string
  sourceRef: string | null
  createdAt: string
  updatedAt: string
}

// Internal headers for SSR API calls (server-side only)
function getInternalHeaders(): HeadersInit {
  const headers: HeadersInit = {}
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }
  return headers
}

async function getNote(id: string): Promise<Note | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/notes/${id}`, {
      headers: getInternalHeaders(),
      cache: 'no-store'
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.note
  } catch {
    return null
  }
}

export default async function NotePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  const note = await getNote(id)

  if (!note) {
    notFound()
  }

  const isEditing = edit === 'true'
  const createdDate = new Date(note.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const updatedDate = new Date(note.updatedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  if (isEditing) {
    return <EditForm note={note} />
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/notes" className="text-gray-400 hover:text-white transition-colors">
            ← Retour aux notes
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/notes/${note.id}?edit=true`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              ✏️ Modifier
            </Link>
            <DeleteButton noteId={note.id} />
          </div>
        </div>

        {/* Note content */}
        <article className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-4">{note.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`px-2 py-1 rounded ${note.source === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                {note.source === 'ai' ? '🤖 Créé par AI' : '👤 Créé par humain'}
              </span>
              {note.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/notes?q=${encodeURIComponent('#' + tag)}`}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </header>

          <div className="prose prose-invert max-w-none">
            {/* Simple markdown rendering - could be enhanced with react-markdown */}
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
              {note.content}
            </div>
          </div>

          <footer className="mt-8 pt-6 border-t border-gray-700 text-sm text-gray-500">
            <div className="flex flex-wrap gap-4">
              <span>📅 Créé le {createdDate}</span>
              {note.createdAt !== note.updatedAt && (
                <span>✏️ Modifié le {updatedDate}</span>
              )}
            </div>
          </footer>
        </article>
      </div>
    </main>
  )
}
