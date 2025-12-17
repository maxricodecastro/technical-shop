# User Input Flow

This document details the complete flow from when a user types a message to when filtered products appear in the grid.

---

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  User types: "I want a cozy blue sweater"
                    │
                    ▼
            ┌───────────────┐
            │  PromptInput  │
            │  Component    │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  ChatSidebar  │──────────────────┐
            │  (orchestrates)                  │
            └───────┬───────┘                  │
                    │                          │
         ┌──────────┴──────────┐               │
         ▼                     ▼               │
  ┌─────────────┐      ┌─────────────┐         │
  │ Add user    │      │ Set loading │         │
  │ message to  │      │ state: true │         │
  │ state       │      └─────────────┘         │
  └─────────────┘                              │
         │                                     │
         ▼                                     │
  ┌─────────────────────────────────┐          │
  │        /api/chat                │          │
  │  ┌─────────────────────────┐    │          │
  │  │ 1. Build system prompt  │    │          │
  │  │ 2. Include facets       │    │          │
  │  │ 3. Call Groq LLM        │    │          │
  │  │ 4. Parse JSON           │    │          │
  │  │ 5. Validate with Zod    │    │          │
  │  └─────────────────────────┘    │          │
  └─────────────┬───────────────────┘          │
                │                              │
                ▼                              │
  ┌─────────────────────────────────┐          │
  │  Validated Response             │          │
  │  {                              │          │
  │    message: "Great choice!...", │          │
  │    chips: [...],                │          │
  │    minPrice: null,              │          │
  │    maxPrice: 200,                │          │
  │    priceQuestion: null           │          │
  │  }                              │          │
  └─────────────┬───────────────────┘          │
                │                              │
                ▼                              │
  ┌─────────────────────────────────┐          │
  │  ChatSidebar                    │◄─────────┘
  │  1. Add assistant message       │
  │  2. Set loading: false          │
  │  3. Render FilterChipGroup      │
  └─────────────┬───────────────────┘
                │
                ▼
  ┌─────────────────────────────────┐
  │  User sees chips, clicks one:   │
  │  [Sweaters] [Blue] [Cozy]       │
  └─────────────┬───────────────────┘
                │
                ▼
  ┌─────────────────────────────────┐
  │  dispatch(SET_FILTER)           │
  │  filters.subcategory = sweaters │
  └─────────────┬───────────────────┘
                │
                ▼
  ┌─────────────────────────────────┐
  │  filterAndRankProducts()        │
  │  1. Apply AND filters           │
  │  2. Score each product          │
  │  3. Sort by match score         │
  └─────────────┬───────────────────┘
                │
                ▼
  ┌─────────────────────────────────┐
  │  ProductGrid re-renders         │
  │  Shows best matches first       │
  └─────────────────────────────────┘
```

---

## Step-by-Step Breakdown

### Step 1: User Types Message

**Component:** `PromptInput.tsx`

```typescript
// User types in the input field
const [inputValue, setInputValue] = useState('')

