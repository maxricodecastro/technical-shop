# MVP Test Plan - Prompt Logic Testing

## Goal

Build the **minimal possible interface** to test prompt inputs/outputs before building the full UI.

**What we're testing:**
- Does the LLM understand user intent correctly?
- Are the filter chips valid and useful?
- Does the hierarchy logic work (subcategory first vs. attributes)?
- Does Zod validation catch invalid values?
- Do the filters return sensible products?

---

## What We're Building

```
┌─────────────────────────────────────────────────────┐
│              PROMPT TEST INTERFACE                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Text input________________________] [Send]         │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  INPUT: "warm earth tones casual"                   │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  RAW RESPONSE:                                       │
│  { "message": "...", "chips": [...] }               │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  VALID CHIPS: [Sweaters] [Wool] [Brown] [Casual]    │
│  INVALID: [terracotta] - not in catalog             │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  MATCHING PRODUCTS: 8 items                          │
│  • Wool Crewneck - Brown - $89                      │
│  • Casual Hoodie - Beige - $65                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**No styling. No sidebar. No product grid. Just raw data display.**

---

## Implementation Steps

### Step 1: Project Setup ✅
**Status: COMPLETE**

```bash
# Project created
npx create-next-app@latest shopping-assistant --typescript --tailwind --eslint --app --src-dir --no-git --use-npm --yes

# Dependencies installed
cd shopping-assistant
npm install groq-sdk zod

# Environment configured
# .env.local created with GROQ_API_KEY and OPENAI_API_KEY
```

**Project location:** `ramp-technical/shopping-assistant/`

---

### Step 2: Create Product Data ✅
**Status: COMPLETE**

Created `src/data/products.json` with 50 items covering all facets.

**Required coverage:**

| Facet | Values to Include |
|-------|-------------------|
| Subcategories | sweaters, t-shirts, hoodies, jeans, dresses, coats, blouses, jackets, pants, skirts (~10) |
| Colors | black, white, gray, navy, brown, beige, blue, green, red, pink, cream, olive (~12) |
| Materials | cotton, wool, linen, denim, polyester, silk, fleece, cashmere, leather (~9) |
| Style Tags | casual, formal, cozy, modern, classic, oversized, fitted, minimalist, elegant, relaxed (~10) |
| Sizes | XS, S, M, L, XL |
| Price Range | $25 - $250 |

**Sample item structure:**
```json
{
  "id": "prod-001",
  "title": "Cozy Wool Crewneck Sweater",
  "description": "Classic crewneck in soft merino wool, perfect for layering",
  "image_url": "/placeholder.svg",
  "price": 89,
  "in_stock": true,
  "category": "apparel",
  "subcategory": "sweaters",
  "color": "brown",
  "material": "wool",
  "style_tags": ["cozy", "classic", "casual"],
  "size": "M"
}
```

---

### Step 3: Types ✅
**Status: COMPLETE**

Created `src/types/index.ts`:

```typescript
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

export interface FilterChip {
  id: string
  type: string
  label: string
  filterKey: keyof FilterState
  filterValue: unknown
}

export interface CatalogFacets {
  subcategories: string[]
  colors: string[]
  materials: string[]
  styleTags: string[]
  sizes: string[]
  priceRange: { min: number; max: number }
}

export interface LLMResponse {
  message: string
  chips: FilterChip[]
  priceQuestion?: string
}
```

---

### Step 4: Facet Extraction
**Time: 5 min**

Create `src/lib/catalog/facets.ts`:

```typescript
import { Product, CatalogFacets } from '@/types'

export function getCatalogFacets(products: Product[]): CatalogFacets {
  return {
    subcategories: [...new Set(products.map(p => p.subcategory))].sort(),
    colors: [...new Set(products.map(p => p.color))].sort(),
    materials: [...new Set(products.map(p => p.material))].sort(),
    styleTags: [...new Set(products.flatMap(p => p.style_tags))].sort(),
    sizes: [...new Set(products.map(p => p.size))],
    priceRange: {
      min: Math.min(...products.map(p => p.price)),
      max: Math.max(...products.map(p => p.price))
    }
  }
}
```

---

### Step 5: Prompt Builder
**Time: 15 min**

Create `src/lib/ai/prompts.ts`:

Build the prompt template from `PromptStrategy.md` — includes:
- Available filters (from facets)
- Hierarchy rules
- Core concept mappings
- Few-shot examples
- Response format

---

### Step 6: Zod Validation
**Time: 10 min**

Create `src/lib/ai/validate.ts`:

```typescript
import { z } from 'zod'
import { CatalogFacets, FilterChip } from '@/types'

