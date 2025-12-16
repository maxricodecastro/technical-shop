# Shopping Assistant - Technical Architecture

## Overview
This document outlines the technical architecture for the AI Shopping Assistant. This is a **frontend-only application** built with Next.js 14+ (App Router), TypeScript, and Tailwind CSS.

**Design Principles:**
- Keep it simple - avoid over-engineering
- All data lives on the frontend
- No embeddings - LLM directly converts queries to filters
- Multiple focused prompt calls for different tasks
- Fast iteration over perfect architecture

## Tech Stack

### Core
- **Next.js 14+** (App Router) → Vercel deployment
- **React 18+** with TypeScript (strict mode)
- **Tailwind CSS** for styling

### UI
- **shadcn/ui** - Customized primitives
- **framer-motion** - Animations

### AI Services
- **Groq** - Fast LLM inference (Llama 3.1 70B) - Primary for filter generation
- **OpenAI GPT-4 Vision** - Image analysis only (describes uploaded images)

### Utilities
- **clsx** + **tailwind-merge** - className management

## Core Concept: LLM as Filter Translator

Instead of using embeddings and semantic search, we use the LLM directly to translate user intent into filters:

```
User: "I want a cozy sweater for winter, maybe in earth tones"
           │
           ▼
    ┌─────────────────┐
    │   Groq LLM      │
    │   (with catalog │
    │    facets)      │
    └────────┬────────┘
             │
             ▼
{
  "message": "Looking for cozy winter sweaters! Here are some filters:",
  "chips": [
    { "type": "subcategory", "label": "Sweaters", "filterKey": "subcategory", "filterValue": "sweaters" },
    { "type": "material", "label": "Wool", "filterKey": "materials", "filterValue": "wool" },
    { "type": "color", "label": "Brown", "filterKey": "colors", "filterValue": "brown" },
    { "type": "color", "label": "Beige", "filterKey": "colors", "filterValue": "beige" },
    { "type": "style_tag", "label": "Cozy", "filterKey": "styleTags", "filterValue": "cozy" }
  ],
  "priceQuestion": "What's your budget for the sweater?"
}
```

## Project Structure

```
ramp-technical/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Main shopping page
│   │   ├── globals.css
│   │   └── api/
│   │       ├── chat/route.ts           # Groq - filter generation
│   │       ├── regenerate/route.ts     # Groq - alternative suggestions
│   │       ├── vision/route.ts         # GPT-4 Vision - image description
│   │       └── similar/route.ts        # Groq - similar product suggestions
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives (customized)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── chip.tsx
│   │   │   ├── card.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx              # For price range
│   │   │   └── switch.tsx              # For in-stock toggle
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Logo.tsx
│   │   │   ├── SearchBar.tsx           # Static placeholder for now
│   │   │   ├── CartIcon.tsx
│   │   │   └── ResizeHandle.tsx
│   │   │
│   │   ├── filters/
│   │   │   ├── FilterPanel.tsx         # Traditional filter sidebar
│   │   │   ├── CategoryFilter.tsx
│   │   │   ├── PriceFilter.tsx
│   │   │   ├── ColorFilter.tsx
│   │   │   ├── MaterialFilter.tsx
│   │   │   └── InStockFilter.tsx
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatSidebar.tsx         # Main chat container
│   │   │   ├── ChatToggleButton.tsx    # "Try AI Assistant" button
│   │   │   ├── ConversationThread.tsx  # Scrollable message list
│   │   │   ├── Message.tsx             # Single message (user or assistant)
│   │   │   ├── FilterChip.tsx          # Clickable filter suggestion
│   │   │   ├── FilterChipGroup.tsx     # Group of chips in a message
│   │   │   ├── GlobalFilters.tsx       # Price/stock above input
│   │   │   ├── PromptInput.tsx         # Text input + image upload
│   │   │   ├── ImagePreview.tsx        # Uploaded image with X button
│   │   │   └── RegenerateButton.tsx    # "Show different suggestions"
│   │   │
│   │   ├── products/
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductSkeleton.tsx
│   │   │
│   │   └── shared/
│   │       └── ErrorBoundary.tsx
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── prompts.ts              # All prompt templates
│   │   │   ├── chat.ts                 # Main chat logic
│   │   │   ├── vision.ts               # Image description logic
│   │   │   └── parse.ts                # Parse LLM JSON responses
│   │   │
│   │   ├── filters/
│   │   │   ├── engine.ts               # AND logic filter application
│   │   │   └── sync.ts                 # Sync chat filters ↔ traditional
│   │   │
│   │   ├── catalog/
│   │   │   ├── data.ts                 # Load and access product data
│   │   │   └── facets.ts               # Get available filter values
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                   # clsx + tailwind-merge
│   │       ├── storage.ts              # localStorage helpers
│   │       └── format.ts               # Price formatting, etc.
│   │
│   ├── hooks/
│   │   ├── useAppState.ts              # Main app state (single source of truth)
│   │   ├── useResizable.ts             # Sidebar resize logic
│   │   └── useLocalStorage.ts          # Persist state
│   │
│   ├── types/
│   │   └── index.ts                    # All type definitions
│   │
│   ├── constants/
│   │   └── index.ts                    # Filter options, config
│   │
│   ├── data/
│   │   └── products.json               # Full catalog (~500 items)
│   │
│   └── styles/
│       ├── tokens.ts                   # Design tokens
│       └── animations.ts               # Framer Motion variants
│
├── public/
│   └── placeholder.svg                 # Fallback product image
│
├── .env.local
├── .env.example
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Type Definitions

```typescript
// types/index.ts

