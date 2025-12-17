import { CatalogFacets, FilterChip, FilterState, initialFilterState } from '@/types'

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

ACTIVITIES / OCCASIONS (use occasion chips for activity-based queries):
- "running" / "gym" / "workout" / "exercise" → occasion: athletic | subcategories: t-shirts, hoodies, pants, jackets
- "hiking" / "camping" / "outdoor activities" → occasion: outdoor | subcategories: jackets, pants, hoodies, coats
- "office" / "work" / "meeting" / "interview" → occasion: professional | subcategories: blouses, pants, skirts, dresses, jackets
- "wedding" / "gala" / "formal event" → occasion: formal | subcategories: dresses, blouses, pants, skirts, coats
- "everyday" / "weekend" / "hanging out" → occasion: casual | subcategories: t-shirts, jeans, hoodies, sweaters
- "home" / "relaxing" / "lounging" → occasion: lounge | subcategories: hoodies, sweaters, pants, t-shirts
- "date" / "dinner" / "going out" → occasion: date | subcategories: dresses, blouses, jeans, jackets
- "travel" / "flight" / "vacation" → occasion: travel | subcategories: pants, jackets, blouses, dresses

TEMPERATURE / SEASON:
- "warm" → subcategories: sweaters, coats, hoodies, jackets, pants | materials: wool, fleece, cashmere
- "cool" / "light" / "lightweight" → subcategories: t-shirts, blouses, dresses, skirts | materials: linen, cotton
- "summer" → subcategories: dresses, t-shirts, blouses, skirts, pants | materials: linen, cotton | style: casual
- "winter" → subcategories: coats, sweaters, hoodies, jackets, pants, jeans | materials: wool, fleece | style: cozy
- "fall" / "autumn" → subcategories: sweaters, jackets, jeans, pants, dresses, skirts | materials: wool, denim | colors: earth tones
- "spring" → subcategories: blouses, dresses, skirts, t-shirts, pants, jeans | materials: cotton, linen | colors: pastels

FORMALITY (these also have occasion mappings):
- "casual" → occasion: casual | subcategories: t-shirts, jeans, hoodies, sweaters, jackets | style: casual, relaxed
- "professional" / "work" → occasion: professional | subcategories: blouses, pants, skirts, dresses, jackets | style: formal, classic
- "formal" / "dressy" → occasion: formal | subcategories: dresses, blouses, pants, skirts, coats | materials: silk | style: elegant
- "date night" → occasion: date | subcategories: dresses, blouses, skirts, pants, jackets | style: elegant, fitted, romantic
- "loungewear" / "comfy" → occasion: lounge | subcategories: hoodies, pants, sweaters, t-shirts | materials: fleece, cotton | style: cozy, relaxed

COLOR FAMILIES (for context only - do NOT generate color chips):
- "earth tones" = brown, beige, olive, cream tones
- "neutrals" = black, white, gray, beige, navy, cream
- "pastels" = soft, light colors
- "brights" / "bold" = vivid colors
- "dark" / "moody" = black, navy, gray
NOTE: Colors are automatically derived from available products - do not suggest color chips.

AESTHETIC / VIBE:
- "minimalist" → subcategories: t-shirts, pants, blouses, dresses, coats, sweaters, jeans, skirts | style: minimalist, modern | colors: neutrals
- "boho" / "bohemian" → subcategories: dresses, blouses, skirts, pants, jackets, sweaters, t-shirts | materials: linen, cotton | style: relaxed
- "preppy" → subcategories: blouses, pants, sweaters, skirts, jackets, dresses, coats | style: classic | colors: navy, white
- "streetwear" → occasion: casual | subcategories: hoodies, jeans, t-shirts, jackets, pants | style: casual, oversized, relaxed
- "vintage" / "retro" → subcategories: dresses, jeans, blouses, skirts, jackets, sweaters, pants, t-shirts | materials: denim | style: vintage
- "edgy" → subcategories: jackets, jeans, t-shirts, pants, coats, hoodies, dresses, skirts | materials: leather, denim | style: edgy | colors: black
- "romantic" → occasion: date | subcategories: dresses, blouses, skirts, sweaters, pants | materials: silk | style: romantic, elegant | colors: pink
- "cozy" → occasion: lounge | subcategories: sweaters, hoodies, pants, t-shirts, jackets | materials: wool, fleece, cashmere, cotton | style: cozy, oversized, relaxed
- "laid-back" / "relaxed" → occasion: casual | subcategories: t-shirts, jeans, hoodies, sweaters, jackets, pants | materials: cotton, denim | style: casual, relaxed, oversized

