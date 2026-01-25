import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Note introuvable</h1>
        <p className="text-gray-400 mb-6">
          Cette note n'existe pas ou a été supprimée.
        </p>
        <Link
          href="/notes"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          ← Retour aux notes
        </Link>
      </div>
    </main>
  )
}