export function validateLLMResponse(raw: unknown, facets: CatalogFacets) {
  // 1. Parse JSON structure
  // 2. Validate each chip against facets
  // 3. Return { valid: FilterChip[], invalid: FilterChip[], errors: string[] }
}
```

---

### Step 7: Filter Engine (Simple)
**Time: 10 min**

Create `src/lib/filters/engine.ts`:

```typescript
import { Product, FilterState } from '@/types'

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter(product => {
    if (filters.subcategory && product.subcategory !== filters.subcategory) return false
    if (filters.colors.length && !filters.colors.includes(product.color)) return false
    if (filters.materials.length && !filters.materials.includes(product.material)) return false
    // ... etc
    return true
  })
}
```

---

### Step 8: API Route
**Time: 15 min**

Create `src/app/api/chat/route.ts`:

```typescript
import Groq from 'groq-sdk'
import { buildFilterPrompt } from '@/lib/ai/prompts'
import { validateLLMResponse } from '@/lib/ai/validate'
import { getCatalogFacets } from '@/lib/catalog/facets'
import products from '@/data/products.json'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  const { message } = await request.json()
  
  const facets = getCatalogFacets(products)
  const prompt = buildFilterPrompt(facets)
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 1024
  })
  
  const rawResponse = completion.choices[0].message.content
  const validated = validateLLMResponse(JSON.parse(rawResponse), facets)
  
  return Response.json({
    raw: rawResponse,
    validated: validated.valid,
    invalid: validated.invalid,
    errors: validated.errors
  })
}
```

---

### Step 9: Test UI
**Time: 20 min**

Create `src/app/page.tsx`:

```typescript
'use client'
import { useState } from 'react'

interface ValidationResult {
  raw: string
  validated: unknown[]
  invalid: unknown[]
  errors: string[]
  matchingProducts?: unknown[]
}

