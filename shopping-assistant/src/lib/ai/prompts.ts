import { CatalogFacets, FilterState, initialFilterState } from '@/types'

/**
 * Three-Layer Prompt Strategy for Filter Generation
 * 
 * Layer 1: Core Mappings - Predefined concept→filter mappings
 * Layer 2: Few-Shot Reasoning - LLM generalizes from examples
 * Layer 3: Zod Validation - Only catalog values pass through (handled in validate.ts)
 */

// ============================================
// CORE CONCEPT MAPPINGS (Layer 1)
// ============================================

const CORE_MAPPINGS = `
CORE CONCEPT MAPPINGS (use these for common terms):

TEMPERATURE / SEASON:
- "warm" → subcategories: sweaters, coats, hoodies | materials: wool, fleece, cashmere
- "cool" / "light" / "lightweight" → subcategories: t-shirts, blouses | materials: linen, cotton
- "summer" → subcategories: dresses, t-shirts | materials: linen, cotton | style: casual
- "winter" → subcategories: coats, sweaters | materials: wool, fleece | style: cozy
- "fall" / "autumn" → subcategories: sweaters, jackets | materials: wool, denim | colors: earth tones
- "spring" → subcategories: blouses, dresses | materials: cotton, linen | colors: pastels

FORMALITY / OCCASION:
- "casual" → subcategories: t-shirts, jeans, hoodies | style: casual, relaxed
- "professional" / "work" → subcategories: blouses, pants | style: formal, classic
- "formal" / "dressy" → subcategories: dresses, blouses | materials: silk | style: elegant
- "date night" → subcategories: dresses, blouses | style: elegant, fitted, romantic
- "loungewear" / "comfy" → subcategories: hoodies, pants | materials: fleece, cotton | style: cozy, relaxed

COLOR FAMILIES (for context only - do NOT generate color chips):
- "earth tones" = brown, beige, olive, cream tones
- "neutrals" = black, white, gray, beige, navy, cream
- "pastels" = soft, light colors
- "brights" / "bold" = vivid colors
- "dark" / "moody" = black, navy, gray
NOTE: Colors are automatically derived from available products - do not suggest color chips.

AESTHETIC / VIBE:
- "minimalist" → style: minimalist, modern | colors: neutrals
- "boho" / "bohemian" → subcategories: dresses, blouses | materials: linen, cotton | style: relaxed
- "preppy" → subcategories: blouses, pants | style: classic | colors: navy, white
- "streetwear" → subcategories: hoodies, jeans | style: casual, oversized
- "vintage" / "retro" → subcategories: dresses, jeans | materials: denim | style: vintage
- "edgy" → subcategories: jackets, jeans | materials: leather, denim | style: edgy | colors: black
- "romantic" → subcategories: dresses, blouses | materials: silk | style: romantic, elegant | colors: pink
- "cozy" → subcategories: sweaters, hoodies | materials: wool, fleece, cashmere | style: cozy, oversized

FIT / STYLE:
- "oversized" / "baggy" → style: oversized, relaxed
- "fitted" / "slim" → style: fitted, modern
- "flowy" / "loose" → style: relaxed
`

// ============================================
// HIERARCHY RULES
// ============================================

const HIERARCHY_RULES = `
HIERARCHY RULES (follow strictly):

1. SPECIFIC SUBCATEGORY MENTIONED → use it directly, then suggest attributes
   Example: "blue sweater" → subcategory: sweaters, color: blue

2. VAGUE CONCEPT (warm, casual, professional) → suggest SUBCATEGORY FIRST
   Example: "something warm" → suggest sweaters, coats, hoodies first
   Example: "casual outfit" → suggest t-shirts, jeans, hoodies first

3. SPECIFIC ATTRIBUTE ONLY (just color or size) → use it, ask about type
   Example: "something blue" → color: blue, then ask "What type of clothing?"

4. TRULY AMBIGUOUS → ask clarifying question, DO NOT GUESS
   Example: "something nice" → ask "What's the occasion? [Casual] [Work] [Date night]"
   Example: "asdfghjkl" → ask "I didn't understand that. What are you looking for?"
`

