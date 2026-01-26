import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import NoteCard from '@/components/NoteCard'
import ImportExportButtons from '@/components/ImportExportButtons'
import FolderTree from '@/components/FolderTree'
import { buildFolderTree } from '@/lib/folders'

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

async function getNotes(query?: string, folder?: string): Promise<{ notes: Note[]; isSearch: boolean }> {
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
      let notes = data.results || []
      
      // Filter by folder if specified
      if (folder) {
        notes = notes.filter((n: Note) => 
          n.tags.some(t => t === folder || t.startsWith(folder + '/'))
        )
      }
      
      return { notes, isSearch: true }
    } catch (err) {
      console.error('Search error:', err)
      return { notes: [], isSearch: true }
    }
  } else {
    // List all notes
    const url = folder 
      ? `${baseUrl}/api/notes?limit=50&tag=${encodeURIComponent(folder)}`
      : `${baseUrl}/api/notes?limit=50`
      
    const res = await fetch(url, {
      headers,
      cache: 'no-store'
    })
    if (!res.ok) throw new Error('Failed to fetch notes')
    const data = await res.json()
    let notes = data.notes || []
    
    // For folder filtering, also include notes with child tags
    if (folder) {
      const allRes = await fetch(`${baseUrl}/api/notes?limit=100`, {
        headers,
        cache: 'no-store'
      })
      if (allRes.ok) {
        const allData = await allRes.json()
        notes = (allData.notes || []).filter((n: Note) => 
          n.tags.some(t => t === folder || t.startsWith(folder + '/'))
        )
      }
    }
    
    return { notes, isSearch: false }
  }
}

async function getAllTags(): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const headers = getInternalHeaders()
  
  try {
    const res = await fetch(`${baseUrl}/api/notes?limit=100`, {
      headers,
      cache: 'no-store'
    })
    if (!res.ok) return []
    const data = await res.json()
    const notes = data.notes || []
    
    // Collect all tags
    const allTags: string[] = []
    for (const note of notes) {
      allTags.push(...note.tags)
    }
    
    return allTags
  } catch {
    return []
  }
}

export default async function NotesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; folder?: string }>
}) {
  const params = await searchParams
  const query = params.q
  const folder = params.folder
  const { notes, isSearch } = await getNotes(query, folder)
  const allTags = await getAllTags()
  const folderTree = buildFolderTree(allTags)

  return (
    <main className="min-h-screen">
      <div className="flex">
        {/* Sidebar - Folder Tree */}
        <aside className="w-64 min-h-screen bg-gray-900/50 border-r border-gray-800 p-4 hidden lg:block">
          <FolderTree tree={folderTree} selectedPath={folder} />
        </aside>

        {/* Main content */}
        <div className="flex-1 p-8">
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

            {/* Current folder indicator */}
            {folder && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="text-gray-400">📁 Dossier:</span>
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                  {folder}
                </span>
                <Link href="/notes" className="text-gray-500 hover:text-gray-300 ml-2">
                  ✕ Effacer
                </Link>
              </div>
            )}

            {/* Results info */}
            {isSearch && (
              <div className="mb-4 text-gray-400">
                {notes.length} résultat{notes.length !== 1 ? 's' : ''} pour "{query}"
                <Link href={folder ? `/notes?folder=${folder}` : '/notes'} className="ml-2 text-blue-400 hover:underline">
                  Effacer la recherche
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
                  {isSearch 
                    ? 'Aucun résultat trouvé' 
                    : folder 
                      ? `Aucune note dans "${folder}"`
                      : 'Aucune note pour le moment'
                  }
                </p>
                <Link
                  href="/notes/new"
                  className="inline-block mt-4 text-blue-400 hover:underline"
                >
                  Créer une note
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
