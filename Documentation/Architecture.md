# Architecture

This document covers the technical architecture, type definitions, API contracts, filter logic, and prompt strategy.

---

## Type Definitions

### Product

```typescript
interface Product {
  id: string
  title: string
  description: string
  image_url: string
  price: number
  in_stock: boolean
  category: 'apparel'
  subcategory: string        // e.g., "sweaters", "hoodies", "pants"
  color: string              // e.g., "blue", "navy", "beige"
  material: string           // e.g., "wool", "cotton", "fleece"
  style_tags: string[]       // e.g., ["cozy", "casual", "oversized"]
  occasion: string[]         // e.g., ["casual", "athletic", "outdoor"]
  size?: string              // e.g., "S", "M", "L", "XL"
  brand?: string
}
```

### FilterState

```typescript
interface FilterState {
  category: string | null
  subcategory: string | null
  subcategories: string[]    // Multiple subcategories (OR logic)
  occasions: string[]
  colors: string[]
  materials: string[]
  sizes: string[]
  inStock: boolean | null
  styleTags: string[]
}

const initialFilterState: FilterState = {
  category: null,
  subcategory: null,
  subcategories: [],
  occasions: [],
  colors: [],
  materials: [],
  sizes: [],
  inStock: null,
  styleTags: [],
}
```

### FilterChip

```typescript
type ChipType = 
  | 'category' 
  | 'subcategory' 
  | 'occasion'
  | 'color' 
  | 'material' 
  | 'style_tag' 
  | 'size'

interface FilterChip {
  id: string
  type: ChipType
  label: string                    // Display text: "Blue", "Sweaters"
  filterKey: keyof FilterState     // Which filter to update
  filterValue: string | boolean    // Value to apply
}
```

### CatalogFacets

```typescript
interface CatalogFacets {
  subcategories: string[]
  occasions: string[]
  colors: string[]
  materials: string[]
  styleTags: string[]
  sizes: string[]
}
```

### API Types

```typescript
// Request - simplified to just message
interface ChatRequest {
  message: string
}

// Response - message + chips
interface ChatResponse {
  message: string
  suggestedChips: FilterChip[]
  invalid?: FilterChip[]    // Optional: chips that failed validation
  errors?: string[]         // Optional: error messages
}

// LLM output format (before validation)
interface LLMResponse {
  message: string
  chips: FilterChip[]
}
```

---

## API Contract

### `POST /api/chat`

Converts natural language queries into filter chips.

**Request:**
```json
{
  "message": "I want a cozy blue sweater"
}
```

**Response:**
```json
{
  "message": "Looking for cozy sweaters! Here are some filters:",
  "suggestedChips": [
    {
      "id": "chip-1",
      "type": "subcategory",
      "label": "Sweaters",
      "filterKey": "subcategory",
      "filterValue": "sweaters"
    },
    {
      "id": "chip-2",
      "type": "color",
      "label": "Blue",
      "filterKey": "colors",
      "filterValue": "blue"
    }
  ]
}
```

**Error Response:**
```json
{
  "message": "I had trouble understanding that. Could you try rephrasing?",
  "suggestedChips": [],
  "errors": ["Failed to parse LLM response"]
}
```

---

## Filter Logic

### OR Within Sections, AND Across Sections

Products are filtered using:
- **OR** within each filter section (e.g., sweaters OR hoodies)
- **AND** across different sections (e.g., (sweaters OR hoodies) AND blue)

### Example

**Query:** "Find me blouses or coats that are blue"

**Chips returned:**
- Subcategories: `[blouses, coats]`
- Colors: `[blue]`

**Filter logic:**
```
(subcategory = blouses OR subcategory = coats) 
AND 
(color = blue)
```

### Implementation

