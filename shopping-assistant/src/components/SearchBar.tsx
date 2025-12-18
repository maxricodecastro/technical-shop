'use client'

import { MagnifyingGlassIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearch } from '@/contexts/SearchContext'

const PLACEHOLDER_PHRASES = [
  "Jacob Elordi outfits",
  "Dress me like a mobster",
  "Something for a summer wedding",
  "Outfit for the bottega"
]

const TYPING_SPEED = 80 // ms per character
const DELETE_SPEED = 30 // ms per character when deleting
const PAUSE_AFTER_TYPING = 200 // ms to wait after typing complete
const PAUSE_AFTER_DELETE = 500 // ms to wait after deleting

export function SearchBar() {
  const { submitSearch, status } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Typing effect state
  const [displayedText, setDisplayedText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Typing animation effect
  useEffect(() => {
    // Don't animate if user is typing or textarea is focused
    if (searchQuery || isFocused) return

    const currentPhrase = PLACEHOLDER_PHRASES[phraseIndex]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayedText.length < currentPhrase.length) {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1))
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPING)
        }
      } else {
        // Deleting
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1))
        } else {
          // Finished deleting, move to next phrase
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % PLACEHOLDER_PHRASES.length)
        }
      }
    }, isDeleting ? DELETE_SPEED : (displayedText.length === PLACEHOLDER_PHRASES[phraseIndex].length ? PAUSE_AFTER_TYPING : TYPING_SPEED))

    return () => clearTimeout(timeout)
  }, [displayedText, phraseIndex, isDeleting, searchQuery, isFocused])

  // Reset animation when focus changes
  useEffect(() => {
    if (!isFocused && !searchQuery) {
      // Reset to start typing from beginning of current phrase
      setDisplayedText('')
      setIsDeleting(false)
    }
  }, [isFocused, searchQuery])

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
  const showTypingPlaceholder = !searchQuery && !isFocused

  const handleSubmit = () => {
    if (hasContent) {
      submitSearch(searchQuery)
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={1}
          className={`w-full py-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] border border-[var(--border-secondary)] bg-white focus:outline-none focus:ring-0 resize-none ${
            searchQuery ? 'text-black' : 'text-[var(--text-secondary)]'
          } ${hasContent || status === 'loading' ? 'pl-10 pr-10' : 'pl-10 pr-3'}`}
          style={{ borderRadius: 0 }}
        />
        
        {/* Custom typing placeholder */}
        {showTypingPlaceholder && (
          <div 
            className="absolute left-10 top-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] text-[var(--text-secondary)] pointer-events-none select-none"
          >
            {displayedText}
            <span className="animate-pulse">|</span>
          </div>
        )}
      </div>
    </div>
  )
}