FIT / STYLE:
- "oversized" / "baggy" → style: oversized, relaxed
- "fitted" / "slim" → style: fitted, modern
- "flowy" / "loose" → style: relaxed
`

// ============================================
// HIERARCHY RULES
// ============================================

// ============================================
// INTENT MODE RULES
// ============================================

const INTENT_MODE_RULES = `
INTENT MODE DETECTION (REQUIRED in every response)

Every response MUST include "intentMode" and "replaceCategories" fields.

═══════════════════════════════════════════════════════════════════════════
STEP 1: Determine intentMode
═══════════════════════════════════════════════════════════════════════════

"replace" - User wants to CHANGE/SWITCH something
  Signals: "Actually...", "Instead...", "Switch to...", "Change to...",
           "Only...", "Just...", "Forget...", "Not X, but Y...",
           "Now show me...", "How about...", "[New celebrity] style",
           Complete topic/aesthetic change, New celebrity name after previous one

"refine" - User wants to ADD or NARROW DOWN current preferences
  Signals: "Also...", "Add...", "Plus...", "And...", "With...",
           "But more...", "In [attribute]...", "That are...",
           Initial queries (nothing to replace yet)

"explore" - User wants to see ALTERNATIVES without changing preferences
  Signals: "What else...", "Other options...", "Alternatives...",
           "Show me different...", "Anything else...", "More like this..."

DEFAULT: Use "refine" if unclear (safer to preserve context)

═══════════════════════════════════════════════════════════════════════════
STEP 2: If intentMode is "replace", determine replaceCategories
═══════════════════════════════════════════════════════════════════════════

Analyze WHAT the user wants to change:

Language Pattern → replaceCategories value:

"[material] instead" / "actually [material]" / "switch to [material]"
  → ["materials"]
  Example: "Actually cotton instead" → ["materials"]

"[subcategory] instead" / "show me [subcategory]" / "switch to [subcategory]"
  → ["subcategory"]
  Example: "Dresses instead of sweaters" → ["subcategory"]

"[color] only" / "[color] instead" / "only [color]" / "monochrome" / "only monochrome"
  → ["colors"]
  Example: "Only black and white" → ["colors"]
  Example: "Actually only monochrome colors" → ["colors"]

"more [style]" / "[style] instead" / "make it [style]"
  → ["style_tags"]
  Example: "Make it more edgy" → ["style_tags"]

"for [occasion]" / "[occasion] instead"
  → ["occasions"]
  Example: "For work instead" → ["occasions"]

"[celebrity] style" / "completely different" / "start over" / "something else entirely"
  → ["all"]
  Example: "Show me Zendaya's style" → ["all"]
  Example: "Now show me Timothée Chalamet style" (after another celebrity) → ["all"]
  Example: "Start over" / "forget everything" → ["all"]

