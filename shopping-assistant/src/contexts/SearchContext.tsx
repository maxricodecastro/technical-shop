'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface SearchContextType {
  // Status
  status: Status
  error: string | null
  
  // Search
  query: string | null
  
  // AI Response
  aiMessage: string | null
  
  // Filters
  selectedFilters: Set<string>
  
  // Actions
  submitSearch: (query: string) => void
  toggleFilter: (filterId: string) => void
  clearFilters: () => void
  setAiMessage: (message: string | null) => void
  setStatus: (status: Status) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())

  const submitSearch = (searchQuery: string) => {
    if (searchQuery.trim().length === 0) return
    
    // Set loading state
    setStatus('loading')
    setQuery(searchQuery)
    setAiMessage(null) // Hide message first (goes below screen)
    setError(null)
    
    // Simulate API delay - in the future, this will trigger actual API call
    setTimeout(() => {
      const dummyMessages = [
        `I found some great products matching "${searchQuery}"!`,
        "Here are some options that might interest you.",
        "Based on your search, I recommend these items.",
        "These selections should work perfectly for what you're looking for.",
      ]
      const randomMessage = dummyMessages[Math.floor(Math.random() * dummyMessages.length)]
      setAiMessage(randomMessage)
      setStatus('success')
    }, 800)
  }

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filterId)) {
        next.delete(filterId)
      } else {
        next.add(filterId)
      }
      return next
    })
  }

  const clearFilters = () => {
    setSelectedFilters(new Set())
  }

  return (
    <SearchContext.Provider
      value={{
        status,
        error,
        query,
        aiMessage,
        selectedFilters,
        submitSearch,
        toggleFilter,
        clearFilters,
        setAiMessage,
        setStatus,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