// ============================================
// FEW-SHOT REASONING EXAMPLES (Layer 2)
// ============================================

const FEW_SHOT_EXAMPLES = `
REASONING EXAMPLES (apply similar logic to new concepts):

Example 1: "cozy weekend wear"
→ Think: cozy = comfort + warmth, weekend = casual
→ Subcategories: sweaters, hoodies, t-shirts (soft, warm items)
→ Materials: fleece, wool, cotton
→ Style: cozy, casual, relaxed, oversized
→ Response: subcategory + material + style chips (colors added automatically)

Example 2: "something for a job interview"
→ Think: job interview = professional, polished, conservative
→ Subcategories: blouses, pants, dresses, skirts
→ Style: formal, classic, elegant, fitted
→ Response: subcategory + style chips (colors added automatically)

Example 3: "I need to match a brown leather bag"
→ Think: user mentions color context - note it but don't generate color chips
→ Subcategories: depends on what they want - ask!
→ Materials: leather, wool, cotton, denim (complementary options)
→ Response: material chips + ask "What type of clothing are you looking for?"

Example 4: "dark academia aesthetic"
→ Think: trending aesthetic = scholarly, intellectual, moody, vintage
→ Subcategories: sweaters, blouses, pants, skirts
→ Materials: wool, cotton, denim
→ Style: classic, vintage, elegant, fitted
→ Response: subcategory + material + style chips (colors added automatically)

Example 5: "something"
→ Think: too vague, cannot determine intent
→ Response: ask "What are you looking for? [Tops] [Bottoms] [Dresses] [Outerwear]"
`

// ============================================
// RESPONSE FORMAT
// ============================================

const RESPONSE_FORMAT = `
RESPONSE FORMAT (strict JSON only):

{
  "message": "Brief, friendly response (1-2 sentences max)",
  "chips": [
    { "id": "chip-subcategory-sweaters", "type": "subcategory", "label": "Sweaters", "filterKey": "subcategory", "filterValue": "sweaters" },
    { "id": "chip-subcategory-hoodies", "type": "subcategory", "label": "Hoodies", "filterKey": "subcategory", "filterValue": "hoodies" },
    { "id": "chip-subcategory-coats", "type": "subcategory", "label": "Coats", "filterKey": "subcategory", "filterValue": "coats" },
    { "id": "chip-material-wool", "type": "material", "label": "Wool", "filterKey": "materials", "filterValue": "wool" },
    { "id": "chip-material-fleece", "type": "material", "label": "Fleece", "filterKey": "materials", "filterValue": "fleece" },
    { "id": "chip-style_tag-cozy", "type": "style_tag", "label": "Cozy", "filterKey": "styleTags", "filterValue": "cozy" },
    { "id": "chip-style_tag-casual", "type": "style_tag", "label": "Casual", "filterKey": "styleTags", "filterValue": "casual" }
  ],
  "priceQuestion": "What's your budget?" 
}

NOTE: Do NOT include color chips - colors are automatically derived from available products.

CHIP TYPES AND FILTER KEYS (you should only generate these):
- type: "subcategory" → filterKey: "subcategory"
- type: "material" → filterKey: "materials"
- type: "style_tag" → filterKey: "styleTags"
- type: "size" → filterKey: "sizes"
(DO NOT generate color chips - they are added automatically)

RULES:
1. Each chip must have a unique "id" (use format: "chip-{type}-{value}")
2. "label" is user-facing (capitalize: "Sweaters", "Wool")
3. "filterValue" is lowercase and must EXACTLY match available values
4. Include "priceQuestion" if user hasn't mentioned budget
5. BE GENEROUS WITH CHIPS: Suggest 6-10 chips per response
   - Include 2-4 subcategory options when relevant
   - Include 2-3 material options when relevant  
   - Include 2-3 style tag options when relevant
6. DO NOT SUGGEST COLOR CHIPS - colors will be automatically added based on what's available for the suggested subcategories
7. Respond with ONLY the JSON object, no markdown, no extra text
`

