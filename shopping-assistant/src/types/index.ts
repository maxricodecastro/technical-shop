// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string
  title: string
  description: string
  image_url: string
  price: number
  in_stock: boolean
  category: 'apparel'
  subcategory: string
  color: string
  material: string
  style_tags: string[]
  occasion: string[]  // e.g., ["athletic", "casual", "lounge"]
  size: string
}

// ============================================
// FILTER TYPES
// ============================================

export interface FilterState {
  subcategory: string | null
  colors: string[]
  materials: string[]
  sizes: string[]
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean | null
  styleTags: string[]
  occasions: string[]  // e.g., ["athletic", "professional"]
}

export const initialFilterState: FilterState = {
  subcategory: null,
  colors: [],
  materials: [],
  sizes: [],
  minPrice: null,
  maxPrice: null,
  inStock: null,
  styleTags: [],
  occasions: [],
}

// ============================================
// FILTER CHIP TYPES
// ============================================

export type ChipType =
  | 'subcategory'
  | 'occasion'
  | 'color'
  | 'material'
  | 'style_tag'
  | 'size'
  | 'price_range'

export interface FilterChip {
  id: string
  type: ChipType
  label: string
  filterKey: keyof FilterState
  filterValue: string | number | boolean
}

// ============================================
// CATALOG FACETS
// ============================================

export interface CatalogFacets {
  subcategories: string[]
  occasions: string[]  // athletic, outdoor, professional, formal, casual, lounge, date, travel
  colors: string[]
  materials: string[]
  styleTags: string[]
  sizes: string[]
  priceRange: {
    min: number
    max: number
  }
}

// ============================================
// LLM RESPONSE TYPES
// ============================================

export interface LLMResponse {
  message: string
  chips: FilterChip[]
  priceQuestion?: string
}

export interface LLMRegenerateResponse {
  message: string
  chips: FilterChip[]
}

export interface LLMSimilarResponse {
  message: string
  alternatives: {
    description: string
    chips: FilterChip[]
  }[]
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  success: boolean
  data?: LLMResponse
  valid: FilterChip[]
  invalid: FilterChip[]
  errors: string[]
}

// ============================================
// API TYPES
// ============================================

export interface ChatRequest {
  message: string
  conversationHistory?: Message[]
  currentFilters?: FilterState
  selectedChips?: FilterChip[]      // Chips user has selected (don't suggest duplicates)
}

export interface ChatResponse {
  raw: string
  parsed: LLMResponse | null
  suggestedChips: FilterChip[]      // NEW chips only (excludes already-selected)
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]
}

// ============================================
// MESSAGE TYPES (for conversation history)
// ============================================

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  suggestedChips?: FilterChip[]
  priceQuestion?: string
  timestamp: number
}