```typescript
function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter(product => {
    // Subcategories (OR within - if multiple selected)
    if (filters.subcategories.length > 0) {
      if (!filters.subcategories.includes(product.subcategory)) {
        return false
      }
    } else if (filters.subcategory) {
      // Single subcategory fallback
      if (product.subcategory !== filters.subcategory) {
        return false
      }
    }

    // Occasions (OR within)
    if (filters.occasions.length > 0) {
      const matchesOccasion = filters.occasions.some(occ => 
        product.occasion.includes(occ)
      )
      if (!matchesOccasion) return false
    }

    // Colors (OR within)
    if (filters.colors.length > 0) {
      if (!filters.colors.includes(product.color)) {
        return false
      }
    }

    // Materials (OR within)
    if (filters.materials.length > 0) {
      if (!filters.materials.includes(product.material)) {
        return false
      }
    }

    // Style Tags (OR within)
    if (filters.styleTags.length > 0) {
      const hasMatchingTag = filters.styleTags.some(tag => 
        product.style_tags.includes(tag)
      )
      if (!hasMatchingTag) return false
    }

    // In Stock
    if (filters.inStock === true && !product.in_stock) {
      return false
    }

    return true
  })
}
```

---

## Prompt Strategy

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: Core Mappings                        │
│                    (~20-30 common concepts)                      │
│                                                                  │
│    "warm" → sweaters, wool       "casual" → t-shirts, jeans     │
│    "running" → cotton, casual    "formal" → silk, elegant       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ If not found in mappings...
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 2: Few-Shot Reasoning                     │
│                  (LLM generalizes from examples)                 │
│                                                                  │
│    LLM applies learned patterns to new concepts                 │
│    LLM generates: subcategory, material, style chips            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Whatever LLM outputs...
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 3: Zod Validation                         │
│                  (Only catalog values pass through)              │
│                                                                  │
│    ✓ "wool" exists in materials    ✗ "peasant blouse" invalid   │
│    ✓ "sweaters" exists in subcats  ✗ color chips removed        │
└─────────────────────────────────────────────────────────────────┘
```

### Data-Driven Colors

Colors are NOT generated by the LLM. Instead:

1. LLM suggests subcategories (e.g., sweaters, hoodies)
2. System queries catalog for products in those subcategories
3. System extracts unique colors from those products
4. Color chips are added automatically

**Why?**
- No hallucination risk - users only see colors that exist
- Always accurate - derived from real product data
- Dynamic - updates automatically as catalog changes

### LLM-Driven Materials & Styles (No Supplementation)

Materials and style tags are generated by the LLM with NO catalog supplementation.

**Why?**
- Context-dependent: cashmere makes sense for "cozy" but NOT for "running"
- LLM understands user intent and only suggests relevant options
- Prevents noise from irrelevant catalog values

**Example:**
```
User: "running outfit"
LLM suggests: [cotton, polyester, fleece]  ← Context-appropriate
Catalog has: [cotton, polyester, fleece, cashmere, silk, leather, ...]
Result: [cotton, polyester, fleece]  ← Only relevant fabrics
```

### Chip Processing Flow

```typescript
function processChipsWithDerivedFacets(llmChips, products) {
  // 1. Separate chips by type
  const subcategoryChips = llmChips.filter(c => c.type === 'subcategory')
  const materialChips = llmChips.filter(c => c.type === 'material')
  const styleChips = llmChips.filter(c => c.type === 'style_tag')
  // Note: LLM color chips are removed (colors are data-driven)
  
  // 2. Get subcategory values
  const subcategories = subcategoryChips.map(c => c.filterValue)
  
  // 3. Derive colors from catalog (fully data-driven)
  const availableColors = getColorsForSubcategories(products, subcategories)
  const colorChips = availableColors.map(color => createColorChip(color))
  
  // 4. Return in order: subcategories → materials → colors → styles
  return [
    ...subcategoryChips,  // LLM-driven
    ...materialChips,     // LLM-driven (no supplements)
    ...colorChips,        // Data-driven from catalog
    ...styleChips,        // LLM-driven (no supplements)
  ]
}
```

### Core Concept Mappings

| Concept | Subcategories | Materials | Style Tags |
|---------|---------------|-----------|------------|
| warm | sweaters, coats, hoodies | wool, fleece | cozy |
| casual | t-shirts, jeans, hoodies | cotton, denim | relaxed |
| professional | blouses, pants | wool, cotton | formal, classic |
| athletic | t-shirts, pants | cotton, polyester | casual, fitted |
| cozy | sweaters, hoodies | fleece, wool, cashmere | oversized, relaxed |

---

## Validation

### Zod Schemas

```typescript
const FilterChipSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['category', 'subcategory', 'occasion', 'color', 'material', 'style_tag', 'size']),
  label: z.string().min(1),
  filterKey: z.enum(['category', 'subcategory', 'subcategories', 'occasions', 'colors', 'materials', 'sizes', 'inStock', 'styleTags']),
  filterValue: z.union([z.string(), z.boolean()]),
})

