# SearchContext Implementation Plan

## Overview

Implement React Context to share search/loading state across multiple components. This enables coordinated behavior when API calls are made and prepares for backend integration.

## Context State Shape

```typescript
interface SearchContextType {
  // Status
  status: 'idle' | 'loading' | 'success' | 'error'
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
  setStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void
}
```

## File Structure

```
src/
├── contexts/
│   └── SearchContext.tsx    # NEW - Context provider + hook
├── app/
│   └── page.tsx             # UPDATE - Wrap with SearchProvider
└── components/
    ├── Sidebar.tsx          # UPDATE - Remove local state, use context
    ├── SearchBar.tsx        # UPDATE - Use submitSearch from context
    ├── Filters.tsx          # UPDATE - Use selectedFilters + toggleFilter from context
    ├── AIMessage.tsx        # UPDATE - Use aiMessage + status from context
    └── ProductGrid.tsx      # UPDATE - Use status from context (for future loading)
```

## Implementation Steps

### Step 1: Create SearchContext.tsx

**Location**: `src/contexts/SearchContext.tsx`

**Contents**:
- `SearchContext` - React Context
- `SearchProvider` - Provider component with state
- `useSearch()` - Custom hook for consuming context

**State Migration**:
| From Sidebar | To Context |
|--------------|------------|
| `aiMessage` | `aiMessage` |
| `isWaitingForResponse` | `status === 'loading'` |
| `handleSearchSubmit` | `submitSearch` |

**New State**:
| State | Purpose |
|-------|---------|
| `query` | Current/last search query |
| `error` | Error message from API |
| `selectedFilters` | Set of selected filter IDs |

---

### Step 2: Update page.tsx

**Changes**:
1. Import `SearchProvider`
2. Wrap content with `<SearchProvider>`
3. Keep Header outside provider (doesn't need context)

**Before**:
```tsx
export default function HomePage() {
  return (
    <div>
      <Header />
      <div className="flex">
        <Sidebar />
        <main>
          <ProductGrid products={...} />
        </main>
      </div>
    </div>
  )
}
```

**After**:
```tsx
export default function HomePage() {
  return (
    <div>
      <Header />
      <SearchProvider>
        <div className="flex">
          <Sidebar />
          <main>
            <ProductGrid products={...} />
          </main>
        </div>
      </SearchProvider>
    </div>
  )
}
```

---

### Step 3: Update Sidebar.tsx

**Remove**:
- `useState` for `aiMessage`
- `useState` for `isWaitingForResponse`
- `handleTestMessage` function
- `handleSearchSubmit` function
- Test button (cleanup)

**Add**:
- `useSearch()` hook import
- Pass nothing to children (they use context directly)

**Before**:
```tsx
export function Sidebar() {
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  // ... handlers
  return (
    <aside>
      <SearchBar onSearchSubmit={handleSearchSubmit} />
      <Filters />
      <AIMessage message={aiMessage} />
    </aside>
  )
}
```

**After**:
```tsx
export function Sidebar() {
  return (
    <aside>
      <SearchBar />
      <Filters />
      <AIMessage />
    </aside>
  )
}
```

---

### Step 4: Update SearchBar.tsx

**Remove**:
- `onSearchSubmit` prop

**Add**:
- `useSearch()` hook
- Get `submitSearch` from context

**Changes**:
```tsx
// Before
interface SearchBarProps {
  onSearchSubmit?: (query: string) => void
}
export function SearchBar({ onSearchSubmit }: SearchBarProps) {
  // ...
  onSearchSubmit(searchQuery)
}

// After
export function SearchBar() {
  const { submitSearch } = useSearch()
  // ...
  submitSearch(searchQuery)
}
```

---

### Step 5: Update Filters.tsx

**Remove**:
- Local `selectedFilters` state
- Local `toggleFilter` function

**Add**:
- `useSearch()` hook
- Get `selectedFilters` and `toggleFilter` from context

**Changes**:
```tsx
// Before
export function Filters() {
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const toggleFilter = (filterId: string) => { ... }
}

// After
export function Filters() {
  const { selectedFilters, toggleFilter } = useSearch()
}
```

---

### Step 6: Update AIMessage.tsx

**Remove**:
- `message` prop

**Add**:
- `useSearch()` hook
- Get `aiMessage` and `status` from context

**Changes**:
```tsx
// Before
interface AIMessageProps {
  message: string | null
}
export function AIMessage({ message }: AIMessageProps) {
  const isVisible = message !== null
}

// After
export function AIMessage() {
  const { aiMessage, status } = useSearch()
  const isVisible = aiMessage !== null
  // Future: show loading indicator when status === 'loading'
}
```

---

### Step 7: Update ProductGrid.tsx

**Add**:
- `useSearch()` hook
- Get `status` from context (for future loading state)

**Changes**:
```tsx
// Before
export function ProductGrid({ products }: ProductGridProps) {
  return (...)
}

// After
export function ProductGrid({ products }: ProductGridProps) {
  const { status } = useSearch()
  // Future: show skeleton when status === 'loading'
  return (...)
}
```

---

## Future: Backend Integration

### Filter Suggestions Flow

When the backend generates filter suggestions, the flow will be:

```
1. User submits search query
   └── submitSearch(query) called
       └── status = 'loading'

2. API call to backend
   └── Backend processes query
   └── Returns: { products, filters, aiMessage }

3. Context updates
   └── status = 'success'
   └── aiMessage = response.aiMessage
   └── Update available filters (new state to add)
   └── Products passed to ProductGrid
```

### Additional State for Filter Suggestions

When ready to integrate with backend, add to context:

```typescript
interface SearchContextType {
  // ... existing state
  
  // Filter suggestions from AI
  suggestedFilters: FilterCategory[]  // AI-generated filter options
  setSuggestedFilters: (filters: FilterCategory[]) => void
}
```

### API Integration Points

| Action | API Call | Context Update |
|--------|----------|----------------|
| Search submit | `POST /api/search` | `status`, `aiMessage`, `suggestedFilters` |
| Filter toggle | `POST /api/filter` | `status`, filtered products |
| Clear filters | None (client-side) | `selectedFilters` cleared |

---

## Component Hierarchy with Context

```
page.tsx
├── Header (outside context)
└── SearchProvider ← CONTEXT PROVIDER
    └── Flex Container
        ├── Sidebar
        │   ├── SearchBar ← useSearch()
        │   ├── Filters ← useSearch()
        │   └── AIMessage ← useSearch()
        └── Main
            └── ProductGrid ← useSearch()
                └── ProductCard
```

---

## Checklist

### Implementation
- [ ] Create `src/contexts/SearchContext.tsx`
- [ ] Update `src/app/page.tsx` with provider
- [ ] Update `Sidebar.tsx` - remove state
- [ ] Update `SearchBar.tsx` - use context
- [ ] Update `Filters.tsx` - use context
- [ ] Update `AIMessage.tsx` - use context
- [ ] Update `ProductGrid.tsx` - use context
- [ ] Remove test button from Sidebar
- [ ] Test all functionality works

### Cleanup
- [ ] Remove unused props from components
- [ ] Remove unused imports
- [ ] Update Frontend.md with context documentation

### Future
- [ ] Add loading behaviors to components
- [ ] Add `suggestedFilters` state for AI filter suggestions
- [ ] Integrate with backend API
- [ ] Add error handling and display

---

## Notes

- Context provider is placed below Header (Header doesn't need search state)
- Filter selections are now global (shared between components)
- Status enum allows for granular loading states
- Ready for backend integration without major refactoring

