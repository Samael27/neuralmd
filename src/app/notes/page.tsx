import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import NoteCard from '@/components/NoteCard'
import ImportExportButtons from '@/components/ImportExportButtons'

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

// Internal headers for SSR API calls (server-side only)
function getInternalHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }
  return headers
}

async function getNotes(query?: string): Promise<{ notes: Note[]; isSearch: boolean }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const headers = getInternalHeaders()
  
  if (query) {
    // Semantic search
    try {
      const res = await fetch(`${baseUrl}/api/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit: 20 }),
        cache: 'no-store'
      })
      if (!res.ok) {
        console.error('Search failed:', await res.text())
        return { notes: [], isSearch: true }
      }
      const data = await res.json()
      return { notes: data.results || [], isSearch: true }
    } catch (err) {
      console.error('Search error:', err)
      return { notes: [], isSearch: true }
    }
  } else {
    // List all notes
    const res = await fetch(`${baseUrl}/api/notes?limit=50`, {
      headers,
      cache: 'no-store'
    })
    if (!res.ok) throw new Error('Failed to fetch notes')
    const data = await res.json()
    return { notes: data.notes || [], isSearch: false }
  }
}

export default async function NotesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q
  const { notes, isSearch } = await getNotes(query)

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <span>🧠</span>
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              NeuralMD
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/graph"
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              🔗 Graphe
            </Link>
            <ImportExportButtons />
            <Link
              href="/notes/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>+</span> Nouvelle note
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <SearchBar initialQuery={query || ''} />
        </div>

        {/* Results info */}
        {isSearch && (
          <div className="mb-4 text-gray-400">
            {notes.length} résultat{notes.length !== 1 ? 's' : ''} pour "{query}"
            <Link href="/notes" className="ml-2 text-blue-400 hover:underline">
              Effacer
            </Link>
          </div>
        )}

        {/* Notes list */}
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} showSimilarity={isSearch} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-400">
              {isSearch ? 'Aucun résultat trouvé' : 'Aucune note pour le moment'}
            </p>
            <Link
              href="/notes/new"
              className="inline-block mt-4 text-blue-400 hover:underline"
            >
              Créer votre première note
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
