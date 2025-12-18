# Frontend-Backend Integration Plan

## Overview

This document outlines the plan to connect the shopping assistant frontend to the existing backend API. The backend is fully functional; the frontend currently uses mock data and simulated API responses.

---

## Current State Analysis

### ✅ Backend (Fully Implemented)

| Component | Location | Status |
|-----------|----------|--------|
| `/api/chat` endpoint | `src/app/api/chat/route.ts` | ✅ Working |
| Prompt builder | `src/lib/ai/prompts.ts` | ✅ Complete |
| LLM validation | `src/lib/ai/validate.ts` | ✅ Complete |
| Catalog facets | `src/lib/catalog/facets.ts` | ✅ Complete |
| Filter engine | `src/lib/filters/engine.ts` | ✅ Complete |
| Type definitions | `src/types/index.ts` | ✅ Complete |
| Products data | `src/data/products.json` | ✅ 50 products |
| Test page | `src/app/test-backend/page.tsx` | ✅ Full integration example |

**Backend Features:**
- Groq LLM integration (`llama-3.3-70b-versatile`)
- Intent mode detection (replace/refine/explore)
- Price extraction from user queries
- Data-driven color chips (derived from products)
- LLM-driven materials and style tags (context-aware)
- Chip validation against catalog facets
- Product matching with OR logic

### ⚠️ Frontend (Needs Integration)

| Component | Location | Current State | Needs |
|-----------|----------|--------------|-------|
| `SearchContext` | `src/contexts/SearchContext.tsx` | Mock API delay | Connect to `/api/chat` |
| `SearchBar` | `src/components/SearchBar.tsx` | Calls context mock | Works, just needs real API |
| `Filters` | `src/components/Filters.tsx` | Hardcoded dummy data | Use API chips |
| `ProductGrid` | `src/components/ProductGrid.tsx` | Uses `dummyProducts.json` | Use real products, apply filters |
| `AIMessage` | `src/components/AIMessage.tsx` | Shows mock message | Use API message |
| `page.tsx` | `src/app/page.tsx` | Imports `dummyProducts` | Use real products |

---

## Data Gaps

### 1. Product Images
**Current:** `products.json` has `image_url: "/placeholder.svg"` for all products.
**Solution:** Update all products to use the default SSENSE image:
```
https://img.ssensemedia.com/images/f_auto,c_limit,h_2800,w_1725/252782M202002_1/fear-of-god-black-qualified-hoodie.jpg
```

### 2. Filter Data
**Current:** `Filters.tsx` has hardcoded categories, colors, materials.
**Solution:** Derive filters from API response chips + catalog facets.

### 3. Price Slider Component
**Current:** No price slider component exists in the frontend.
**Solution:** ⏳ **FUTURE STEP** - Create a price slider component that connects to the price extraction from LLM responses. This is deferred and not part of the current integration.

---

## Key Design Decisions

### No Conversation History in Frontend
The frontend does **not** maintain or display conversation history. Only the **most recent AI message** is shown in the `AIMessage` component. 

The backend still receives conversation history for context (if needed in the future), but the frontend only displays:
- The current user query (in SearchBar, cleared after submit)
- The most recent AI assistant message (in AIMessage component)

This is the `parsed.message` from the API response - the friendly text like:
> "Let's find something you'll love. What's the occasion?"

### AIMessage Content
The `AIMessage` component shows **only** the AI's response message. It does NOT display:
- ❌ Price questions (these are for backend context only)
- ❌ Conversation history
- ❌ Chip suggestions (these go in Filters component)

---

## Integration Steps

### Phase 1: Data Preparation

#### Step 1.1: Update Product Images
**File:** `src/data/products.json`
**Action:** Replace all `image_url` values with the default SSENSE image URL.

```json
{
  "id": "prod-001",
  "image_url": "https://img.ssensemedia.com/images/f_auto,c_limit,h_2800,w_1725/252782M202002_1/fear-of-god-black-qualified-hoodie.jpg",
  ...
}
```

