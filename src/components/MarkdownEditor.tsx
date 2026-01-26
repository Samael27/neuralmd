'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  id?: string
}

type FormatType = 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'checkbox'

interface ToolbarButton {
  type: FormatType
  icon: string
  title: string
  shortcut?: string
}

const toolbarButtons: ToolbarButton[] = [
  { type: 'bold', icon: 'B', title: 'Gras', shortcut: 'Ctrl+B' },
  { type: 'italic', icon: 'I', title: 'Italique', shortcut: 'Ctrl+I' },
  { type: 'code', icon: '</>', title: 'Code', shortcut: 'Ctrl+`' },
  { type: 'link', icon: '🔗', title: 'Lien', shortcut: 'Ctrl+K' },
  { type: 'h1', icon: 'H1', title: 'Titre 1' },
  { type: 'h2', icon: 'H2', title: 'Titre 2' },
  { type: 'h3', icon: 'H3', title: 'Titre 3' },
  { type: 'ul', icon: '•', title: 'Liste à puces' },
  { type: 'ol', icon: '1.', title: 'Liste numérotée' },
  { type: 'quote', icon: '❝', title: 'Citation' },
  { type: 'checkbox', icon: '☑', title: 'Checkbox' },
]

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Contenu en Markdown...',
  rows = 15,
  id = 'content'
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Apply formatting to selected text
  const applyFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const beforeText = value.substring(0, start)
    const afterText = value.substring(end)

    let newText = ''
    let cursorOffset = 0

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'texte'}**`
        cursorOffset = selectedText ? newText.length : 2
        break
      case 'italic':
        newText = `*${selectedText || 'texte'}*`
        cursorOffset = selectedText ? newText.length : 1
        break
      case 'code':
        if (selectedText.includes('\n')) {
          newText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``
          cursorOffset = selectedText ? newText.length : 4
        } else {
          newText = `\`${selectedText || 'code'}\``
          cursorOffset = selectedText ? newText.length : 1
        }
        break
      case 'link':
        newText = `[${selectedText || 'texte'}](url)`
        cursorOffset = selectedText ? newText.length - 4 : 1
        break
      case 'h1':
        newText = `# ${selectedText || 'Titre'}`
        cursorOffset = newText.length
        break
      case 'h2':
        newText = `## ${selectedText || 'Titre'}`
        cursorOffset = newText.length
        break
      case 'h3':
        newText = `### ${selectedText || 'Titre'}`
        cursorOffset = newText.length
        break
      case 'ul':
        if (selectedText) {
          newText = selectedText.split('\n').map(line => `- ${line}`).join('\n')
        } else {
          newText = '- élément'
        }
        cursorOffset = newText.length
        break
      case 'ol':
        if (selectedText) {
          newText = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
        } else {
          newText = '1. élément'
        }
        cursorOffset = newText.length
        break
      case 'quote':
        if (selectedText) {
          newText = selectedText.split('\n').map(line => `> ${line}`).join('\n')
        } else {
          newText = '> citation'
        }
        cursorOffset = newText.length
        break
      case 'checkbox':
        if (selectedText) {
          newText = selectedText.split('\n').map(line => `- [ ] ${line}`).join('\n')
        } else {
          newText = '- [ ] tâche'
        }
        cursorOffset = newText.length
        break
    }

    const finalValue = beforeText + newText + afterText
    onChange(finalValue)

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + cursorOffset
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [value, onChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            applyFormat('bold')
            break
          case 'i':
            e.preventDefault()
            applyFormat('italic')
            break
          case 'k':
            e.preventDefault()
            applyFormat('link')
            break
          case '`':
            e.preventDefault()
            applyFormat('code')
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [applyFormat])

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-800 border-b border-gray-700 flex-wrap">
        {/* Format buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => {
                if (mode === 'preview') setMode('edit')
                setTimeout(() => applyFormat(btn.type), 0)
              }}
              title={btn.shortcut ? `${btn.title} (${btn.shortcut})` : btn.title}
              className="px-2 py-1 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors min-w-[32px]"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Mode toggle */}
        <div className="flex items-center bg-gray-900 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-3 py-1 text-sm transition-colors ${
              mode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✏️ Éditer
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-sm transition-colors ${
              mode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👁️ Aperçu
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset font-mono text-sm resize-y min-h-[200px]"
        />
      ) : (
        <div className="px-4 py-3 bg-gray-900 min-h-[200px] prose prose-invert max-w-none" style={{ minHeight: `${rows * 1.5}rem` }}>
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-gray-500 italic">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  )
}