const LLMResponseSchema = z.object({
  message: z.string().min(1, 'Response message cannot be empty'),
  chips: z.array(FilterChipSchema).max(20, 'Too many chips suggested'),
})
```

### Catalog Validation

Each chip is validated against actual catalog values:

```typescript
function validateChipAgainstCatalog(chip: FilterChip, facets: CatalogFacets): boolean {
  const value = String(chip.filterValue).toLowerCase()
  
  switch (chip.type) {
    case 'subcategory':
      return facets.subcategories.map(s => s.toLowerCase()).includes(value)
    case 'color':
      return facets.colors.map(c => c.toLowerCase()).includes(value)
    case 'material':
      return facets.materials.map(m => m.toLowerCase()).includes(value)
    case 'style_tag':
      return facets.styleTags.map(t => t.toLowerCase()).includes(value)
    case 'occasion':
      return facets.occasions.map(o => o.toLowerCase()).includes(value)
    default:
      return true
  }
}
```

---

## User Input Flow

```
1. User types: "I want a cozy blue sweater"
   │
   ▼
2. API call: POST /api/chat { message: "..." }
   │
   ▼
3. Backend:
   - Build prompt with catalog facets
   - Call Groq LLM
   - Parse JSON response
   - Validate chips against catalog
   - Derive colors from catalog
   - Return validated chips
   │
   ▼
4. Frontend receives chips:
   [Sweaters] [Wool] [Blue] [Cozy]
   │
   ▼
5. User clicks chips to select/deselect
   │
   ▼
6. applyFilters() runs with OR/AND logic
   │
   ▼
7. ProductGrid shows filtered results
```

---

## Project Structure

```
shopping-assistant/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/route.ts        # Main AI endpoint
│   │   ├── test-backend/page.tsx    # Test page
│   │   ├── page.tsx                 # Home page
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── catalyst/                # Catalyst UI Kit components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Filters.tsx
│   │   ├── AIMessage.tsx
│   │   ├── ProductCard.tsx
│   │   └── ProductGrid.tsx
│   │
│   ├── contexts/
│   │   └── SearchContext.tsx        # Search state management
│   │
│   ├── data/
│   │   └── products.json            # Product catalog (~50 items)
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── prompts.ts           # Prompt builder
│   │   │   └── validate.ts          # Zod validation
│   │   ├── catalog/
│   │   │   └── facets.ts            # Catalog facet extraction
│   │   └── filters/
│   │       └── engine.ts            # Filter application logic
│   │
│   └── types/
│       └── index.ts                 # All type definitions
```

---

## Key Design Decisions

### 1. Stateless Requests
Each API call is independent. No conversation history is sent or maintained.

### 2. Simple API Contract
- Request: `{ message: string }`
- Response: `{ message: string, suggestedChips: FilterChip[] }`

### 3. Data-Driven Colors
Colors are derived from the catalog, not generated by the LLM. This prevents suggesting colors that don't exist for the product types.

### 4. LLM-Only Materials/Styles
Materials and styles are fully LLM-driven with no catalog supplementation. The LLM understands context and only suggests relevant options.

### 5. OR Within, AND Across
Filter logic uses OR within each section and AND across sections. This allows flexible multi-selection within categories while narrowing results across categories.
