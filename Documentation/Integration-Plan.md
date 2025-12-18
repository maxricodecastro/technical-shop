# Frontend-Backend Integration Plan

This document details the integration of the AI chat backend with the shopping assistant frontend.

---

## Summary

| Decision | Choice |
|----------|--------|
| Filter matching | `filterKey + filterValue` (not string IDs) |
| State structure | `FilterChip[]` + `FilterState` from backend |
| Auto-apply chips | Yes, all chips become selected immediately |
| Manual toggle | Additive (adds to AI selection) |
| Disabled filters | Gray out with `--text-secondary`, non-clickable |
| Filtering location | `SearchContext` (centralized state) |
| Category label | Keep "CATEGORIES" UI label, maps to `subcategory` |
| Error handling | Show error message, return all products |

---

## Components Overview

| Component | Current State | Target State | Changes |
|-----------|---------------|--------------|---------|
| `SearchContext` | `Set<string>` IDs, dummy API | `FilterChip[]` + `FilterState`, real API | **Full rewrite** |
| `Filters.tsx` | Hardcoded categories, ID-based | Dynamic from facets, `filterKey+filterValue` matching | **Full rewrite** |
| `ProductGrid.tsx` | Receives dummy products via props | Receives filtered products from context | **Minor update** |
| `page.tsx` | Imports `dummyProducts.json` | No product import, just renders components | **Minor update** |
| `AIMessage.tsx` | Shows `aiMessage` from context | Same - uses `aiMessage` from context | **No changes** |
| `SearchBar.tsx` | Calls `submitSearch` | Same - calls `submitSearch` from context | **No changes** |

---

## Phase 1: SearchContext Overhaul

**File:** `src/contexts/SearchContext.tsx`

### Current State
```typescript
// Current state (to be replaced)
const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
const submitSearch = (query: string) => {
  // Dummy implementation with setTimeout
}
```

### Target State
```typescript
// New state structure
const [allProducts, setAllProducts] = useState<Product[]>([])
const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
const [suggestedChips, setSuggestedChips] = useState<FilterChip[]>([])
const [filterState, setFilterState] = useState<FilterState>(initialFilterState)
const [catalogFacets, setCatalogFacets] = useState<CatalogFacets | null>(null)
```

### Changes Required

#### 1.1 Add Imports
```typescript
import { Product, FilterChip, FilterState, CatalogFacets, ChatResponse, initialFilterState } from '@/types'
import { applyFilters, applyChipToFilters, removeChipFromFilters } from '@/lib/filters/engine'
import { getCatalogFacets } from '@/lib/catalog/facets'
import productsData from '@/data/products.json'
```

#### 1.2 Initialize Products on Mount
```typescript
useEffect(() => {
  const products = productsData as Product[]
  setAllProducts(products)
  setFilteredProducts(products) // Initially show all
  setCatalogFacets(getCatalogFacets(products))
}, [])
```

#### 1.3 Replace `submitSearch` with Real API Call
```typescript
const submitSearch = async (searchQuery: string) => {
  if (searchQuery.trim().length === 0) return
  
  setStatus('loading')
  setQuery(searchQuery)
  setAiMessage(null)
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
    setFilterState(initialFilterState) // Reset filters
    setSuggestedChips([])
    setStatus('error')
  }
}
```

#### 1.4 Compute Filtered Products When FilterState Changes
```typescript
useEffect(() => {
  const hasActiveFilters = Object.values(filterState).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== null
  )
  
  if (hasActiveFilters) {
    setFilteredProducts(applyFilters(allProducts, filterState))
  } else {
    setFilteredProducts(allProducts)
  }
}, [filterState, allProducts])
```

#### 1.5 Replace `toggleFilter` with Chip-Based Toggle
```typescript
const toggleFilter = (chip: FilterChip) => {
  setFilterState(prev => {
    // Check if this chip is currently active
    const isActive = isChipActive(prev, chip)
    
    if (isActive) {
      return removeChipFromFilters(prev, chip)
    } else {
      return applyChipToFilters(prev, chip)
    }
  })
}

// Helper to check if a chip is active in current filter state
const isChipActive = (state: FilterState, chip: FilterChip): boolean => {
  const key = chip.filterKey
  const value = chip.filterValue
  
  if (key === 'subcategory') {
    return state.subcategory === value || state.subcategories.includes(value as string)
  }
  if (key === 'subcategories') {
    return state.subcategories.includes(value as string)
  }
  if (key === 'colors') {
    return state.colors.includes(value as string)
  }
  if (key === 'materials') {
    return state.materials.includes(value as string)
  }
  if (key === 'styleTags') {
    return state.styleTags.includes(value as string)
  }
  if (key === 'occasions') {
    return state.occasions.includes(value as string)
  }
  if (key === 'sizes') {
    return state.sizes.includes(value as string)
  }
  if (key === 'inStock') {
    return state.inStock === value
  }
  return false
}
```

#### 1.6 Update Context Interface
```typescript
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
```