// === Product ===
export interface Product {
  id: string
  title: string
  description: string
  image_url: string
  price: number
  in_stock: boolean
  category: 'apparel' | 'furniture'
  subcategory: string
  color: string
  material: string
  style_tags: string[]
  size?: string        // Apparel only
  brand?: string
}

// === Filters ===
export interface FilterState {
  category: string | null
  subcategory: string | null
  colors: string[]
  materials: string[]
  sizes: string[]
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean | null
  styleTags: string[]
}

export const initialFilters: FilterState = {
  category: null,
  subcategory: null,
  colors: [],
  materials: [],
  sizes: [],
  minPrice: null,
  maxPrice: null,
  inStock: null,
  styleTags: [],
}

// === Filter Chips ===
export type ChipType = 
  | 'category' 
  | 'subcategory' 
  | 'color' 
  | 'material' 
  | 'style_tag' 
  | 'size'
  | 'price_range'

export interface FilterChip {
  id: string
  type: ChipType
  label: string           // Display text: "Blue", "Under $50"
  filterKey: keyof FilterState
  filterValue: unknown    // Value to apply
}

// === Chat ===
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string                    // Base64 or object URL for user images
  suggestedChips?: FilterChip[]        // Assistant messages only
  priceQuestion?: string               // Price clarification prompt
  timestamp: number
}

// === UI State ===
export interface UIState {
  sidebarOpen: boolean
  sidebarWidth: number                 // Percentage (30-50)
}

// === Cart ===
export interface CartItem {
  productId: string
  quantity: number
}

// === App State ===
export interface AppState {
  filters: FilterState
  messages: Message[]
  chatLoading: boolean
  ui: UIState
  cart: CartItem[]
}

// === Catalog Facets (for prompts) ===
export interface CatalogFacets {
  categories: string[]
  subcategoriesByCategory: Record<string, string[]>
  colors: string[]
  materials: string[]
  styleTags: string[]
  sizes: string[]
  priceRange: { min: number, max: number }
}
```

## State Management

Using a **single custom hook** with `useReducer` for simplicity.

### useAppState Hook

```typescript
// hooks/useAppState.ts