#### Step 1.2: Delete Dummy Products
**File:** `src/data/dummyProducts.json`
**Action:** Delete this file after migration (currently used by `page.tsx`).

---

### Phase 2: Expand SearchContext

#### Step 2.1: Add Complete State
**File:** `src/contexts/SearchContext.tsx`

**New State Shape:**
```typescript
interface SearchContextType {
  // Status
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  
  // Products
  allProducts: Product[]        // Full catalog
  filteredProducts: Product[]   // After filters applied
  
  // Search
  query: string | null
  
  // AI Response (most recent only - no history displayed)
  aiMessage: string | null      // The parsed.message from API response
  
  // Chips
  selectedChips: FilterChip[]   // User-selected (persist across queries)
  suggestedChips: FilterChip[]  // From API (refresh each query)
  
  // Filters (derived from chips)
  filters: FilterState
  
  // Actions
  submitSearch: (query: string) => Promise<void>
  selectChip: (chip: FilterChip) => void
  deselectChip: (chip: FilterChip) => void
  clearAllChips: () => void
  setStatus: (status: Status) => void
}
```

**Note:** No `conversationHistory` in frontend state. No `priceRange` or `priceQuestion` - these are future features.

#### Step 2.2: Implement Real API Call
**Replace mock `submitSearch` with:**

```typescript
const submitSearch = async (searchQuery: string) => {
  if (searchQuery.trim().length === 0) return
  
  setStatus('loading')
  setQuery(searchQuery)
  setAiMessage(null) // Hide current message (slide down animation)
  setError(null)
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: searchQuery,
        selectedChips: selectedChips,
        // Note: conversationHistory and currentPriceRange are optional
        // and not used in this MVP frontend
      }),
    })
    
    if (!response.ok) {
      throw new Error('API request failed')
    }
    
    const data = await response.json() as ChatResponse
    
    // Handle intent mode (clear chips if needed)
    handleIntentMode(data.intentMode, data.replaceCategories)
    
    // Update suggested chips
    setSuggestedChips(data.suggestedChips)
    
    // Update AI message (the assistant's response text)
    // This is what displays in the AIMessage component
    setAiMessage(data.parsed?.message || 'Here are some options for you.')
    
    // Update filtered products
    if (data.matchingProducts) {
      setFilteredProducts(data.matchingProducts)
    }
    
    setStatus('success')
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error')
    setStatus('error')
  }
}
```

#### Step 2.3: Implement Intent Mode Handler
```typescript
const handleIntentMode = (
  intentMode: IntentMode,
  replaceCategories: ReplaceCategory[]
) => {
  if (intentMode !== 'replace') return
  
  if (replaceCategories.includes('all') || replaceCategories.includes('all_except_price')) {
    setSelectedChips([])
    return
  }
  
  // Clear specific categories
  const typeMap: Record<string, ChipType> = {
    'subcategory': 'subcategory',
    'occasions': 'occasion',
    'materials': 'material',
    'colors': 'color',
    'style_tags': 'style_tag',
    'sizes': 'size',
  }
  
  const typesToClear = replaceCategories
    .filter(cat => cat in typeMap)
    .map(cat => typeMap[cat as keyof typeof typeMap])
  
  setSelectedChips(prev => prev.filter(chip => !typesToClear.includes(chip.type)))
}
```

---

### Phase 3: Update Components

#### Step 3.1: Update `page.tsx`
**File:** `src/app/page.tsx`

```typescript
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ProductGrid } from '@/components/ProductGrid'
import { SearchProvider } from '@/contexts/SearchContext'
import productsData from '@/data/products.json'
import { Product } from '@/types'

// Apply default image to all products
const DEFAULT_IMAGE = 'https://img.ssensemedia.com/images/f_auto,c_limit,h_2800,w_1725/252782M202002_1/fear-of-god-black-qualified-hoodie.jpg'
const products: Product[] = (productsData as Product[]).map(p => ({
  ...p,
  image_url: p.image_url === '/placeholder.svg' ? DEFAULT_IMAGE : p.image_url
}))

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SearchProvider initialProducts={products}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <ProductGrid />
          </main>
        </div>
      </SearchProvider>
    </div>
  )
}
```