export default function TestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })
      
      if (!res.ok) throw new Error('API request failed')
      
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Prompt Test Interface
        </h1>
        <p className="text-zinc-400 mb-8">
          Test LLM filter generation • See raw outputs • Validate against catalog
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter test query... (e.g., 'warm earth tones casual')"
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg 
                         text-white placeholder-zinc-500 focus:outline-none focus:ring-2 
                         focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 
                         disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* User Input */}
            <Section title="📥 USER INPUT" color="zinc">
              <p className="text-zinc-300">{input}</p>
            </Section>

            {/* Raw LLM Response */}
            <Section title="🤖 RAW LLM RESPONSE" color="blue">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-blue-200">
                {result.raw}
              </pre>
            </Section>

            {/* Valid Chips */}
            <Section title="✅ VALID CHIPS" color="green">
              {result.validated.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {result.validated.map((chip: any, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-green-900/50 border border-green-700 
                                 rounded-full text-green-300 text-sm"
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 italic">No valid chips</p>
              )}
              <pre className="text-xs text-green-200/70 overflow-x-auto">
                {JSON.stringify(result.validated, null, 2)}
              </pre>
            </Section>

            {/* Invalid Chips */}
            <Section title="❌ INVALID CHIPS (dropped)" color="red">
              {result.invalid.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.invalid.map((chip: any, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-red-900/50 border border-red-700 
                                   rounded-full text-red-300 text-sm line-through"
                      >
                        {chip.label || chip.filterValue}
                      </span>
                    ))}
                  </div>
                  <pre className="text-xs text-red-200/70 overflow-x-auto">
                    {JSON.stringify(result.invalid, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-zinc-500 italic">All chips valid ✓</p>
              )}
            </Section>

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <Section title="⚠️ VALIDATION ERRORS" color="amber">
                <ul className="list-disc list-inside text-amber-300 text-sm space-y-1">
                  {result.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Matching Products */}
            {result.matchingProducts && (
              <Section title="📦 MATCHING PRODUCTS" color="purple">
                <p className="text-purple-300 mb-2">
                  {result.matchingProducts.length} products match these filters
                </p>
                <div className="space-y-1 text-sm text-purple-200/70">
                  {result.matchingProducts.slice(0, 5).map((p: any, i: number) => (
                    <div key={i}>
                      • {p.title} - {p.color} - ${p.price}
                    </div>
                  ))}
                  {result.matchingProducts.length > 5 && (
                    <div className="text-zinc-500">
                      ...and {result.matchingProducts.length - 5} more
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Reusable Section Component
function Section({ 
  title, 
  color, 
  children 
}: { 
  title: string
  color: 'zinc' | 'blue' | 'green' | 'red' | 'amber' | 'purple'
  children: React.ReactNode 
}) {
  const colors = {
    zinc: 'border-zinc-800 bg-zinc-900/50',
    blue: 'border-blue-800 bg-blue-900/20',
    green: 'border-green-800 bg-green-900/20',
    red: 'border-red-800 bg-red-900/20',
    amber: 'border-amber-800 bg-amber-900/20',
    purple: 'border-purple-800 bg-purple-900/20',
  }

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  )
}

---

## File Structure (MVP)

```
src/
├── app/
│   ├── page.tsx              # Test UI
│   ├── layout.tsx            # Default Next.js layout
│   └── api/
│       └── chat/
│           └── route.ts      # Groq API call
├── data/
│   └── products.json         # ~50 test products
├── lib/
│   ├── ai/
│   │   ├── prompts.ts        # Prompt builder
│   │   └── validate.ts       # Zod validation
│   ├── catalog/
│   │   └── facets.ts         # Extract facets from products
│   └── filters/
│       └── engine.ts         # Apply filters to products
└── types/
    └── index.ts              # Type definitions
```

**Total files: 8**

---

## Test Cases to Run

Once built, test these inputs:

### Basic Intent
| Input | Expected Behavior |
|-------|-------------------|
| "blue sweater" | subcategory: sweaters, color: blue |
| "something warm" | subcategory first (sweaters, coats, hoodies) |
| "casual outfit" | style: casual, maybe subcategories |

### Derived Concepts
| Input | Expected Behavior |
|-------|-------------------|
| "earth tones" | colors: brown, beige, olive, tan |
| "professional look" | subcategories: blazers, dress-shirts; style: formal |
| "cozy weekend wear" | subcategories: hoodies, sweaters; style: cozy, casual |

### Edge Cases
| Input | Expected Behavior |
|-------|-------------------|
| "mauve silk blouse" | Should handle "mauve" - either map to closest or drop |
| "cottagecore aesthetic" | Should reason about unfamiliar concept |
| "something nice" | Should ask clarifying question |
| "asdfghjkl" | Should ask clarifying question |

### Validation
| Input | Expected Behavior |
|-------|-------------------|
| Any input | Invalid colors/materials should be in "invalid" list |
| Any input | Valid chips should only contain catalog values |

---

## Iteration Process

```
┌─────────────────────────────────────────────────────────┐
│                    ITERATION LOOP                        │
└─────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │  Run test    │
     │  query       │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  Review      │ ←── Is the response sensible?
     │  output      │     Are chips valid?
     └──────┬───────┘     Do filters match intent?
            │
            ▼
     ┌──────────────┐
     │  Identify    │ ←── Wrong subcategory?
     │  issues      │     Missing concept mapping?
     └──────┬───────┘     Hallucinated value?
            │
            ▼
     ┌──────────────┐
     │  Adjust      │ ←── Update prompt rules
     │  prompt      │     Add core mapping
     └──────┬───────┘     Add few-shot example
            │
            ▼
     ┌──────────────┐
     │  Re-test     │
     └──────┬───────┘
            │
            └──────────► Repeat
```

---

## Success Criteria

MVP is ready when:

- [ ] 80%+ of basic queries return sensible chips
- [ ] Hierarchy logic works (subcategory first for vague concepts)
- [ ] Core mappings (warm, casual, earth tones) work correctly
- [ ] Invalid values are caught by validation
- [ ] Edge cases get clarifying questions (not random guesses)
- [ ] Response time < 2 seconds

---

## Time Estimate

| Step | Time |
|------|------|
| Project setup | 10 min |
| Product data | 20 min |
| Types | 5 min |
| Facet extraction | 5 min |
| Prompt builder | 15 min |
| Zod validation | 10 min |
| Filter engine | 10 min |
| API route | 15 min |
| Test UI | 20 min |
| **Total** | **~2 hours** |

Then: iterate on prompt until it works well.

---

## Next Steps After MVP

Once prompts are solid:
1. Build real UI (sidebar, product grid)
2. Add conversation history
3. Add image upload (GPT-4o Vision)
4. Add regenerate functionality
5. Polish styling with Catalyst UI

---

## Related Documents

- `PromptStrategy.md` — Prompt design (three-layer system, mappings)
- `Architecture.md` — Full system design
- `APIs.md` — Groq/OpenAI integration details

