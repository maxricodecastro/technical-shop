# Frontend Implementation

This document covers the UI components, layout, styling, and state management.

---

## Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│                    HEADER (sticky, z-50)                    │
│  [MENSWEAR] [WOMENSWEAR] [EVERYTHING ELSE] [SEARCH]        │
│                       SSENSE LOGO                           │
│         [ENGLISH] [LOGIN] [WISHLIST] [BAG(0)]              │
├────────────┬───────────────────────────────────────────────┤
│  SIDEBAR   │                 MAIN                           │
│  (sticky)  │            Product Grid                        │
│  w-80      │           (4 columns)                          │
│  flex-col  │                                                │
│            │  [Product] [Product] [Product] [Product]       │
│  [Search]  │  [Product] [Product] [Product] [Product]       │
│  [Filters] │  [Product] [Product] [Product] [Product]       │
│            │         (scrollable content)                   │
│  [AI Msg]  │                                                │
└────────────┴───────────────────────────────────────────────┘
```

---

## Typography System

### Font
- **Family**: Inter (Google Fonts)
- **Weights**: 400 (regular), 500 (medium)

### Base Typography
- **Font Size**: 11px (`--font-size-base`)
- **Line Height**: 15px (`--line-height-base`)
- **Color**: Black (#000000)

### CSS Variables (globals.css)
```css
:root {
  --font-size-base: 11px;
  --line-height-base: 15px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --foreground: #000000;
  --text-secondary: #7D7D7D;
  --border-secondary: #ADADAD;
}
```

---

## Component Organization

### Design System
- **Location**: `src/components/catalyst/`
- **Source**: Catalyst UI Kit (Tailwind Labs)
- **Import**: `@/components/catalyst/{component}`

### Custom Components
- **Location**: `src/components/`

### Available Catalyst Components
`alert`, `avatar`, `badge`, `button`, `checkbox`, `combobox`, `description-list`, `dialog`, `divider`, `dropdown`, `fieldset`, `heading`, `input`, `link`, `listbox`, `navbar`, `pagination`, `radio`, `select`, `sidebar`, `sidebar-layout`, `stacked-layout`, `switch`, `table`, `text`, `textarea`

---

## Components

### Header

**File:** `src/components/Header.tsx`

**Layout:**
- CSS Grid with 3 equal columns
- Sticky positioning: `sticky top-0 z-50`
- Background: White

**Content:**
- Left: MENSWEAR (underlined), WOMENSWEAR, EVERYTHING ELSE, SEARCH
- Center: SSENSE logo (SVG, 100px width)
- Right: ENGLISH, LOGIN, WISHLIST, BAG(0)

---

### Sidebar

**File:** `src/components/Sidebar.tsx`

**Layout:**
- Width: `w-80` (320px)
- Position: Sticky, `top-[57px]` (below header)
- Height: `calc(100vh - 57px)`
- Border: Right border `--border-secondary`

**Components:**
1. SearchBar (top)
2. Filters (middle, scrollable)
3. AIMessage (bottom, overlay)

---

### SearchBar

**File:** `src/components/SearchBar.tsx`

**Features:**
- Multi-line textarea support
- Auto-expanding up to 3 lines
- Search icon (left)
- Submit arrow (right, appears on input)

**Styling:**
- Border: `--border-secondary`
- No shadow, no rounded corners
- Placeholder: `--text-secondary`

**Behavior:**
- Enter key submits (without Shift)
- Arrow click submits
- Clears after submission

---

### Filters

**File:** `src/components/Filters.tsx`

**Layout:**
- Categories spaced with `gap-6`
- Filter items with `gap-2`
- Flex wrap for items

**Selection:**
- Selected items are underlined
- Selected items move to front of row
- Click to toggle selection

---

### AIMessage

**File:** `src/components/AIMessage.tsx`

**Position:**
- Absolute at bottom of sidebar
- Slides up when message appears
- Slides down when hidden

**Animation:**
- `transition-transform duration-300 ease-out`
- Hidden: `translate-y-full`
- Visible: `translate-y-0`

**Styling:**
- Matches SearchBar (same border, typography)
- White background
- Top border for separation

---

### ProductCard

**File:** `src/components/ProductCard.tsx`

**Layout:**
- Flex column
- Image with 640:1200 aspect ratio
- Max width: 200px

**Content:**
- Image (top-anchored, bottom-cropped)
- Title (all caps)
- Price (with $ prefix)

---

### ProductGrid

**File:** `src/components/ProductGrid.tsx`

**Layout:**
- Fixed 4 columns
- Gap: `gap-8`
- Padding: 120px left/right

---

## State Management

### SearchContext

**File:** `src/contexts/SearchContext.tsx`

**State:**
```typescript
interface SearchContextType {
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  query: string | null
  aiMessage: string | null
  selectedFilters: Set<string>
  
  submitSearch: (query: string) => void
  toggleFilter: (filterId: string) => void
  clearFilters: () => void
  setAiMessage: (message: string | null) => void
  setStatus: (status: Status) => void
}
```

**Provider:**
```tsx
// In page.tsx
<SearchProvider>
  <Sidebar />
  <ProductGrid />
</SearchProvider>
```

**Usage:**
```tsx
// In components
const { status, aiMessage, submitSearch } = useSearch()
```

---

## Component Hierarchy

```
HomePage (page.tsx)
├── Header (outside context)
└── SearchProvider
    └── Flex Container
        ├── Sidebar
        │   ├── SearchBar ← useSearch()
        │   ├── Filters ← useSearch()
        │   └── AIMessage ← useSearch()
        └── Main
            └── ProductGrid ← useSearch()
                └── ProductCard[]
```

---

## CSS Animations

### fadeInUp (SearchBar arrow)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### AIMessage Slide
- Tailwind transition: `translate-y-full` → `translate-y-0`
- Duration: 300ms
- Timing: ease-out

---

## Icon Library

- **Library**: Heroicons (`@heroicons/react`)
- **Style**: Sharp, minimal
- **Common Icons**:
  - `MagnifyingGlassIcon` - Search
  - `ArrowUpIcon` - Submit
  - `XMarkIcon` - Close/Remove

---

## Test Backend Page

**File:** `src/app/test-backend/page.tsx`

**Features:**
- Send queries to `/api/chat`
- View AI message and suggested chips
- Select/deselect chips interactively
- View filtered products in real-time
- Product count display

**Usage:**
Visit [http://localhost:3000/test-backend](http://localhost:3000/test-backend)

---

## Future Enhancements

- [ ] Connect Filters to API chips
- [ ] Price slider component
- [ ] In-stock toggle
- [ ] Resizable sidebar
- [ ] Loading skeletons for product grid
