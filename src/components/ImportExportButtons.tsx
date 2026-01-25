'use client'

import { useState, useRef } from 'react'

export default function ImportExportButtons({ onImportComplete }: { onImportComplete?: () => void }) {
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    results?: { total: number; imported: number; skipped: number; errors: string[] }
    error?: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (format: 'json' | 'markdown') => {
    window.open(`/api/export?format=${format}`, '_blank')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const content = await file.text()
      const format = file.name.endsWith('.json') ? 'json' : 'markdown'

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, data: content })
      })

      const data = await res.json()
      
      if (res.ok) {
        setImportResult({ success: true, results: data.results })
        onImportComplete?.()
      } else {
        setImportResult({ success: false, error: data.error })
      }
    } catch (err) {
      setImportResult({ success: false, error: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <div className="relative group">
          <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
            📤 Exporter
          </button>
          <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-t-lg"
            >
              📄 JSON
            </button>
            <button
              onClick={() => handleExport('markdown')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-b-lg"
            >
              📝 Markdown
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        >
          📥 Importer
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">📥 Importer des notes</h3>
            
            {!importResult ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  Formats supportés :
                </p>
                <ul className="text-gray-400 text-sm mb-6 space-y-1">
                  <li>• <strong>JSON</strong> — Export NeuralMD</li>
                  <li>• <strong>Markdown</strong> — Fichiers .md avec frontmatter YAML (compatible Obsidian)</li>
                </ul>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.md,.markdown"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors"
                  >
                    {importing ? '⏳ Import en cours...' : '📁 Choisir un fichier'}
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                {importResult.success ? (
                  <div className="space-y-4">
                    <div className="text-green-400 text-lg">✅ Import terminé !</div>
                    <div className="bg-gray-900 rounded-lg p-4 text-sm space-y-1">
                      <p>📊 Total : {importResult.results?.total}</p>
                      <p className="text-green-400">✅ Importées : {importResult.results?.imported}</p>
                      {importResult.results?.skipped ? (
                        <p className="text-yellow-400">⚠️ Ignorées : {importResult.results.skipped}</p>
                      ) : null}
                    </div>
                    {importResult.results?.errors && importResult.results.errors.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 max-h-32 overflow-y-auto">
                        {importResult.results.errors.map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-400">
                    ❌ Erreur : {importResult.error}
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportResult(null)
                  }}
                  className="w-full mt-4 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
