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
// INTENT MODE TYPES
// ============================================

/**
 * Intent mode indicates how the user's request relates to existing state.
 * - "replace": User wants to change/switch preferences (clear specified categories)
 * - "refine": User wants to add/narrow down (keep existing state)
 * - "explore": User wants alternatives without committing (keep state, show variety)
 */
export type IntentMode = 'replace' | 'refine' | 'explore'

/**
 * Categories that can be selectively replaced when intentMode is "replace".
 * - "all": Clear everything INCLUDING price
 * - "all_except_price": Clear all chips but preserve price range
 * - Individual categories: Clear only that category
 * - "price": Clear only price (reset to full range)
 */
export type ReplaceCategory =
  | 'all'
  | 'all_except_price'
  | 'subcategory'
  | 'occasions'
  | 'materials'
  | 'colors'
  | 'style_tags'
  | 'sizes'
  | 'price'

// ============================================
// LLM RESPONSE TYPES
// ============================================

export interface LLMResponse {
  message: string
  intentMode: IntentMode
  replaceCategories: ReplaceCategory[]
  chips: FilterChip[]
  priceQuestion?: string
  minPrice?: number | null  // Extracted minimum price from user query
  maxPrice?: number | null  // Extracted maximum price from user query
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
  intentMode: IntentMode
  replaceCategories: ReplaceCategory[]
}

// ============================================
// API TYPES
// ============================================

export interface ChatRequest {
  message: string
  conversationHistory?: Message[]
  currentFilters?: FilterState
  selectedChips?: FilterChip[]      // Chips user has selected (don't suggest duplicates)
  currentPriceRange?: {             // Current price slider state (manual or LLM-set)
    min: number
    max: number
    isDefault: boolean              // True if price range hasn't been modified
  }
}

export interface ChatResponse {
  raw: string
  parsed: LLMResponse | null
  suggestedChips: FilterChip[]      // NEW chips only (excludes already-selected)
  intentMode: IntentMode            // How to handle existing state
  replaceCategories: ReplaceCategory[]  // Which categories to clear (if intentMode is "replace")
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]
  minPrice?: number | null          // Extracted minimum price for slider
  maxPrice?: number | null          // Extracted maximum price for slider
  appliedFilters?: {                // Echo what backend actually used (for state sync verification)
    suggestedChipCount: number
    effectiveMinPrice: number | null
    effectiveMaxPrice: number | null
    totalProductsBeforeFilter: number
    totalProductsAfterFilter: number
  }
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