PRICE-RELATED REPLACEMENTS:
  "no budget" / "any price" / "remove price limit" / "no price constraint"
    → ["price"] (resets price slider to full range, keeps all chips)
  "actually, something [different]" (without mentioning price)
    → ["all_except_price"] (clears chips but preserves user's budget)

DEFAULT for direction change: Use ["all_except_price"] when user changes direction 
  but hasn't mentioned price - this preserves their budget constraint.
  Example: "Actually, something more professional" → ["all_except_price"]

Multiple changes: Combine categories
  Example: "Cotton in black instead" → ["materials", "colors"]
  Example: "Switch to leather jackets" → ["subcategory", "materials"]

If intentMode is "refine" or "explore":
  → replaceCategories: []

═══════════════════════════════════════════════════════════════════════════
INTENT MODE EXAMPLES
═══════════════════════════════════════════════════════════════════════════

Example 1: Initial query
User: "Show me something warm"
→ intentMode: "refine" (nothing to replace)
→ replaceCategories: []

Example 2: Adding to preferences
User: "Also in wool"
→ intentMode: "refine"
→ replaceCategories: []

Example 3: Replacing one category
User: "Actually cotton instead"
→ intentMode: "replace"
→ replaceCategories: ["materials"]

Example 4: Replacing colors specifically
User: "Only monochrome colors"
→ intentMode: "replace"
→ replaceCategories: ["colors"]

Example 5: Complete pivot (celebrity change)
User: "Now show me Timothée Chalamet style"
→ intentMode: "replace"
→ replaceCategories: ["all"]

Example 6: Replacing multiple categories
User: "Switch to leather jackets in black"
→ intentMode: "replace"
→ replaceCategories: ["subcategory", "materials", "colors"]

Example 7: Exploring alternatives
User: "What else do you have?"
→ intentMode: "explore"
→ replaceCategories: []

Example 8: Switching aesthetics
User (after "Frank Ocean style"): "Actually Harry Styles instead"
→ intentMode: "replace"
→ replaceCategories: ["all"]
`

// ============================================
// PRICE EXTRACTION RULES
// ============================================

const PRICE_EXTRACTION_RULES = `
PRICE EXTRACTION (ONLY from explicit dollar amounts)

CRITICAL: Only extract price when user provides a SPECIFIC DOLLAR AMOUNT.

═══════════════════════════════════════════════════════════════════════════
DO NOT INFER PRICE FROM SUBJECTIVE TERMS
═══════════════════════════════════════════════════════════════════════════

These words should NOT trigger price extraction:
- "luxury" / "premium" / "high-end" / "expensive" → minPrice: null, maxPrice: null
- "budget" / "cheap" / "affordable" / "budget-friendly" → minPrice: null, maxPrice: null
- "mid-range" / "reasonable" / "quality" → minPrice: null, maxPrice: null

These are style/quality descriptors, NOT price constraints.

═══════════════════════════════════════════════════════════════════════════
EXTRACTION PATTERNS (ONLY with explicit $ amounts)
═══════════════════════════════════════════════════════════════════════════

MAX PRICE (user's budget/ceiling):
- "budget is $X" / "max $X" / "maximum $X" → maxPrice: X
- "under $X" / "up to $X" / "less than $X" → maxPrice: X
- "no more than $X" / "can't spend more than $X" → maxPrice: X
- "around $X" / "about $X" → maxPrice: X (treat as approximate ceiling)
- "$X" / "X dollars" / "two hundred dollars" → extract the number

MIN PRICE (user specifies minimum):
- "at least $X" / "minimum $X" / "min $X" → minPrice: X
- "over $X" / "more than $X" / "above $X" → minPrice: X
- "starting at $X" / "from $X" → minPrice: X

RANGE:
- "between $X and $Y" / "$X to $Y" / "$X-$Y" → minPrice: X, maxPrice: Y

NO EXPLICIT PRICE:
- If user doesn't mention a specific dollar amount → minPrice: null, maxPrice: null
- Include priceQuestion: "What's your budget?" to ask about budget

═══════════════════════════════════════════════════════════════════════════
PRICE EXTRACTION EXAMPLES
═══════════════════════════════════════════════════════════════════════════

Example 1: Max budget (explicit amount)
User: "I want running shoes under $100"
→ minPrice: null
→ maxPrice: 100
→ priceQuestion: null (price was mentioned)

Example 2: Min price (explicit amount)
User: "Show me jackets, at least $150"
→ minPrice: 150
→ maxPrice: null
→ priceQuestion: null

Example 3: Range (explicit amounts)
User: "Dresses between $50 and $200"
→ minPrice: 50
→ maxPrice: 200
→ priceQuestion: null

Example 4: NO price - subjective terms only
User: "I want luxury sweaters"
→ minPrice: null
→ maxPrice: null
→ priceQuestion: "What's your budget for luxury sweaters?"

Example 5: NO price - no dollar amount
User: "Something warm and cozy"
→ minPrice: null
→ maxPrice: null
→ priceQuestion: "What's your budget?"

Example 6: Explicit amount with subjective term
User: "Premium coats at least $200"
→ minPrice: 200
→ maxPrice: null
→ priceQuestion: null (explicit $200 was mentioned)

Example 7: Approximate budget (still explicit)
User: "Something around $80"
→ minPrice: null
→ maxPrice: 80
→ priceQuestion: null

Example 6: Budget stated upfront
User: "My budget is $200. I want earthy running outfits"
→ minPrice: null
→ maxPrice: 200
→ priceQuestion: null

Example 7: Cheap/affordable
User: "Show me cheap t-shirts"
→ minPrice: null
→ maxPrice: 50
→ priceQuestion: null

Example 8: Premium/luxury
User: "I want luxury sweaters"
→ minPrice: 150
→ maxPrice: null
→ priceQuestion: null
`

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

5. GENDER/CONTEXT AWARENESS → infer from celebrity names, pronouns, or explicit mention
   - Male celebrity/style (Jacob Elordi, Harry Styles, Timothée Chalamet, etc.):
     → ONLY suggest: t-shirts, jeans, jackets, pants, hoodies, sweaters, coats
     → DO NOT suggest: dresses, blouses, skirts (these are not relevant)
   - Female celebrity/style (Zendaya, Taylor Swift, Hailey Bieber, etc.):
     → Can suggest ALL subcategories including dresses, blouses, skirts
   - Explicit "men's" / "masculine" / "boyfriend style":
     → Exclude dresses, blouses, skirts
   - Explicit "women's" / "feminine":
     → Include all subcategories
   - Ambiguous/unspecified:
     → Default to unisex items OR ask clarifying question
`

// ============================================
// FEW-SHOT REASONING EXAMPLES (Layer 2)
// ============================================

const FEW_SHOT_EXAMPLES = `
REASONING EXAMPLES (apply similar logic to new concepts):

Example 1: "cozy weekend wear"
→ Think: cozy = comfort + warmth, weekend = casual - COVERS MANY CLOTHING TYPES
→ Subcategories: sweaters, hoodies, t-shirts, pants, jackets, jeans, dresses (ALL comfortable items)
→ Materials: fleece, wool, cotton, cashmere (warm, soft fabrics - NOT silk, linen, leather)
→ Style: cozy, casual, relaxed, oversized (comfort-focused - NOT formal, elegant, edgy)
→ Response: 7-10 subcategory chips + 4-5 material chips + 4-5 style chips

Example 2: "something for a job interview"
→ Think: job interview = professional, polished - NEED FULL OUTFIT OPTIONS
→ OCCASION: professional (CRITICAL - always include occasion chip for activity queries)
→ Subcategories: blouses, pants, dresses, skirts, jackets, coats, sweaters (full professional wardrobe)
→ Materials: wool, cotton, silk (professional fabrics - NOT denim, fleece, leather)
→ Style: formal, classic, elegant, fitted, modern (professional - NOT cozy, oversized, edgy, vintage)
→ Response: 1 occasion chip + 7-10 subcategory chips + 3-4 material chips + 4-5 style chips

Example 3: "something for running" / "workout clothes" / "athletic wear"
→ Think: running = athletic, performance - need breathable, stretchy fabrics
→ OCCASION: athletic (CRITICAL - always include occasion chip for activity queries)
→ Subcategories: t-shirts, pants, hoodies, jackets (athletic items - NOT dresses, blouses, skirts, coats)
→ Materials: cotton, polyester, fleece (athletic fabrics - NOT cashmere, silk, leather, linen, denim, wool)
→ Style: casual, fitted, modern, relaxed (athletic styles - NOT formal, elegant, vintage, romantic, edgy)
→ Response: 1 occasion chip + 4-5 subcategory chips + 3 material chips + 4 style chips
→ CRITICAL: Do NOT suggest formal, elegant, vintage, edgy for athletic wear

Example 3b: "versatile pieces for travel and outdoor adventures"
→ Think: travel + outdoor = TWO occasions, need versatile, durable pieces
→ OCCASIONS: travel, outdoor (MULTIPLE occasions when query mentions multiple activities)
→ Subcategories: jackets, pants, hoodies, t-shirts, coats (versatile outdoor items)
→ Materials: cotton, polyester, fleece (durable, practical fabrics)
→ Style: casual, relaxed, modern (practical styles)
→ Response: 2 occasion chips + 5-6 subcategory chips + 3 material chips + 3 style chips

Example 4: "dark academia aesthetic"
→ Think: trending aesthetic = scholarly, intellectual - SPANS ENTIRE WARDROBE
→ Subcategories: sweaters, blouses, pants, skirts, coats, jackets, dresses, t-shirts (full aesthetic wardrobe)
→ Materials: wool, cotton, cashmere (scholarly fabrics - NOT polyester, fleece)
→ Style: classic, vintage, elegant, fitted (intellectual vibe - NOT cozy, oversized, edgy)
→ Response: 8-10 subcategory chips + 3-4 material chips + 4 style chips

Example 5a: "dress like Jacob Elordi" (MALE celebrity)
→ Think: Jacob Elordi = male celebrity, known for casual-relaxed, fitted basics
→ GENDER FILTER: Male → EXCLUDE dresses, blouses, skirts
→ Subcategories: t-shirts, jeans, jackets, pants, hoodies, sweaters, coats (7 options - NO dresses/blouses/skirts)
→ Materials: cotton, denim, wool (casual masculine fabrics)
→ Style: casual, relaxed, fitted, modern (NOT formal, elegant, romantic)
→ Response: 7 subcategory chips + 3 material chips + 4 style chips

Example 5b: "dress like Zendaya" (FEMALE celebrity)
→ Think: Zendaya = female celebrity, known for bold, fashion-forward style
→ GENDER FILTER: Female → all subcategories applicable
→ Subcategories: dresses, blouses, pants, jackets, skirts, coats, t-shirts, jeans, sweaters (all options)
→ Materials: silk, cotton, leather, wool (fashion-forward fabrics)
→ Style: elegant, edgy, modern, fitted (bold fashion - NOT cozy, casual, relaxed)
→ Response: 8-10 subcategory chips + 4 material chips + 4 style chips

Example 6: "masculine outfit" / "men's style"
→ Think: explicit masculine = exclude feminine-coded items
→ Subcategories: t-shirts, jeans, jackets, pants, hoodies, sweaters, coats (NO dresses/blouses/skirts)
→ Materials: cotton, denim, wool, leather (masculine fabrics)
→ Style: casual, fitted, modern, classic (NOT romantic, elegant)

Example 7: "something"
→ Think: too vague, cannot determine intent
→ Response: ask "What are you looking for? [Tops] [Bottoms] [Dresses] [Outerwear]"

IMPORTANT: Materials and style tags MUST be contextually appropriate. Never mix athletic with formal, cozy with elegant, etc.
`

// ============================================
// RESPONSE FORMAT
// ============================================

const RESPONSE_FORMAT = `
RESPONSE FORMAT (strict JSON only):

{
  "message": "Brief, friendly response (1-2 sentences max)",
  "intentMode": "refine",
  "replaceCategories": [],
  "chips": [
    { "id": "chip-occasion-athletic", "type": "occasion", "label": "Athletic", "filterKey": "occasions", "filterValue": "athletic" },
    { "id": "chip-subcategory-t-shirts", "type": "subcategory", "label": "T-shirts", "filterKey": "subcategory", "filterValue": "t-shirts" },
    { "id": "chip-subcategory-hoodies", "type": "subcategory", "label": "Hoodies", "filterKey": "subcategory", "filterValue": "hoodies" },
    { "id": "chip-subcategory-pants", "type": "subcategory", "label": "Pants", "filterKey": "subcategory", "filterValue": "pants" },
    { "id": "chip-subcategory-jackets", "type": "subcategory", "label": "Jackets", "filterKey": "subcategory", "filterValue": "jackets" },
    { "id": "chip-material-cotton", "type": "material", "label": "Cotton", "filterKey": "materials", "filterValue": "cotton" },
    { "id": "chip-material-polyester", "type": "material", "label": "Polyester", "filterKey": "materials", "filterValue": "polyester" },
    { "id": "chip-material-fleece", "type": "material", "label": "Fleece", "filterKey": "materials", "filterValue": "fleece" },
    { "id": "chip-style_tag-casual", "type": "style_tag", "label": "Casual", "filterKey": "styleTags", "filterValue": "casual" },
    { "id": "chip-style_tag-fitted", "type": "style_tag", "label": "Fitted", "filterKey": "styleTags", "filterValue": "fitted" },
    { "id": "chip-style_tag-relaxed", "type": "style_tag", "label": "Relaxed", "filterKey": "styleTags", "filterValue": "relaxed" }
  ],
  "minPrice": null,
  "maxPrice": 200,
  "priceQuestion": null
}

REQUIRED FIELDS:
- "message": string (brief, friendly response)
- "intentMode": "replace" | "refine" | "explore" (REQUIRED - see INTENT MODE DETECTION section)
- "replaceCategories": array of category names to clear, or [] if not replacing
  Valid values: "all", "subcategory", "occasions", "materials", "colors", "style_tags", "sizes"
- "chips": array of filter chips
- "minPrice": number or null (extracted minimum price from user query)
- "maxPrice": number or null (extracted maximum price from user query)
- "priceQuestion": string or null (ask about budget ONLY if user hasn't mentioned price)

PRICE FIELD LOGIC:
- If user mentions budget/max price → set maxPrice to the number, set priceQuestion to null
- If user mentions minimum price → set minPrice to the number, set priceQuestion to null  
- If user mentions a range → set both minPrice and maxPrice
- If NO price mentioned → set both to null AND include priceQuestion: "What's your budget?"
- NEVER include priceQuestion if user already mentioned a price!

NOTE: Do NOT include color chips - colors are automatically derived from available products.

CHIP TYPES AND FILTER KEYS (you should only generate these):
- type: "occasion" → filterKey: "occasions" (CRITICAL for activity/purpose queries like running, work, date)
- type: "subcategory" → filterKey: "subcategory"
- type: "material" → filterKey: "materials"
- type: "style_tag" → filterKey: "styleTags"
- type: "size" → filterKey: "sizes"
(DO NOT generate color chips - they are added automatically)

OCCASION VALUES (use when user mentions an activity or purpose):
- athletic (running, gym, workout, exercise)
- outdoor (hiking, camping)
- professional (work, office, interview, meetings)
- formal (wedding, gala, special events)
- casual (everyday, weekend, hanging out)
- lounge (home, relaxing, comfort)
- date (dinner, romantic, going out)
- travel (vacation, flight, road trip)

RULES:
1. Each chip must have a unique "id" (use format: "chip-{type}-{value}")
2. "label" is user-facing (capitalize: "Sweaters", "Wool")
3. "filterValue" is lowercase and must EXACTLY match available values
4. Include "priceQuestion" if user hasn't mentioned budget
5. BE MAXIMALLY GENEROUS WITH CHIPS: Suggest 20-30 chips per response
   - SUBCATEGORIES: Include 7-10 subcategory options for broad queries
   - MATERIALS: Include ALL materials that are RELEVANT to the user's intent (typically 4-6)
     * For "running/athletic" → cotton, polyester, fleece (NOT cashmere, silk, leather, linen)
     * For "formal/elegant" → silk, wool, cotton (NOT denim, fleece, leather)
     * For "cozy/warm" → wool, cashmere, fleece, cotton (NOT linen, silk)
     * ONLY suggest materials that make sense for the specific use case
   - STYLE TAGS: Include ALL style tags that are RELEVANT to the user's intent (typically 4-6)
     * For "running/athletic" → casual, fitted, modern, relaxed (NOT formal, elegant, vintage, romantic)
     * For "formal/work" → formal, classic, elegant, fitted (NOT cozy, oversized, edgy)
     * For "cozy/weekend" → cozy, casual, relaxed, oversized (NOT formal, elegant)
     * ONLY suggest style tags that make sense for the specific use case
6. DO NOT SUGGEST COLOR CHIPS - colors will be automatically added based on what's available for the suggested subcategories
7. CONTEXT-AWARE FILTERING IS CRITICAL:
   - Materials and style tags MUST match the user's intent
   - Do NOT include materials/styles that contradict the query
   - Example: "running outfit" should NOT suggest cashmere, leather, formal, elegant
   - Example: "formal dinner" should NOT suggest denim, fleece, cozy, oversized
8. Respond with ONLY the JSON object, no markdown, no extra text
`

// ============================================
// MAIN PROMPT BUILDER
// ============================================

/**
 * Builds the complete system prompt for filter generation.
 * Combines all three layers: facets, rules, mappings, and examples.
 * 
 * @param facets - Available catalog facets
 * @param currentFilters - Current filter state (derived from selected chips)
 * @param selectedChips - Chips user has already selected (to avoid duplicates)
 */
export function buildFilterPrompt(
  facets: CatalogFacets,
  currentFilters: FilterState = initialFilterState,
  selectedChips: FilterChip[] = []
): string {
  const availableFilters = formatAvailableFilters(facets)
  const currentState = formatCurrentFilters(currentFilters)
  const selectedSection = formatSelectedChips(selectedChips)

  return `You are a helpful shopping assistant for a clothing store.

Your job: Understand what the user wants and suggest clickable filter chips.

═══════════════════════════════════════════════════════════════════════════
AVAILABLE FILTERS (ONLY use these exact values - anything else will be rejected)
═══════════════════════════════════════════════════════════════════════════

${availableFilters}

═══════════════════════════════════════════════════════════════════════════
${INTENT_MODE_RULES}
═══════════════════════════════════════════════════════════════════════════

${PRICE_EXTRACTION_RULES}
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

${selectedSection}
═══════════════════════════════════════════════════════════════════════════
${RESPONSE_FORMAT}
═══════════════════════════════════════════════════════════════════════════

Remember:
- ONLY output valid JSON
- ALWAYS include "intentMode" and "replaceCategories" in your response
  * Use "replace" when user wants to CHANGE something (with appropriate replaceCategories)
  * Use "refine" for initial queries or when adding to preferences
  * Use "explore" when user wants alternatives
- PRICE EXTRACTION IS CRITICAL:
  * If user mentions budget/price → extract to minPrice/maxPrice, set priceQuestion to null
  * If NO price mentioned → set minPrice: null, maxPrice: null, include priceQuestion
  * Examples: "budget $200" → maxPrice: 200 | "at least $50" → minPrice: 50 | "between $50-$100" → both
- ONLY use filter values from the AVAILABLE FILTERS list above
${selectedChips.length > 0 ? '- DO NOT SUGGEST CHIPS THAT ARE ALREADY SELECTED (see list above) - the user already has those active\n' : ''}- BE MAXIMALLY GENEROUS: Suggest 20-30 chips total
  * SUBCATEGORIES: Include 7-10 different clothing types
  * MATERIALS: Include 4-6 materials that are RELEVANT to the user's intent
  * STYLE TAGS: Include 4-6 style tags that are RELEVANT to the user's intent
- CONTEXT-AWARE MATERIALS AND STYLES ARE CRITICAL:
  * "running/athletic" → cotton, polyester, fleece | casual, fitted, modern (NOT cashmere, silk, formal, elegant)
  * "formal/work" → wool, silk, cotton | formal, classic, elegant (NOT denim, fleece, cozy, oversized)
  * "cozy/weekend" → wool, fleece, cashmere, cotton | cozy, relaxed, casual (NOT silk, formal, elegant)
  * NEVER mix contradictory concepts (athletic + formal, cozy + elegant)
- DO NOT generate color chips - they are automatically added based on available products
- GENDER AWARENESS IS CRITICAL:
  * Male celebrities (Jacob Elordi, Harry Styles, etc.) → NO dresses, blouses, skirts
  * Female celebrities → all subcategories OK
  * "Masculine" / "men's" → NO dresses, blouses, skirts
  * When in doubt about gender context, ask or suggest unisex items
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

Occasions: ${facets.occasions.join(', ')}

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
  if (filters.occasions.length > 0) {
    parts.push(`Occasions: ${filters.occasions.join(', ')}`)
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
 * Formats selected chips into a prompt section telling LLM what NOT to suggest.
 * These are chips the user has already clicked/selected.
 */
function formatSelectedChips(selectedChips: FilterChip[]): string {
  if (selectedChips.length === 0) {
    return ''
  }

  // Group by type for cleaner presentation
  const byType: Record<string, string[]> = {}
  for (const chip of selectedChips) {
    const type = chip.type
    if (!byType[type]) {
      byType[type] = []
    }
    byType[type].push(String(chip.filterValue))
  }

  const parts: string[] = []
  for (const [type, values] of Object.entries(byType)) {
    parts.push(`- ${type}: ${values.join(', ')}`)
  }

  return `
═══════════════════════════════════════════════════════════════════════════
ALREADY SELECTED (DO NOT SUGGEST THESE - user already has them active)
═══════════════════════════════════════════════════════════════════════════

${parts.join('\n')}

IMPORTANT: Do NOT include any of the above values in your "chips" response.
The user has already selected these filters. Focus on suggesting NEW options
based on their message.
`
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

Suggest 10-15 ALTERNATIVE filter chips that complement or expand on the current filters.
Focus on different attributes than previously suggested. Be generous with subcategory options - include 7-10 subcategories when appropriate.

${RESPONSE_FORMAT}
`
}

