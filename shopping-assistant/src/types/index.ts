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
}

// ============================================
// FILTER CHIP TYPES
// ============================================

export type ChipType =
  | 'subcategory'
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
}

export interface ChatResponse {
  raw: string
  parsed: LLMResponse | null
  validated: FilterChip[]
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

