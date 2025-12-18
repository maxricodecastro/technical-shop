'use client'

import { MagnifyingGlassIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { useSearch } from '@/contexts/SearchContext'

export function SearchBar() {
  const { submitSearch, status } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to 3 lines
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate max height for 3 lines (15px line-height * 3 + 24px padding)
    const maxHeight = 15 * 3 + 24
    
    // Set height to scrollHeight, but cap at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
    
    // Enable scrolling if content exceeds 3 lines
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto'
    } else {
      textarea.style.overflowY = 'hidden'
    }
  }, [searchQuery])

  const hasContent = searchQuery.trim().length > 0

  const handleSubmit = () => {
    if (hasContent) {
      submitSearch(searchQuery)
      setSearchQuery('') // Clear search after submission
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative flex items-start">
        {/* Search Icon */}
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-black pointer-events-none z-10" />
        
        {/* Spinner - appears when loading */}
        {status === 'loading' && (
          <div className="absolute right-3 top-3 h-4 w-4 z-10">
            <div className="h-4 w-4 border-1 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Up Arrow Icon - appears when user types and not loading */}
        {hasContent && status !== 'loading' && (
          <ArrowUpIcon 
            className="absolute right-3 top-3 h-4 w-4 text-black cursor-pointer z-10 animate-[fadeInUp_0.2s_ease-out]" 
            onClick={handleSubmit}
          />
        )}
        
        {/* Textarea - expands to 3 lines before scrolling */}
        <textarea
          ref={textareaRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SEARCH PRODUCTS"
          rows={1}
          className={`w-full py-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] border border-[var(--border-secondary)] bg-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-0 resize-none ${
            searchQuery ? 'text-black' : 'text-[var(--text-secondary)]'
          } ${hasContent || status === 'loading' ? 'pl-10 pr-10' : 'pl-10 pr-3'}`}
          style={{ borderRadius: 0 }}
        />
      </div>
    </div>
  )
}
