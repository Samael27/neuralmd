'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ noteId }: { noteId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        router.push('/notes')
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 rounded-lg font-medium transition-colors"
        >
          {loading ? '...' : '✓ Confirmer'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          ✗ Annuler
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg font-medium transition-colors"
    >
      🗑️ Supprimer
    </button>
  )
}