// ============================================
// MAIN PROMPT BUILDER
// ============================================

/**
 * Builds the complete system prompt for filter generation.
 * Combines all three layers: facets, rules, mappings, and examples.
 */
export function buildFilterPrompt(
  facets: CatalogFacets,
  currentFilters: FilterState = initialFilterState
): string {
  const availableFilters = formatAvailableFilters(facets)
  const currentState = formatCurrentFilters(currentFilters)

  return `You are a helpful shopping assistant for a clothing store.

Your job: Understand what the user wants and suggest clickable filter chips.

═══════════════════════════════════════════════════════════════════════════
AVAILABLE FILTERS (ONLY use these exact values - anything else will be rejected)
═══════════════════════════════════════════════════════════════════════════

${availableFilters}

═══════════════════════════════════════════════════════════════════════════
${HIERARCHY_RULES}
═══════════════════════════════════════════════════════════════════════════

${CORE_MAPPINGS}

═══════════════════════════════════════════════════════════════════════════
${FEW_SHOT_EXAMPLES}
═══════════════════════════════════════════════════════════════════════════
CURRENT FILTERS (already applied by user)
═══════════════════════════════════════════════════════════════════════════

${currentState}

═══════════════════════════════════════════════════════════════════════════
${RESPONSE_FORMAT}
═══════════════════════════════════════════════════════════════════════════

Remember:
- ONLY output valid JSON
- ONLY use filter values from the AVAILABLE FILTERS list above
- BE GENEROUS: Always suggest 6-10 chips (subcategory, material, style - NO colors)
- DO NOT generate color chips - they are automatically added based on available products
- Be concise and helpful
- If unsure, ask a clarifying question instead of guessing
`
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formats available facet values for the prompt.
 */
function formatAvailableFilters(facets: CatalogFacets): string {
  return `Subcategories: ${facets.subcategories.join(', ')}

Colors: ${facets.colors.join(', ')}

Materials: ${facets.materials.join(', ')}

Style Tags: ${facets.styleTags.join(', ')}

Sizes: ${facets.sizes.join(', ')}

Price Range: $${facets.priceRange.min} - $${facets.priceRange.max}`
}

/**
 * Formats current filter state for context.
 */
function formatCurrentFilters(filters: FilterState): string {
  const parts: string[] = []

  if (filters.subcategory) {
    parts.push(`Subcategory: ${filters.subcategory}`)
  }
  if (filters.colors.length > 0) {
    parts.push(`Colors: ${filters.colors.join(', ')}`)
  }
  if (filters.materials.length > 0) {
    parts.push(`Materials: ${filters.materials.join(', ')}`)
  }
  if (filters.styleTags.length > 0) {
    parts.push(`Style Tags: ${filters.styleTags.join(', ')}`)
  }
  if (filters.sizes.length > 0) {
    parts.push(`Sizes: ${filters.sizes.join(', ')}`)
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const min = filters.minPrice ?? 'any'
    const max = filters.maxPrice ?? 'any'
    parts.push(`Price: $${min} - $${max}`)
  }
  if (filters.inStock !== null) {
    parts.push(`In Stock Only: ${filters.inStock ? 'yes' : 'no'}`)
  }

  return parts.length > 0 ? parts.join('\n') : 'No filters applied yet.'
}

/**
 * Builds a simpler prompt for regenerating alternative suggestions.
 */
export function buildRegeneratePrompt(
  facets: CatalogFacets,
  currentFilters: FilterState,
  previousChips: string[]
): string {
  return `You are a shopping assistant. The user wants DIFFERENT suggestions than before.

AVAILABLE FILTERS (only use these exact values):
${formatAvailableFilters(facets)}

CURRENT FILTERS:
${formatCurrentFilters(currentFilters)}

PREVIOUS SUGGESTIONS (do NOT repeat these):
${previousChips.join(', ')}

Suggest 3-5 ALTERNATIVE filter chips that complement or expand on the current filters.
Focus on different attributes than previously suggested.

${RESPONSE_FORMAT}
`
}

