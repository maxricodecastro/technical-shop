'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { 
  Product, 
  FilterChip, 
  FilterState, 
  CatalogFacets, 
  ChatResponse, 
  initialFilterState 
} from '@/types'
import { 
  applyFilters, 
  applyChipToFilters, 
  removeChipFromFilters 
} from '@/lib/filters/engine'
import { getCatalogFacets } from '@/lib/catalog/facets'
import productsData from '@/data/products.json'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface SearchContextType {
  // Status
  status: Status
  error: string | null
  
  // Search
  query: string | null
  
  // AI Response
  aiMessage: string | null
  suggestedChips: FilterChip[]
  
  // Products
  allProducts: Product[]
  filteredProducts: Product[]
  
  // Filters
  filterState: FilterState
  catalogFacets: CatalogFacets | null
  
  // Actions
  submitSearch: (query: string) => void
  toggleFilter: (chip: FilterChip) => void
  clearFilters: () => void
  isChipActive: (chip: FilterChip) => boolean
  setAiMessage: (message: string | null) => void
  setStatus: (status: Status) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  // Status
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  
  // Search
  const [query, setQuery] = useState<string | null>(null)
  
  // AI Response
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [suggestedChips, setSuggestedChips] = useState<FilterChip[]>([])
  
  // Products
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  
  // Filters
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState)
  const [catalogFacets, setCatalogFacets] = useState<CatalogFacets | null>(null)

  // Initialize products on mount
  useEffect(() => {
    const products = productsData as Product[]
    setAllProducts(products)
    setFilteredProducts(products) // Initially show all
    setCatalogFacets(getCatalogFacets(products))
  }, [])

  // Compute filtered products when filterState changes
  useEffect(() => {
    const hasActiveFilters = 
      filterState.subcategory !== null ||
      filterState.subcategories.length > 0 ||
      filterState.colors.length > 0 ||
      filterState.materials.length > 0 ||
      filterState.sizes.length > 0 ||
      filterState.styleTags.length > 0 ||
      filterState.occasions.length > 0 ||
      filterState.inStock !== null
    
    if (hasActiveFilters) {
      setFilteredProducts(applyFilters(allProducts, filterState))
    } else {
      setFilteredProducts(allProducts)
    }
  }, [filterState, allProducts])

  // Check if a chip is currently active in filter state
  const isChipActive = useCallback((chip: FilterChip): boolean => {
    const key = chip.filterKey
    const value = chip.filterValue

    switch (key) {
      case 'subcategory':
        return filterState.subcategory === value || filterState.subcategories.includes(value as string)
      case 'subcategories':
        return filterState.subcategories.includes(value as string)
      case 'colors':
        return filterState.colors.includes(value as string)
      case 'materials':
        return filterState.materials.includes(value as string)
      case 'styleTags':
        return filterState.styleTags.includes(value as string)
      case 'occasions':
        return filterState.occasions.includes(value as string)
      case 'sizes':
        return filterState.sizes.includes(value as string)
      case 'inStock':
        return filterState.inStock === value
      default:
        return false
    }
  }, [filterState])

  // Submit search to API
  const submitSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) return
    
    setStatus('loading')
    setQuery(searchQuery)
    setAiMessage(null) // Hide message first (slides down)
    setError(null)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: searchQuery }),
      })
      
      const data: ChatResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(data.errors?.[0] || 'Request failed')
      }
      
      // Set AI message
      setAiMessage(data.message)
      
      // Store suggested chips
      setSuggestedChips(data.suggestedChips)
      
      // Auto-apply all chips to filter state
      const newFilterState = data.suggestedChips.reduce(
        (state, chip) => applyChipToFilters(state, chip),
        initialFilterState
      )
      setFilterState(newFilterState)
      
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAiMessage('Sorry, something went wrong. Showing all products.')
      setFilterState(initialFilterState) // Reset filters - show all products
      setSuggestedChips([])
      setStatus('error')
    }
  }

  // Toggle a filter chip on/off
  const toggleFilter = (chip: FilterChip) => {
    setFilterState(prev => {
      const isActive = isChipActive(chip)
      
      if (isActive) {
        return removeChipFromFilters(prev, chip)
      } else {
        return applyChipToFilters(prev, chip)
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilterState(initialFilterState)
    setSuggestedChips([])
  }

  return (
    <SearchContext.Provider
      value={{
        status,
        error,
        query,
        aiMessage,
        suggestedChips,
        allProducts,
        filteredProducts,
        filterState,
        catalogFacets,
        submitSearch,
        toggleFilter,
        clearFilters,
        isChipActive,
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