// On form submit or Enter press
const handleSubmit = (e: FormEvent) => {
  e.preventDefault()
  if (!inputValue.trim()) return
  
  onSendMessage(inputValue, attachedImage)
  setInputValue('')
  setAttachedImage(null)
}
```

**What happens:**
- User types "I want a cozy blue sweater"
- User presses Enter or clicks Send button
- `onSendMessage` callback is triggered with the message text
- Input field is cleared

---

### Step 2: ChatSidebar Orchestrates

**Component:** `ChatSidebar.tsx`

```typescript
const handleSendMessage = async (text: string, image?: string) => {
  // 1. Create user message object
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: text,
    imageUrl: image,
    timestamp: Date.now(),
  }
  
  // 2. Add to conversation state
  dispatch({ type: 'ADD_MESSAGE', message: userMessage })
  
  // 3. Set loading state
  dispatch({ type: 'SET_CHAT_LOADING', loading: true })
  
  // 4. Call the chat API
  try {
    const response = await sendChatMessage(text, image, state.messages, state.filters)
    
    // 5. Add assistant response
    const assistantMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response.message,
      suggestedChips: response.chips,
      priceQuestion: response.priceQuestion,
      timestamp: Date.now(),
    }
    
    dispatch({ type: 'ADD_MESSAGE', message: assistantMessage })
  } catch (error) {
    // Handle error - show error message
  } finally {
    dispatch({ type: 'SET_CHAT_LOADING', loading: false })
  }
}
```

**What happens:**
- User message is created with unique ID and timestamp
- Message is added to conversation state (appears in UI immediately)
- Loading indicator shown
- API call initiated

---

### Step 3: API Route Processes Request

**Route:** `/api/chat/route.ts`

```typescript
export async function POST(request: Request) {
  const { 
    userMessage, 
    conversationHistory, 
    currentFilters,
    imageDescription  // If image was uploaded
  } = await request.json()
  
  // 1. Get catalog facets
  const catalogFacets = getCatalogFacets()
  
  // 2. Build the system prompt
  const systemPrompt = buildFilterGenerationPrompt(catalogFacets, currentFilters)
  
  // 3. Prepare the user message (include image description if present)
  const fullUserMessage = imageDescription 
    ? `[User uploaded an image: ${imageDescription}]\n\n${userMessage}`
    : userMessage
  
  // 4. Call Groq LLM
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: fullUserMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })
  
  const rawContent = completion.choices[0].message.content || ''
  
  // 5. Validate response
  const validated = parseAndValidateLLMResponse(rawContent, catalogFacets)
  
  // 6. Return validated data
  if (!validated.success || !validated.data) {
    return Response.json({
      message: "I had trouble understanding that. Could you try rephrasing?",
      chips: [],
    })
  }
  
  return Response.json(validated.data)
}
```

**What happens:**
- Request body is parsed
- Catalog facets are loaded (all valid colors, materials, etc.)
- System prompt is built with available filter options
- Conversation history is included for context
- Groq LLM generates a response with extracted price values (minPrice/maxPrice)
- Response is validated with Zod
- Extracted prices are applied to product filtering

---

### Step 4: Zod Validation

**Module:** `lib/ai/validate.ts`

```typescript
export function parseAndValidateLLMResponse(
  rawText: string,
  facets: CatalogFacets
): ValidationResult {
  // 1. Extract JSON from response
  let jsonStr = rawText.trim()
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // 2. Parse JSON
  const parsed = JSON.parse(jsonStr)
  
  // 3. Validate structure
  const structureResult = LLMChatResponseSchema.safeParse(parsed)
  if (!structureResult.success) {
    return { success: false, errors: [...] }
  }
  
  // 4. Validate against catalog facets
  const facetSchema = createFacetValidationSchema(facets)
  const facetResult = facetSchema.safeParse(structureResult.data)
  
  // 5. Filter out invalid chips, keep valid ones
  if (!facetResult.success) {
    const validChips = filterValidChips(structureResult.data.chips, facetResult.error)
    return {
      success: true,
      data: {
        message: structureResult.data.message,
        chips: validChips,
        priceQuestion: structureResult.data.priceQuestion,
      },
      invalidChips: [...],  // For logging
    }
  }
  
  return { success: true, data: structureResult.data }
}
```

**Validation checks:**
- ✅ Response has required `message` field
- ✅ `chips` is an array with max 10 items
- ✅ Each chip has valid `type`, `label`, `filterKey`, `filterValue`
- ✅ Material values exist in catalog
- ✅ Style tags exist in catalog
- ✅ Subcategories exist in catalog
- ✅ `minPrice` and `maxPrice` are numbers or null (extracted from user query)

**Note:** Color chips from LLM are removed during post-processing (colors are data-driven). Price values are extracted separately and control the price slider, not filter chips.

---

### Step 4.5: Data-Driven Colors + LLM-Driven Materials/Styles

**Module:** `app/api/chat/route.ts` - `processChipsWithDerivedFacets()`

After validation, chips are processed and price filters are applied:

```typescript
// In /api/chat/route.ts

// Extract price values from LLM response
const llmMinPrice = validated.data?.minPrice ?? null
const llmMaxPrice = validated.data?.maxPrice ?? null

// Determine effective price range: LLM extraction overrides frontend state
let effectiveMinPrice: number | null = null
let effectiveMaxPrice: number | null = null

if (llmMinPrice !== null) {
  effectiveMinPrice = llmMinPrice
} else if (currentPriceRange && !currentPriceRange.isDefault) {
  effectiveMinPrice = currentPriceRange.min > 0 ? currentPriceRange.min : null
}

if (llmMaxPrice !== null) {
  effectiveMaxPrice = llmMaxPrice
} else if (currentPriceRange && !currentPriceRange.isDefault) {
  effectiveMaxPrice = currentPriceRange.max < 275 ? currentPriceRange.max : null
}