#### Step 3.2: Update `Filters.tsx`
**File:** `src/components/Filters.tsx`

**Changes:**
1. Remove hardcoded `dummyFilters`
2. Get chips from context (`selectedChips` + `suggestedChips`)
3. Group chips by type for display
4. Handle chip selection/deselection

```typescript
'use client'

import { useSearch } from '@/contexts/SearchContext'
import { FilterChip } from '@/types'

export function Filters() {
  const { selectedChips, suggestedChips, selectChip, deselectChip, status } = useSearch()
  
  // Group chips by type for display
  const chipGroups = groupChipsByType([...selectedChips, ...suggestedChips])
  
  const isSelected = (chip: FilterChip) => 
    selectedChips.some(c => c.id === chip.id)
  
  const handleChipClick = (chip: FilterChip) => {
    if (isSelected(chip)) {
      deselectChip(chip)
    } else {
      selectChip(chip)
    }
  }
  
  // Show loading skeleton while fetching
  if (status === 'loading') {
    return <FiltersSkeleton />
  }
  
  // Empty state - no chips yet
  if (selectedChips.length === 0 && suggestedChips.length === 0) {
    return (
      <div className="flex flex-col gap-6 mt-6">
        <p className="text-[var(--text-secondary)] text-sm">
          Search for products to see filter suggestions
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-6 mt-6">
      {Object.entries(chipGroups).map(([type, chips]) => (
        <div key={type} className="flex flex-col gap-2">
          <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-medium)] uppercase">
            {formatChipType(type)}
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const selected = isSelected(chip)
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip)}
                  className={`text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] hover:underline cursor-pointer ${
                    selected ? 'underline font-medium' : ''
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function groupChipsByType(chips: FilterChip[]): Record<string, FilterChip[]> {
  return chips.reduce((groups, chip) => {
    const type = chip.type
    if (!groups[type]) groups[type] = []
    groups[type].push(chip)
    return groups
  }, {} as Record<string, FilterChip[]>)
}

function formatChipType(type: string): string {
  const labels: Record<string, string> = {
    subcategory: 'CATEGORIES',
    occasion: 'OCCASIONS',
    color: 'COLORS',
    material: 'MATERIALS',
    style_tag: 'STYLES',
    size: 'SIZES',
  }
  return labels[type] || type.toUpperCase()
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-6 mt-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-4 w-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### Step 3.3: Update `ProductGrid.tsx`
**File:** `src/components/ProductGrid.tsx`

**Changes:**
1. Get products from context (`filteredProducts`)
2. Show loading skeleton during API calls
3. Show empty state when no products match

```typescript
'use client'

import { ProductCard } from './ProductCard'
import { useSearch } from '@/contexts/SearchContext'

export function ProductGrid() {
  const { filteredProducts, status, allProducts } = useSearch()
  
  // Use filtered products if available, otherwise show all
  const products = filteredProducts.length > 0 ? filteredProducts : allProducts
  
  // Show skeleton during loading
  if (status === 'loading') {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-8 py-4" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }
  
  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">
          No products match your filters. Try adjusting your search.
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-8 py-4" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            imageUrl={product.image_url}
            title={product.title}
            price={product.price}
            alt={product.title}
          />
        ))}
      </div>
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="w-full max-w-[200px] bg-gray-200" style={{ aspectRatio: '640 / 1200' }} />
      <div className="mt-2 h-4 w-3/4 bg-gray-200 rounded" />
      <div className="mt-1 h-4 w-1/4 bg-gray-100 rounded" />
    </div>
  )
}
```

#### Step 3.4: Update `AIMessage.tsx`
**File:** `src/components/AIMessage.tsx`

**Changes:**
- Get `aiMessage` from context
- Display ONLY the AI's response message (no price question)

```typescript
'use client'

import { useSearch } from '@/contexts/SearchContext'

export function AIMessage() {
  const { aiMessage } = useSearch()
  
  const isVisible = aiMessage !== null && aiMessage.trim().length > 0
  
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="p-4 bg-white border-t border-[var(--border-secondary)]">
        <div className="w-full py-3 px-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] border border-[var(--border-secondary)] bg-white text-black">
          {aiMessage}
        </div>
      </div>
    </div>
  )
}
```

**What `aiMessage` contains:**
This is the `parsed.message` from the API response - the assistant's friendly text response, such as:
- "Let's find something you'll love. What's the occasion?"
- "Looking for cozy winter sweaters! Here are some filters:"
- "Great choice! I've filtered to show wool sweaters in earth tones."

---

## Implementation Checklist

### Phase 1: Data Preparation
- [ ] Update all `image_url` in `products.json` to default SSENSE image
- [ ] Delete `dummyProducts.json` after verification

### Phase 2: Context Expansion
- [ ] Add new state fields to `SearchContextType`
- [ ] Accept `initialProducts` prop in `SearchProvider`
- [ ] Replace mock `submitSearch` with real API call
- [ ] Implement `handleIntentMode` function
- [ ] Add chip selection/deselection handlers

### Phase 3: Component Updates
- [ ] Update `page.tsx` to use `products.json` with default image
- [ ] Rewrite `Filters.tsx` to use context chips
- [ ] Update `ProductGrid.tsx` to use context products
- [ ] Update `AIMessage.tsx` to show only AI message (no price question)

### Phase 4: Testing & Polish
- [ ] Test full flow: search → chips → filter → products
- [ ] Test intent mode: replace vs refine
- [ ] Test chip persistence across queries
- [ ] Keep `test-backend` page for debugging
- [ ] Add loading skeletons
- [ ] Add error handling UI

### Future Steps (Not in Current Scope)
- [ ] **Price Slider Component** - Create UI for price filtering with slider
- [ ] **Price Extraction Display** - Connect LLM price extraction to price slider
- [ ] **Conversation History** - If needed, add multi-turn conversation display

---

## API Contract Reference

### Request: `POST /api/chat`
```typescript
{
  message: string
  conversationHistory?: Message[]       // Optional - not used in MVP
  selectedChips?: FilterChip[]
  currentPriceRange?: {                  // Optional - not used in MVP
    min: number
    max: number
    isDefault: boolean
  }
}
```

### Response: `ChatResponse`
```typescript
{
  raw: string
  parsed: {
    message: string           // ← This is what AIMessage displays
    priceQuestion?: string    // Not displayed in MVP
  } | null
  suggestedChips: FilterChip[]
  intentMode: 'replace' | 'refine' | 'explore'
  replaceCategories: ReplaceCategory[]
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]
  minPrice?: number | null    // Not used in MVP
  maxPrice?: number | null    // Not used in MVP
  appliedFilters?: { ... }    // For debugging
}
```

---

## Reference Implementation

The `test-backend/page.tsx` file contains a fully working implementation of:
- API integration with `/api/chat`
- Chip selection/deselection
- Intent mode handling
- Price range management (future feature reference)
- Conversation history (for debugging context)
- State sync verification

The key part to reference for `AIMessage` is the "🤖 Assistant" section which shows the `parsed.message`:
```
💬 CONVERSATION CONTEXT
...
🤖 Assistant
8:51:26 PM
Let's find something you'll love. What's the occasion?  ← This is parsed.message
```

Use this as a reference when implementing the production components.

---

## Notes

- **Default Image URL:** `https://img.ssensemedia.com/images/f_auto,c_limit,h_2800,w_1725/252782M202002_1/fear-of-god-black-qualified-hoodie.jpg`
- **Catalog Price Range:** $0 - $275
- **Filter Logic:** OR within category, AND across categories
- **Color Chips:** Data-driven from catalog (not LLM-generated)
- **Material/Style Chips:** LLM-driven (context-aware, no catalog supplementation)
- **No Conversation History in Frontend:** Only the most recent AI message is displayed
- **No Price Slider (Yet):** Price filtering is a future feature
