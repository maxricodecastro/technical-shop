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

/**
 * FilterState tracks current filter values for the session.
 * - Used frontend-side for managing current filter state
 * - Resets when new AI response arrives
 * - NOT sent to API (stateless requests)
 * 
 * Filter Logic:
 * - OR within sections (e.g., jackets OR coats)
 * - AND across sections (e.g., (jackets OR coats) AND blue)
 */
export interface FilterState {
  subcategory: string | null
  subcategories: string[]  // Multiple subcategories for OR logic
  colors: string[]
  materials: string[]
  sizes: string[]
  inStock: boolean | null
  styleTags: string[]
  occasions: string[]  // e.g., ["athletic", "professional"]
}

export const initialFilterState: FilterState = {
  subcategory: null,
  subcategories: [],
  colors: [],
  materials: [],
  sizes: [],
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

export interface FilterChip {
  id: string
  type: ChipType
  label: string
  filterKey: keyof FilterState
  filterValue: string | boolean
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
}

// ============================================
// LLM RESPONSE TYPES
// ============================================

/**
 * Simplified LLM Response.
 * - No conversation history context
 * - No price extraction
 * - No intent modes
 * - Each request is stateless
 */
export interface LLMResponse {
  message: string
  chips: FilterChip[]
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

/**
 * Simplified Chat Request.
 * - Only contains the user message
 * - No conversation history (stateless)
 * - No current filters (reset on each response)
 * - No price range (removed)
 */
export interface ChatRequest {
  message: string
}

/**
 * Simplified Chat Response.
 * - Contains AI message and suggested chips
 * - All chips auto-apply to filters
 * - Frontend handles filter application with OR/AND logic
 */
export interface ChatResponse {
  message: string
  suggestedChips: FilterChip[]
  invalid?: FilterChip[]
  errors?: string[]
}