// Apply effective price filters
let productsToSearch = products
if (effectiveMinPrice !== null) {
  productsToSearch = productsToSearch.filter(p => p.price >= effectiveMinPrice)
}
if (effectiveMaxPrice !== null) {
  productsToSearch = productsToSearch.filter(p => p.price <= effectiveMaxPrice)
}

// Then process chips with derived facets
function processChipsWithDerivedFacets(llmChips, products) {
  // 1. Separate chips by type
  const subcategoryChips = llmChips.filter(c => c.type === 'subcategory')
  const materialChips = llmChips.filter(c => c.type === 'material')  // LLM materials (context-aware)
  const styleChips = llmChips.filter(c => c.type === 'style_tag')    // LLM style tags (context-aware)
  // Remove any color chips LLM might have generated (colors are data-driven)
  
  // 2. Get subcategory values
  const subcategories = subcategoryChips.map(c => c.filterValue)
  
  // 3. Derive colors from catalog (fully data-driven)
  const availableColors = getColorsForSubcategories(products, subcategories)
  const colorChips = availableColors.map(color => ({
    id: `chip-color-${color}`,
    type: 'color',
    label: capitalize(color),
    filterKey: 'colors',
    filterValue: color,
  }))
  
  // 4. Materials: LLM-only (no supplementation)
  // LLM is context-aware and only suggests relevant materials
  // e.g., "running" → cotton, polyester (NOT cashmere, silk)
  
  // 5. Style tags: LLM-only (no supplementation)
  // LLM is context-aware and only suggests relevant styles
  // e.g., "running" → casual, fitted (NOT formal, elegant)
  
  // 6. Return chips in order:
  //    subcategories → materials (LLM-only) → colors (data-driven) → styles (LLM-only)
  return [
    ...subcategoryChips,  // LLM-driven
    ...materialChips,     // LLM-driven (context-aware, no supplements)
    ...colorChips,        // Data-driven from catalog
    ...styleChips,        // LLM-driven (context-aware, no supplements)
  ]
}
```

**Why data-driven colors?**
- Colors are objective - a product IS a certain color
- Colors are derived from actual products in suggested subcategories
- Prevents suggesting colors that don't exist for those product types

**Why LLM-only for materials (no supplementation)?**
- Materials are context-dependent: cashmere is valid for "cozy" but NOT for "running"
- LLM understands user intent and only suggests relevant materials
- Supplementation was adding irrelevant options (e.g., cashmere for athletic wear)

**Why LLM-only for style tags (no supplementation)?**
- Style tags are context-dependent: formal makes sense for "work" but NOT for "running"
- LLM understands user intent and only suggests relevant styles
- Supplementation was adding irrelevant options (e.g., elegant for athletic wear)

**Example - Before and After Processing:**

LLM Response for "running outfit" (before processing):
```json
{
  "message": "Looking for running gear! Here are some options:",
  "chips": [
    { "type": "subcategory", "filterValue": "t-shirts" },
    { "type": "subcategory", "filterValue": "pants" },
    { "type": "material", "filterValue": "cotton" },
    { "type": "material", "filterValue": "polyester" },
    { "type": "style_tag", "filterValue": "casual" },
    { "type": "style_tag", "filterValue": "fitted" }
  ]
}
```

After Processing (final chip order):
```json
{
  "chips": [
    // Subcategories (LLM-driven)
    { "type": "subcategory", "filterValue": "t-shirts" },
    { "type": "subcategory", "filterValue": "pants" },
    
    // Materials: LLM-only (context-aware - only athletic fabrics)
    { "type": "material", "filterValue": "cotton" },
    { "type": "material", "filterValue": "polyester" },
    // NO cashmere, silk, leather - irrelevant for running
    
    // Colors: data-driven from catalog
    { "type": "color", "filterValue": "black" },
    { "type": "color", "filterValue": "gray" },
    { "type": "color", "filterValue": "white" },
    
    // Style tags: LLM-only (context-aware - only athletic styles)
    { "type": "style_tag", "filterValue": "casual" },
    { "type": "style_tag", "filterValue": "fitted" }
    // NO formal, elegant, vintage - irrelevant for running
  ]
}
```

---

### Step 5: Response Rendered in Chat

**Component:** `ConversationThread.tsx` → `Message.tsx` → `FilterChipGroup.tsx`

```typescript
// Message.tsx
const Message = ({ message }: { message: Message }) => {
  return (
    <motion.div variants={messageAppear}>
      {/* Message content */}
      <p>{message.content}</p>
      
      {/* Filter chips (assistant messages only) */}
      {message.suggestedChips && (
        <FilterChipGroup 
          chips={message.suggestedChips}
          onChipClick={handleChipClick}
        />
      )}
      
      {/* Price question */}
      {message.priceQuestion && (
        <p className="text-muted">{message.priceQuestion}</p>
      )}
    </motion.div>
  )
}