#### 1.7 Update `clearFilters`
```typescript
const clearFilters = () => {
  setFilterState(initialFilterState)
  setSuggestedChips([])
}
```

---

## Phase 2: Filters Component Rewrite

**File:** `src/components/Filters.tsx`

### Current State
- Hardcoded `filterCategories` array with static filter items
- Uses string IDs like `cat-tshirts`, `color-blue`
- Uses `selectedFilters: Set<string>` from context

### Target State
- Generate filters dynamically from `catalogFacets`
- Use `FilterChip` objects for selection
- Disable filters that would return 0 products

### Changes Required

#### 2.1 Remove Hardcoded Filter Data
Delete the entire `filterCategories` constant.

#### 2.2 Generate Filters from Catalog Facets
```typescript
interface FilterSection {
  name: string
  filterKey: keyof FilterState
  chipType: ChipType
  values: string[]
}

function buildFilterSections(facets: CatalogFacets): FilterSection[] {
  return [
    {
      name: 'CATEGORIES',
      filterKey: 'subcategories',
      chipType: 'subcategory',
      values: facets.subcategories,
    },
    {
      name: 'COLORS',
      filterKey: 'colors',
      chipType: 'color',
      values: facets.colors,
    },
    {
      name: 'MATERIALS',
      filterKey: 'materials',
      chipType: 'material',
      values: facets.materials,
    },
    {
      name: 'STYLE',
      filterKey: 'styleTags',
      chipType: 'style_tag',
      values: facets.styleTags,
    },
    {
      name: 'OCCASION',
      filterKey: 'occasions',
      chipType: 'occasion',
      values: facets.occasions,
    },
    {
      name: 'SIZE',
      filterKey: 'sizes',
      chipType: 'size',
      values: facets.sizes,
    },
  ]
}
```

