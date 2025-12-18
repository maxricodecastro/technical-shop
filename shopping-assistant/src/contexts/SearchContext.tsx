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
  
  // AI Response
  aiMessage: string | null
  
  // Products
  allProducts: Product[]
  filteredProducts: Product[]
  
  // Filters
  filterState: FilterState
  catalogFacets: CatalogFacets | null
  
  // Cart
  cartCount: number
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  isInCart: (productId: string) => boolean
  
  // Grid View
  isExpandedView: boolean
  toggleExpandedView: () => void
  
  // Actions
  submitSearch: (query: string) => void
  toggleFilter: (chip: FilterChip) => void
  clearFilters: () => void
  isChipActive: (chip: FilterChip) => boolean
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  // Status
  const [status, setStatus] = useState<Status>('idle')
  
  // AI Response
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  
  // Products
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  
  // Filters
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState)
  const [catalogFacets, setCatalogFacets] = useState<CatalogFacets | null>(null)
  
  // Cart
  const [cartItems, setCartItems] = useState<Product[]>([])
  const cartCount = cartItems.length
  
  // Grid View - expanded (3 columns) vs normal (4 columns)
  const [isExpandedView, setIsExpandedView] = useState(false)
  const toggleExpandedView = () => setIsExpandedView(prev => !prev)

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
    
    setFilteredProducts(
      hasActiveFilters 
        ? applyFilters(allProducts, filterState)
        : allProducts
    )
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
    setAiMessage(null) // Hide message first (slides down)
    
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
      
      // Auto-apply all chips to filter state
      const newFilterState = data.suggestedChips.reduce(
        (state, chip) => applyChipToFilters(state, chip),
        initialFilterState
      )
      setFilterState(newFilterState)
      
      setStatus('success')
    } catch (err) {
      setAiMessage('Sorry, something went wrong. Showing all products.')
      setFilterState(initialFilterState) // Reset filters - show all products
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
    setAiMessage(null) // Clear AI message when filters are cleared
  }

  // Check if product is in cart
  const isInCart = (productId: string): boolean => {
    return cartItems.some(item => item.id === productId)
  }

  // Add product to cart (prevent duplicates)
  const addToCart = (product: Product) => {
    if (!isInCart(product.id)) {
      setCartItems(prev => [...prev, product])
    }
  }

  // Remove product from cart
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId))
  }

  return (
    <SearchContext.Provider
      value={{
        status,
        aiMessage,
        allProducts,
        filteredProducts,
        filterState,
        catalogFacets,
        cartCount,
        addToCart,
        removeFromCart,
        isInCart,
        isExpandedView,
        toggleExpandedView,
        submitSearch,
        toggleFilter,
        clearFilters,
        isChipActive,
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