// FilterChipGroup.tsx
const FilterChipGroup = ({ chips, onChipClick }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <FilterChip
          key={chip.id}
          chip={chip}
          isSelected={isChipApplied(chip)}
          onClick={() => onChipClick(chip)}
        />
      ))}
    </div>
  )
}
```

**What user sees:**
```
┌─────────────────────────────────────────┐
│ 🤖 Looking for a cozy blue sweater!     │
│    Here are some filters to help:       │
│                                         │
│    [Sweaters] [Blue] [Cozy]             │
│                                         │
│    What's your budget for the sweater?  │
└─────────────────────────────────────────┘
```

---

### Step 6: User Clicks a Chip

**Component:** `FilterChip.tsx`

```typescript
const FilterChip = ({ chip, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-sm transition-colors",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted hover:bg-muted/80"
      )}
    >
      {chip.label}
    </button>
  )
}

// In parent component
const handleChipClick = (chip: FilterChip) => {
  const currentValue = state.filters[chip.filterKey]
  
  // Toggle logic for array filters (colors, materials, styleTags)
  if (Array.isArray(currentValue)) {
    const newValue = currentValue.includes(chip.filterValue)
      ? currentValue.filter(v => v !== chip.filterValue)  // Remove
      : [...currentValue, chip.filterValue]                // Add
    
    dispatch({ type: 'SET_FILTER', key: chip.filterKey, value: newValue })
  } else {
    // Toggle for single value filters (category, subcategory)
    const newValue = currentValue === chip.filterValue ? null : chip.filterValue
    dispatch({ type: 'SET_FILTER', key: chip.filterKey, value: newValue })
  }
}
```

**What happens:**
- User clicks "Sweaters" chip
- Click handler determines if chip should be toggled on/off
- `SET_FILTER` action dispatched with new filter value
- State updates: `filters.subcategory = 'sweaters'`

---

### Step 7: Products Filtered and Ranked

**Module:** `lib/filters/ranking.ts`

```typescript
// This runs automatically when filters change (via useMemo or useEffect)

export function filterAndRankProducts(
  products: Product[], 
  filters: FilterState
): Product[] {
  // Step 1: Apply AND filters
  const filtered = applyFilters(products, filters)
  
  // Step 2: Rank by match score
  return rankProducts(filtered, filters)
}

function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter(product => {
    // All conditions must pass (AND logic)
    if (filters.subcategory && product.subcategory !== filters.subcategory) return false
    if (filters.colors.length > 0 && !filters.colors.includes(product.color)) return false
    if (filters.styleTags.length > 0) {
      const hasMatch = filters.styleTags.some(tag => product.style_tags.includes(tag))
      if (!hasMatch) return false
    }
    // ... more filter checks
    return true
  })
}

function rankProducts(products: Product[], filters: FilterState): Product[] {
  const scored = products.map(product => ({
    product,
    score: calculateMatchScore(product, filters)
  }))
  
  // Sort by score descending (best matches first)
  scored.sort((a, b) => b.score - a.score)
  
  return scored.map(s => s.product)
}