type Action =
  | { type: 'SET_FILTER'; key: keyof FilterState; value: unknown }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SYNC_FILTERS'; filters: Partial<FilterState> }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_CHAT_LOADING'; loading: boolean }
  | { type: 'CLEAR_CHAT' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_WIDTH'; width: number }
  | { type: 'ADD_TO_CART'; productId: string }
  | { type: 'REMOVE_FROM_CART'; productId: string }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } }
    case 'CLEAR_FILTERS':
      return { ...state, filters: initialFilters }
    case 'TOGGLE_SIDEBAR':
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } }
    // ... other cases
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState)
  
  // Persist UI state to localStorage
  useEffect(() => {
    localStorage.setItem('ui', JSON.stringify(state.ui))
  }, [state.ui])
  
  return { state, dispatch }
}
```

## Component Architecture

### Component Hierarchy

```
ShopPage (page.tsx)
│
├─ Header
│  ├─ Logo
│  ├─ SearchBar (static placeholder - future feature)
│  └─ CartIcon (shows count)
│
├─ Main Content (flex)
│  │
│  ├─ Left Side
│  │  │
│  │  ├─ [If !sidebarOpen] FilterPanel
│  │  │  ├─ CategoryFilter
│  │  │  ├─ PriceFilter (slider)
│  │  │  ├─ ColorFilter (checkboxes)
│  │  │  ├─ MaterialFilter (checkboxes)
│  │  │  └─ InStockFilter (switch)
│  │  │
│  │  ├─ [If !sidebarOpen] ChatToggleButton (BELOW FilterPanel)
│  │  │  └─ "✨ Try AI Assistant"
│  │  │
│  │  └─ [If sidebarOpen] ChatSidebar
│  │     ├─ Header: "AI Assistant" + Close button
│  │     ├─ ConversationThread (scrollable)
│  │     │  └─ Message[] 
│  │     │     ├─ [user] Text + optional ImagePreview
│  │     │     └─ [assistant] 
│  │     │        ├─ Text response
│  │     │        ├─ FilterChipGroup
│  │     │        ├─ RegenerateButton
│  │     │        └─ PriceQuestion (if present)
│  │     ├─ GlobalFilters (fixed)
│  │     │  ├─ PriceFilter (compact)
│  │     │  └─ InStockFilter (compact)
│  │     └─ PromptInput (fixed bottom)
│  │        ├─ ImagePreview (if image attached)
│  │        └─ Input + Send button
│  │
│  ├─ [If sidebarOpen] ResizeHandle
│  │
│  └─ ProductGrid
│     ├─ ProductCard[] (with Add to Cart)
│     ├─ ProductSkeleton[] (loading shimmer)
│     └─ IntersectionObserver trigger (infinite scroll)
```

### Key Component Behaviors

#### ChatToggleButton
- Positioned **below** the FilterPanel (not inside it)
- Clicking opens the ChatSidebar and hides FilterPanel
- Label: "✨ Try AI Assistant" or similar

#### SearchBar (Static)
- Visible in header but non-functional for MVP
- Placeholder text: "Search products..."
- **UNCLEAR:** Should clicking it do anything? Or completely static?

#### PriceQuestion
- Rendered at the bottom of assistant messages (when present)
- Example: "What's your budget?" or "Any price range in mind?"
- Could be a clickable prompt or just text
- **UNCLEAR:** Should this be interactive (quick buttons like "$0-50", "$50-100") or just a text prompt for the user to respond to?

## AI Integration: Multi-Prompt Architecture

We use multiple focused prompts for different tasks:

### Prompt 1: Main Chat → Filter Generation
**Route:** `/api/chat`
**Model:** Groq (Llama 3.1 70B)
**Purpose:** Convert user messages into filter suggestions

### Prompt 2: Regenerate Suggestions  
**Route:** `/api/regenerate`
**Model:** Groq (Llama 3.1 70B)
**Purpose:** Generate alternative filter suggestions for same query

### Prompt 3: Image Analysis
**Route:** `/api/vision`
**Model:** OpenAI GPT-4 Vision
**Purpose:** Describe uploaded images to understand what user is looking for

### Prompt 4: Similar Products (Zero Results)
**Route:** `/api/similar`
**Model:** Groq (Llama 3.1 70B)
**Purpose:** When filters return zero results, suggest related products

---

## API Routes

### `/api/chat/route.ts` - Main Filter Generation

```typescript
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  const { userMessage, conversationHistory, currentFilters, catalogFacets } = await request.json()
  
  const systemPrompt = buildFilterGenerationPrompt(catalogFacets, currentFilters)
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })
  
  const parsed = parseFilterResponse(completion.choices[0].message.content)
  return Response.json(parsed)
}
```

### `/api/regenerate/route.ts` - Alternative Suggestions

```typescript
export async function POST(request: Request) {
  const { originalQuery, previousChips, catalogFacets, currentFilters } = await request.json()
  
  const systemPrompt = buildRegeneratePrompt(catalogFacets, currentFilters, previousChips)
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Original request: "${originalQuery}". Give me DIFFERENT filter suggestions.` },
    ],
    temperature: 0.9,  // Higher temp for more variety
    max_tokens: 1024,
  })
  
  const parsed = parseFilterResponse(completion.choices[0].message.content)
  return Response.json(parsed)
}
```

### `/api/vision/route.ts` - Image Description

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const { imageBase64 } = await request.json()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe this image for a shopping assistant. Focus on:
- What type of item is this? (clothing, furniture, etc.)
- Colors present
- Style/aesthetic (modern, vintage, casual, formal, etc.)
- Material if visible
- Any other relevant shopping attributes

Be concise. Format as a shopping query.`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 300,
  })
  
  return Response.json({
    description: response.choices[0].message.content,
  })
}
```

### `/api/similar/route.ts` - Similar Products for Zero Results

```typescript
export async function POST(request: Request) {
  const { appliedFilters, catalogFacets, allProducts } = await request.json()
  
  const systemPrompt = buildSimilarProductsPrompt(catalogFacets)
  
  // Send the filters that produced zero results
  const userMessage = `
The user applied these filters but got zero results:
${JSON.stringify(appliedFilters, null, 2)}

Suggest 3-5 alternative filter combinations that would show similar products.
Relax the most specific filters first.
`
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })
  
  const parsed = parseSimilarResponse(completion.choices[0].message.content)
  return Response.json(parsed)
}
```

---

## Prompt Templates

### Filter Generation Prompt

```typescript
// lib/ai/prompts.ts

export function buildFilterGenerationPrompt(
  facets: CatalogFacets,
  currentFilters: FilterState
): string {
  return `You are a shopping assistant for an online store selling apparel and furniture.

Your job is to understand what the user wants and suggest filter chips they can click to find products.

AVAILABLE FILTERS (ONLY use these exact values):
- Categories: ${facets.categories.join(', ')}
- Subcategories by category: ${JSON.stringify(facets.subcategoriesByCategory)}
- Colors: ${facets.colors.join(', ')}
- Materials: ${facets.materials.join(', ')}
- Style tags: ${facets.styleTags.join(', ')}
- Sizes (apparel only): ${facets.sizes.join(', ')}
- Price range: $${facets.priceRange.min} - $${facets.priceRange.max}

CURRENTLY APPLIED FILTERS:
${JSON.stringify(currentFilters, null, 2)}

RULES:
1. ONLY suggest filters from the exact values listed above. Never invent new ones.
2. Start with category/subcategory if not already set.
3. Then suggest 2-4 attribute filters (color, material, style).
4. Keep your message brief and helpful.
5. If user hasn't mentioned price/budget, include a price question.
6. If user asks for something not in the catalog, acknowledge it and suggest the closest alternatives.

RESPONSE FORMAT (JSON only):
{
  "message": "Brief helpful response to the user",
  "chips": [
    { 
      "type": "subcategory",
      "label": "Sweaters", 
      "filterKey": "subcategory", 
      "filterValue": "sweaters" 
    },
    { 
      "type": "color",
      "label": "Blue", 
      "filterKey": "colors", 
      "filterValue": "blue" 
    }
  ],
  "priceQuestion": "What's your budget?" // Include if user hasn't specified price, omit otherwise
}

Respond with valid JSON only. No markdown, no explanation outside the JSON.`
}
```

### Regenerate Prompt

```typescript
export function buildRegeneratePrompt(
  facets: CatalogFacets,
  currentFilters: FilterState,
  previousChips: FilterChip[]
): string {
  return `You are a shopping assistant. The user wants DIFFERENT suggestions than before.

AVAILABLE FILTERS: [same as above]

PREVIOUSLY SUGGESTED (DO NOT repeat these):
${previousChips.map(c => `- ${c.label}`).join('\n')}

Generate fresh alternative suggestions. Be creative but stay within available filters.
If previous suggestions were specific colors, try different colors.
If previous suggestions were one subcategory, try related subcategories.

RESPONSE FORMAT: [same JSON format as filter generation]`
}
```

### Similar Products Prompt (Zero Results)

```typescript
export function buildSimilarProductsPrompt(facets: CatalogFacets): string {
  return `You are a shopping assistant. The user's filters produced zero results.

Help them find similar products by suggesting relaxed filter combinations.

AVAILABLE FILTERS: [list all facets]

Your job:
1. Analyze which filters are too restrictive
2. Suggest 3-5 alternative filter combinations
3. Explain briefly why each might work

RESPONSE FORMAT (JSON):
{
  "message": "Couldn't find exact matches, but here are some alternatives:",
  "alternatives": [
    {
      "description": "Similar style in different color",
      "chips": [...]
    },
    {
      "description": "Same color, different material", 
      "chips": [...]
    }
  ]
}`
}
```

---

## Data Flow

### Flow 1: Text Message

```
User types: "I want a cozy sweater"
           │
           ▼
┌─ ChatSidebar ─────────────────────────┐
│  1. Show user message in thread       │
│  2. Set chatLoading = true            │
│  3. Call /api/chat                    │
└───────────────────────────────────────┘
           │
           ▼
┌─ /api/chat ───────────────────────────┐
│  1. Build prompt with catalog facets  │
│  2. Include conversation history      │
│  3. Call Groq LLM                     │
│  4. Parse JSON response               │
└───────────────────────────────────────┘
           │
           ▼
┌─ ChatSidebar ─────────────────────────┐
│  1. Add assistant message to state    │
│  2. Display chips + price question    │
│  3. Set chatLoading = false           │
└───────────────────────────────────────┘
           │
           ▼
User clicks chip "Sweaters"
           │
           ▼
dispatch({ type: 'SET_FILTER', key: 'subcategory', value: 'sweaters' })
           │
           ▼
Grid re-filters → Shows sweaters
```

### Flow 2: Image Upload

```
User uploads image of a blue velvet sofa
           │
           ▼
┌─ PromptInput ─────────────────────────┐
│  1. Convert image to base64           │
│  2. Show preview with X button        │
└───────────────────────────────────────┘
           │
User clicks Send (or types "find similar")
           │
           ▼
┌─ ChatSidebar ─────────────────────────┐
│  1. Call /api/vision with image       │
└───────────────────────────────────────┘
           │
           ▼
┌─ /api/vision (GPT-4 Vision) ──────────┐
│  Returns: "A modern blue velvet sofa  │
│  with clean lines, contemporary style"│
└───────────────────────────────────────┘
           │
           ▼
┌─ ChatSidebar ─────────────────────────┐
│  1. Take description from vision API  │
│  2. Call /api/chat with description   │
│     as the user message               │
└───────────────────────────────────────┘
           │
           ▼
┌─ /api/chat ───────────────────────────┐
│  Input: "A modern blue velvet sofa    │
│  with clean lines, contemporary style"│
│                                       │
│  Output: chips for sofa, blue, velvet,│
│  modern style tag                     │
└───────────────────────────────────────┘
           │
           ▼
Display chips → User clicks → Grid filters
```

### Flow 3: Regenerate

```
User clicks "Show different suggestions"
           │
           ▼
┌─ RegenerateButton ────────────────────┐
│  1. Get original query from message   │
│  2. Get previous chips                │
│  3. Call /api/regenerate              │
└───────────────────────────────────────┘
           │
           ▼
┌─ /api/regenerate ─────────────────────┐
│  1. Build prompt excluding prev chips │
│  2. Higher temperature for variety    │
│  3. Return new set of chips           │
└───────────────────────────────────────┘
           │
           ▼
Update assistant message with new chips
(or append new message with alternatives)
```

### Flow 4: Zero Results

```
User applies filters → 0 products match
           │
           ▼
┌─ ProductGrid ─────────────────────────┐
│  Detects: filteredProducts.length = 0 │
│  Triggers: /api/similar               │
└───────────────────────────────────────┘
           │
           ▼
┌─ /api/similar ────────────────────────┐
│  1. Analyze which filters are strict  │
│  2. Suggest relaxed alternatives      │
│  3. Return alternative chip sets      │
└───────────────────────────────────────┘
           │
           ▼
┌─ ChatSidebar / ProductGrid ───────────┐
│  Show: "No exact matches found"       │
│  Show: Alternative suggestions        │
│  "Try these instead:"                 │
│  [Chip set 1] [Chip set 2] [Chip set 3]│
└───────────────────────────────────────┘
```

### Flow 5: Close Sidebar → Sync Filters

```
User clicks X to close ChatSidebar
           │
           ▼
┌─ ChatSidebar ─────────────────────────┐
│  1. Get currently applied filters     │
│  2. dispatch({ type: 'TOGGLE_SIDEBAR' })│
└───────────────────────────────────────┘
           │
           ▼
FilterPanel appears with same filters applied
(filters stay in state, just UI changes)
```

---

## Filter Engine

### AND Logic Implementation

```typescript
// lib/filters/engine.ts

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter(product => {
    // Category
    if (filters.category && product.category !== filters.category) return false
    
    // Subcategory
    if (filters.subcategory && product.subcategory !== filters.subcategory) return false
    
    // Colors (OR within array, AND with other filters)
    if (filters.colors.length > 0 && !filters.colors.includes(product.color)) return false
    
    // Materials
    if (filters.materials.length > 0 && !filters.materials.includes(product.material)) return false
    
    // Sizes
    if (filters.sizes.length > 0 && product.size && !filters.sizes.includes(product.size)) return false
    
    // Price range
    if (filters.minPrice !== null && product.price < filters.minPrice) return false
    if (filters.maxPrice !== null && product.price > filters.maxPrice) return false
    
    // In stock
    if (filters.inStock === true && !product.in_stock) return false
    
    // Style tags (OR within array)
    if (filters.styleTags.length > 0) {
      const hasMatchingTag = filters.styleTags.some(tag => product.style_tags.includes(tag))
      if (!hasMatchingTag) return false
    }
    
    return true
  })
}
```

---

## Infinite Scroll

Simple implementation - just track display count and slice:

```typescript
// In page.tsx or ProductGrid

const [displayCount, setDisplayCount] = useState(20)
const filteredProducts = applyFilters(allProducts, state.filters)
const visibleProducts = filteredProducts.slice(0, displayCount)
const hasMore = displayCount < filteredProducts.length

// Intersection Observer to load more
const loadMoreRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && hasMore) {
        setDisplayCount(prev => prev + 20)
      }
    },
    { threshold: 0.1 }
  )
  
  if (loadMoreRef.current) {
    observer.observe(loadMoreRef.current)
  }
  
  return () => observer.disconnect()
}, [hasMore])

// Reset display count when filters change
useEffect(() => {
  setDisplayCount(20)
}, [state.filters])
```

---

## Environment Variables

```bash
# .env.local

# Groq - LLM for filter generation
GROQ_API_KEY=gsk_...

# OpenAI - GPT-4 Vision for image analysis
OPENAI_API_KEY=sk-...
```

```bash
# .env.example
GROQ_API_KEY=
OPENAI_API_KEY=
```

---

## Design System

### Design Tokens

```typescript
// styles/tokens.ts

export const tokens = {
  spacing: {
    sidebarMinPx: 250,
    sidebarDefaultPercent: 30,
    sidebarMaxPercent: 50,
    gridGap: 16,
    cardPadding: 16,
  },
  
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
}
```

### Animation Variants

```typescript
// styles/animations.ts

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
}

export const slideInLeft = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
  transition: { duration: 0.2 },
}

export const chipAppear = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 500, damping: 30 },
}

export const messageAppear = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.2 },
}

export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
}
```

---

## Implementation Order

### Phase 1: Foundation
1. `npx create-next-app@latest` with TypeScript + Tailwind + App Router
2. Set up shadcn/ui
3. Create project structure
4. Define types in `types/index.ts`
5. Create `products.json` with sample data (~50 items first)
6. Build `useAppState` hook

### Phase 2: Layout & Filters
1. Build Header (with static SearchBar)
2. Build FilterPanel with all filter types
3. Build ChatToggleButton (below FilterPanel)
4. Implement filter engine
5. Build ProductGrid + ProductCard
6. Add infinite scroll
7. Test traditional filtering flow

### Phase 3: Chat Interface
1. Build ChatSidebar structure
2. Build PromptInput with image upload
3. Build Message + FilterChip components
4. Build ConversationThread
5. Build RegenerateButton
6. Implement ResizeHandle
7. Test sidebar toggle

### Phase 4: AI Integration
1. Set up `/api/chat` route with Groq
2. Build prompt templates
3. Implement filter generation flow
4. Set up `/api/vision` route with GPT-4
5. Implement image → description → filters flow
6. Set up `/api/regenerate` route
7. Set up `/api/similar` route for zero results
8. Test all flows

### Phase 5: Polish
1. Add framer-motion animations
2. Loading states (skeletons, shimmer)
3. Error handling
4. Price question UI
5. Zero results UI
6. Cart functionality
7. Final testing

---

## Unclear Items (Need Answers)

### 1. SearchBar Behavior
The search bar in the header is static for now. Should clicking it:
- Do nothing (completely disabled)?
- Show a tooltip "Coming soon"?
- Focus the chat input?

### 2. Price Question Interaction
When assistant asks "What's your budget?", should this be:
- **Option A:** Just text - user types response
- **Option B:** Quick buttons like "$0-50", "$50-100", "$100-200", "$200+"
- **Option C:** Both - text with suggested price range buttons

### 3. Zero Results UI Location
When filters produce zero results, where should alternatives appear?
- **Option A:** As a chat message in the sidebar
- **Option B:** Inline in the ProductGrid area
- **Option C:** Both

### 4. Regenerate Behavior
When user clicks "Regenerate", should we:
- **Option A:** Replace the chips in the existing message
- **Option B:** Add a new assistant message with alternatives
- **Option C:** Show chips inline below the button

---

## Notes

- **No embeddings** - All search is LLM-based filter generation
- **No backend database** - All data is JSON files  
- **No auth** - Single user experience
- **No analytics** - Not needed for MVP
- **Desktop only** - No responsive/mobile
- **Keep it simple** - Avoid premature optimization
