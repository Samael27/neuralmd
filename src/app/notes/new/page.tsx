'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SecretWarning {
  type: string
  pattern: string
  masked: string
}

export default function NewNotePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [source, setSource] = useState<'human' | 'ai'>('human')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [secretsWarning, setSecretsWarning] = useState<SecretWarning[]>([])
  const [sanitizeSecrets, setSanitizeSecrets] = useState(false)
  
  // Debounced secrets check
  const checkSecrets = useCallback(async (text: string) => {
    if (!text || text.length < 10) {
      setSecretsWarning([])
      return
    }
    try {
      const res = await fetch('/api/check-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      if (res.ok) {
        const data = await res.json()
        setSecretsWarning(data.secrets || [])
      }
    } catch {
      // Ignore errors
    }
  }, [])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      checkSecrets(`${title}\n${content}`)
    }, 500)
    return () => clearTimeout(timer)
  }, [title, content, checkSecrets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          source,
          sanitizeSecrets: sanitizeSecrets,
          allowSecrets: secretsWarning.length > 0 && !sanitizeSecrets
        })
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.secrets) {
          setSecretsWarning(data.secrets)
          throw new Error('Secrets détectés - cochez "Masquer les secrets" ou modifiez le contenu')
        }
        throw new Error(data.error || 'Erreur lors de la création')
      }

      const data = await res.json()
      router.push(`/notes/${data.note.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/notes" className="text-gray-400 hover:text-white transition-colors">
            ← Retour
          </Link>
          <h1 className="text-2xl font-bold">Nouvelle note</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}
          
          {secretsWarning.length > 0 && (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔐</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-400 mb-2">
                    {secretsWarning.length} secret{secretsWarning.length > 1 ? 's' : ''} détecté{secretsWarning.length > 1 ? 's' : ''}
                  </h4>
                  <ul className="text-sm text-yellow-300/80 space-y-1 mb-3">
                    {secretsWarning.slice(0, 5).map((s, i) => (
                      <li key={i}>• {s.pattern}: <code className="bg-black/30 px-1 rounded">{s.masked}</code></li>
                    ))}
                    {secretsWarning.length > 5 && (
                      <li className="text-yellow-400">... et {secretsWarning.length - 5} autres</li>
                    )}
                  </ul>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sanitizeSecrets}
                      onChange={(e) => setSanitizeSecrets(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-yellow-300">Masquer automatiquement les secrets avant sauvegarde</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
              placeholder="Titre de la note..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contenu (Markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white font-mono text-sm resize-y"
              placeholder="Écrivez votre note en Markdown..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    value="human"
                    checked={source === 'human'}
                    onChange={() => setSource('human')}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">👤 Humain</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    value="ai"
                    checked={source === 'ai'}
                    onChange={() => setSource('ai')}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">🤖 AI</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> Création...
                </>
              ) : (
                <>💾 Créer la note</>
              )}
            </button>
            <Link
              href="/notes"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