function calculateMatchScore(product: Product, filters: FilterState): number {
  let score = 0
  
  if (filters.subcategory && product.subcategory === filters.subcategory) score += 2
  if (filters.colors.includes(product.color)) score += 1
  
  // Style tags: +1 per matching tag
  const matchingTags = filters.styleTags.filter(tag => 
    product.style_tags.includes(tag)
  )
  score += matchingTags.length
  
  // Price proximity bonus
  if (filters.minPrice && filters.maxPrice) {
    const midPrice = (filters.minPrice + filters.maxPrice) / 2
    const range = filters.maxPrice - filters.minPrice
    if (Math.abs(product.price - midPrice) < range * 0.25) {
      score += 1
    }
  }
  
  return score
}
```

**Example scoring:**

| Product | Subcategory | Color | Style Tags | Score |
|---------|-------------|-------|------------|-------|
| Cozy Blue Wool Sweater | sweaters ✓ (+2) | blue ✓ (+1) | cozy ✓ (+1) | **4** |
| Blue Cotton Sweater | sweaters ✓ (+2) | blue ✓ (+1) | casual (+0) | **3** |
| Navy Knit Sweater | sweaters ✓ (+2) | navy (+0) | cozy ✓ (+1) | **3** |
| Blue Denim Jacket | jackets (+0) | blue ✓ (+1) | casual (+0) | **1** |

**Result order:** Products sorted by score (4, 3, 3, 1)

---

### Step 8: ProductGrid Re-renders

**Component:** `ProductGrid.tsx`

```typescript
const ProductGrid = () => {
  const { state } = useAppState()
  
  // Filter and rank products whenever filters change
  const filteredProducts = useMemo(
    () => filterAndRankProducts(allProducts, state.filters),
    [state.filters]
  )
  
  // Infinite scroll pagination
  const [displayCount, setDisplayCount] = useState(20)
  const visibleProducts = filteredProducts.slice(0, displayCount)
  
  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(20)
  }, [state.filters])
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {visibleProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} />
    </div>
  )
}
```

**What user sees:**
- Grid instantly updates with filtered products
- Best matches (highest score) appear first
- Shimmer loading state shows briefly during filter change
- Products progressively load as user scrolls

---

## Complete Timeline

```
T+0ms     User presses Enter
T+5ms     User message added to state, appears in UI
T+10ms    Loading indicator appears
T+15ms    API request sent to /api/chat
T+100ms   Groq LLM receives request
T+800ms   LLM generates response
T+850ms   Response validated with Zod
T+860ms   API returns validated response
T+870ms   Assistant message added to state
T+880ms   Chips render with animation
T+890ms   Loading indicator hidden
          
          [User clicks chip]

T+900ms   SET_FILTER dispatched
T+905ms   filterAndRankProducts() runs
T+910ms   ProductGrid re-renders with new results
T+920ms   Animation completes, user sees filtered products
```

---

## Error Handling

### Invalid LLM Response
```
LLM returns invalid JSON
        │
        ▼
parseAndValidateLLMResponse() catches error
        │
        ▼
Returns fallback: {
  message: "I had trouble understanding that. Could you try rephrasing?",
  chips: []
}
        │
        ▼
User sees friendly error message, can retry
```

### Invalid Facet Values
```
LLM suggests: { color: "chartreuse" }  // Not in catalog
        │
        ▼
Zod facet validation fails for this chip
        │
        ▼
Chip filtered out, other valid chips kept
        │
        ▼
User sees only valid chips, invalid one silently dropped
Console logs: "Invalid chip: chartreuse not in colors"
```

### Network Error
```
API call fails (network error, timeout)
        │
        ▼
try/catch in ChatSidebar catches error
        │
        ▼
Error message shown to user
Loading state cleared
User can retry
```

---

## Key Points

1. **Immediate feedback** - User message appears instantly, before API call
2. **Validated responses** - All LLM output is validated against catalog facets
3. **Graceful degradation** - Invalid chips are filtered out, not shown
4. **Ranked results** - Products sorted by match score, best first
5. **Optimistic UI** - Grid updates immediately on chip click
6. **Error resilient** - Multiple fallback paths for different error types

---

## Phase 2: Chip Persistence Flow

When user sends a follow-up query with chips already selected:

```
User has: [Jeans ✓] [Casual ✓] selected
User types: "more baggy stuff"
                    │
                    ▼
            ┌───────────────┐
            │  API Request  │
            │  includes:    │
            │  - message    │
            │  - selectedChips: [Jeans, Casual]
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  Prompt built │
            │  with:        │
            │  ALREADY SELECTED:
            │  - jeans      │
            │  - casual     │
            │  DO NOT SUGGEST THESE
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  LLM Response │
            │  chips: [Oversized, Relaxed, Hoodies]
            │  (no Jeans/Casual - excluded)
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  API filters  │
            │  duplicates   │
            │  (safety net) │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  Frontend     │
            │  merges:      │
            │  [Jeans ✓] [Casual ✓] | [Oversized] [Relaxed]
            │  ← persist      ← new suggestions
            └───────────────┘
```

