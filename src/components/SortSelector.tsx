'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SortOption } from '@/lib/sorting'

interface SortSelectorProps {
  currentSort?: SortOption
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: '📅 Plus récent' },
  { value: 'oldest', label: '📅 Plus ancien' },
  { value: 'updated', label: '🔄 Dernière modif' },
  { value: 'title-asc', label: '🔤 Titre A→Z' },
  { value: 'title-desc', label: '🔤 Titre Z→A' },
]

export default function SortSelector({ currentSort = 'newest' }: SortSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortOption
    const params = new URLSearchParams(searchParams.toString())
    
    if (newSort === 'newest') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    
    const query = params.toString()
    router.push(`/notes${query ? `?${query}` : ''}`)
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 cursor-pointer hover:bg-gray-700 transition-colors"
    >
      {sortOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