#### 2.3 Create FilterChip from Value
```typescript
function createChipFromValue(
  value: string,
  filterKey: keyof FilterState,
  chipType: ChipType
): FilterChip {
  return {
    id: `filter-${chipType}-${value}`,
    type: chipType,
    label: capitalize(value),
    filterKey,
    filterValue: value,
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

#### 2.4 Compute Disabled State
A filter is disabled if selecting it (in addition to current filters) would return 0 products.

```typescript
function wouldFilterHaveResults(
  allProducts: Product[],
  currentFilterState: FilterState,
  chip: FilterChip
): boolean {
  // Create hypothetical filter state with this chip added
  const hypotheticalState = applyChipToFilters(currentFilterState, chip)
  const results = applyFilters(allProducts, hypotheticalState)
  return results.length > 0
}
```

#### 2.5 Updated Component
```typescript
export function Filters() {
  const { 
    catalogFacets, 
    filterState, 
    allProducts,
    toggleFilter, 
    isChipActive 
  } = useSearch()

  if (!catalogFacets) return null

  const sections = buildFilterSections(catalogFacets)

  return (
    <div className="flex flex-col gap-6 mt-6">
      {sections.map((section) => (
        <div key={section.name} className="flex flex-col gap-2">
          <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-medium)] uppercase">
            {section.name}
          </div>

          <div className="flex flex-wrap gap-2">
            {section.values.map((value) => {
              const chip = createChipFromValue(value, section.filterKey, section.chipType)
              const isSelected = isChipActive(chip)
              const isDisabled = !isSelected && !wouldFilterHaveResults(allProducts, filterState, chip)
              
              return (
                <button
                  key={chip.id}
                  onClick={() => !isDisabled && toggleFilter(chip)}
                  disabled={isDisabled}
                  className={`text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] ${
                    isDisabled 
                      ? 'text-[var(--text-secondary)] cursor-not-allowed' 
                      : 'hover:underline cursor-pointer'
                  } ${isSelected ? 'underline' : ''}`}
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
```

---

## Phase 3: ProductGrid Update

**File:** `src/components/ProductGrid.tsx`

### Current State
```typescript
interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  // Uses products from props
}
```

### Target State
```typescript
export function ProductGrid() {
  const { filteredProducts } = useSearch()
  // Uses filteredProducts from context
}
```

### Changes Required

#### 3.1 Remove Props, Use Context
```typescript
'use client'

import { ProductCard } from './ProductCard'
import { useSearch } from '@/contexts/SearchContext'

export function ProductGrid() {
  const { filteredProducts, status } = useSearch()
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-8 py-4" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
        {filteredProducts.map((product) => (
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
```

---

## Phase 4: Page.tsx Update

**File:** `src/app/page.tsx`

### Current State
```typescript
import dummyProducts from '@/data/dummyProducts.json'

export default function HomePage() {
  return (
    // ...
    <ProductGrid products={dummyProducts as Product[]} />
  )
}
```

### Target State
```typescript
export default function HomePage() {
  return (
    // ...
    <ProductGrid /> // No props - uses context
  )
}
```

### Changes Required

#### 4.1 Remove dummyProducts Import
```typescript
// Remove this line:
// import dummyProducts from '@/data/dummyProducts.json'
```

#### 4.2 Remove Props from ProductGrid
```typescript
<main className="flex-1">
  <ProductGrid />
</main>
```

---

## Phase 5: Type Updates (if needed)

**File:** `src/types/index.ts`

### Verify These Types Exist
Ensure the following are exported:
- `Product`
- `FilterChip`
- `FilterState`
- `CatalogFacets`
- `ChatResponse`
- `ChipType`
- `initialFilterState`

No changes expected - types already defined per Architecture.md.

---

## Phase 5: AIMessage Component

**File:** `src/components/AIMessage.tsx`

### No Changes Required

The component already:
- Uses `useSearch()` to get `aiMessage` and `status`
- Shows/hides based on `aiMessage !== null && aiMessage.trim().length > 0`
- Displays the AI response message

The updated `SearchContext` will:
- Set `aiMessage` from `ChatResponse.message` on success
- Set `aiMessage` to error message on failure ("Sorry, something went wrong. Showing all products.")

**Current implementation works as-is.**

---

## Implementation Order

| Step | File | Description | Depends On |
|------|------|-------------|------------|
| 1 | `SearchContext.tsx` | Full rewrite with API integration | - |
| 2 | `Filters.tsx` | Dynamic filters with disabled state | Step 1 |
| 3 | `ProductGrid.tsx` | Use context instead of props | Step 1 |
| 4 | `page.tsx` | Remove dummy imports, update props | Step 3 |
| 5 | `AIMessage.tsx` | No changes needed (verify works) | Step 1 |
| 6 | Test | Verify end-to-end flow | All |

---

## Testing Checklist

### Empty State
- [ ] All products displayed
- [ ] All filters visible, none selected, none disabled
- [ ] No AI message shown

### After Search
- [ ] API called with user message
- [ ] AI message displayed
- [ ] Suggested chips auto-selected (underlined)
- [ ] Products filtered correctly
- [ ] Filters without matching products are grayed out

### Manual Toggle
- [ ] Clicking selected filter deselects it
- [ ] Clicking unselected filter adds it to selection
- [ ] Products update immediately
- [ ] Disabled filters are not clickable

### Error Handling
- [ ] On API error, show error message
- [ ] All products remain visible
- [ ] Filters reset to empty state

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SearchContext                                    │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ allProducts  │    │ filterState  │    │ catalogFacets│                   │
│  │ (50 items)   │    │ {colors:[],  │    │ {colors:[],  │                   │
│  └──────────────┘    │  materials:[]│    │  materials:[]│                   │
│         │            │  ...}        │    │  ...}        │                   │
│         │            └──────────────┘    └──────────────┘                   │
│         │                   │                   │                           │
│         ▼                   ▼                   │                           │
│  ┌─────────────────────────────────┐           │                           │
│  │     applyFilters(products,     │           │                           │
│  │         filterState)           │           │                           │
│  └─────────────────────────────────┘           │                           │
│                   │                             │                           │
│                   ▼                             │                           │
│         ┌──────────────────┐                   │                           │
│         │ filteredProducts │                   │                           │
│         └──────────────────┘                   │                           │
│                   │                             │                           │
└───────────────────┼─────────────────────────────┼───────────────────────────┘
                    │                             │
        ┌───────────┴───────────┐     ┌──────────┴──────────┐
        ▼                       ▼     ▼                      ▼
┌───────────────┐       ┌───────────────┐           ┌───────────────┐
│  ProductGrid  │       │   Filters     │           │  SearchBar    │
│               │       │               │           │               │
│ Renders       │       │ Shows all     │           │ submitSearch()│
│ filtered      │       │ options from  │           │ calls API     │
│ products      │       │ catalogFacets │           │               │
└───────────────┘       │               │           └───────────────┘
                        │ Disables      │
                        │ non-matching  │
                        │ filters       │
                        └───────────────┘
```

---

## API Contract Reference

### Request
```typescript
POST /api/chat
{
  "message": "I want a cozy blue sweater"
}
```

### Response
```typescript
{
  "message": "Looking for cozy sweaters! Here are some filters:",
  "suggestedChips": [
    {
      "id": "chip-subcategory-sweaters",
      "type": "subcategory",
      "label": "Sweaters",
      "filterKey": "subcategories",
      "filterValue": "sweaters"
    },
    {
      "id": "chip-color-blue",
      "type": "color",
      "label": "Blue",
      "filterKey": "colors",
      "filterValue": "blue"
    }
  ]
}
```

---

## Notes

1. **Performance**: The `wouldFilterHaveResults` function runs for each filter option on each render. For 50 products and ~50 filter options, this is ~2,500 filter operations per render. This is acceptable but could be memoized if needed.

2. **Case Sensitivity**: Filter values are stored lowercase in products. The `capitalize()` function is used for display labels only.

3. **Filter Labels**: "CATEGORIES" maps to `subcategory` field. This is intentional per requirements (Option A).

