import Groq from 'groq-sdk'
import { buildFilterPrompt } from '@/lib/ai/prompts'
import { validateLLMResponse } from '@/lib/ai/validate'
import { getCatalogFacets } from '@/lib/catalog/facets'
import { 
  findProductsMatchingAnyChip, 
  getColorsForSubcategories
} from '@/lib/filters/engine'
import { FilterChip, Message } from '@/types'
import { ChatRequest, ChatResponse, Product, initialFilterState } from '@/types'
import productsData from '@/data/products.json'

// Type assertion for imported JSON
const products = productsData as Product[]

// DEBUG: Log API key status on module load
console.log('[DEBUG] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
console.log('[DEBUG] GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0)
console.log('[DEBUG] GROQ_API_KEY prefix:', process.env.GROQ_API_KEY?.substring(0, 10) || 'N/A')

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/**
 * POST /api/chat
 * 
 * Main chat endpoint for filter generation.
 * Takes a user message and returns suggested filter chips.
 * 
 * Flow:
 * 1. Extract catalog facets for prompt context
 * 2. Build system prompt with available filters
 * 3. Call Groq LLM with user message
 * 4. Validate response against catalog facets
 * 5. Return valid chips + matching products
 */
export async function POST(request: Request): Promise<Response> {
  console.log('[DEBUG] POST /api/chat - Request received')
  
  try {
    // Parse request body
    console.log('[DEBUG] Parsing request body...')
    const body = await request.json() as ChatRequest
    const { message, conversationHistory = [], currentFilters = initialFilterState, selectedChips = [] } = body
    console.log('[DEBUG] Message received:', message)
    console.log('[DEBUG] Selected chips:', selectedChips.length)

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log('[DEBUG] Invalid message - returning 400')
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get catalog facets for prompt and validation
    console.log('[DEBUG] Getting catalog facets...')
    const facets = getCatalogFacets(products)
    console.log('[DEBUG] Facets retrieved - colors:', facets.colors.length, 'materials:', facets.materials.length)

    // Build the system prompt with available filters and selected chips (to avoid duplicates)
    console.log('[DEBUG] Building system prompt...')
    const systemPrompt = buildFilterPrompt(facets, currentFilters, selectedChips)
    console.log('[DEBUG] System prompt length:', systemPrompt.length)

    // Prepare conversation history for LLM
    const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      llmMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add current user message
    llmMessages.push({
      role: 'user',
      content: message,
    })

    console.log('[DEBUG] Calling Groq API with', llmMessages.length, 'messages...')
    console.log('[DEBUG] API Key for request:', process.env.GROQ_API_KEY ? 'Present' : 'MISSING!')

    // Call Groq LLM
    // Note: llama-3.1-70b-versatile was decommissioned, using llama-3.3-70b-versatile instead
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: llmMessages,
      temperature: 0.7,
      max_tokens: 1024,
    })

    console.log('[DEBUG] Groq API response received')
    const rawResponse = completion.choices[0]?.message?.content || ''
    console.log('[DEBUG] Raw response length:', rawResponse.length)
    console.log('[DEBUG] Raw response preview:', rawResponse.substring(0, 200))

    // Validate the LLM response against catalog facets
    console.log('[DEBUG] Validating LLM response...')
    const validated = validateLLMResponse(rawResponse, facets)
    console.log('[DEBUG] Validation complete - valid:', validated.valid.length, 'invalid:', validated.invalid.length)

    // Process chips: remove LLM-generated colors, add data-driven colors
    // Pass user message to detect color intent (e.g., "bright colors", "earth tones")
    let processedChips = processChipsWithDerivedFacets(validated.valid, products, message, conversationHistory)
    console.log('[DEBUG] Processed chips:', processedChips.length)

    // Filter out any chips that are already selected (safety net - LLM might still suggest them)
    const selectedValues = new Set(selectedChips.map(c => String(c.filterValue)))
    const suggestedChips = processedChips.filter(chip => 
      !selectedValues.has(String(chip.filterValue))
    )
    console.log('[DEBUG] After filtering selected, suggested chips:', suggestedChips.length)

    // Calculate matching products if we have valid chips
    // Occasion chips act as a HARD GATE - products must match at least one occasion
    // Then OR logic applies for other chip types within the filtered set
    let matchingProducts: Product[] = []
    if (suggestedChips.length > 0) {
      // Pre-filter by occasion: if occasion chips exist, products MUST match at least one
      const occasionChips = suggestedChips.filter(c => c.type === 'occasion')
      let productsToSearch = products
      
      if (occasionChips.length > 0) {
        const occasions = occasionChips.map(c => c.filterValue as string)
        productsToSearch = products.filter(p => 
          p.occasion.some(occ => occasions.includes(occ))
        )
        console.log('[DEBUG] Pre-filtered by occasions:', occasions, '→', productsToSearch.length, 'products')
      }
      
      matchingProducts = findProductsMatchingAnyChip(productsToSearch, suggestedChips)
    }

    // Build response
    const response: ChatResponse = {
      raw: rawResponse,
      parsed: validated.data || null,
      suggestedChips: suggestedChips,
      invalid: validated.invalid,
      errors: validated.errors,
      matchingProducts: matchingProducts.slice(0, 20), // Limit preview to 20 products
    }

    return Response.json(response)

  } catch (error) {
    console.error('[DEBUG] Chat API error caught:', error)
    console.error('[DEBUG] Error type:', error?.constructor?.name)
    console.error('[DEBUG] Error message:', error instanceof Error ? error.message : 'Unknown')
    
    // Log full error details
    if (error instanceof Error) {
      console.error('[DEBUG] Error stack:', error.stack)
    }

    // Handle Groq API errors
    if (error instanceof Groq.APIError) {
      console.error('[DEBUG] Groq API Error - Status:', error.status, 'Message:', error.message)
      return Response.json(
        {
          error: 'AI service error',
          message: error.message,
          raw: '',
          parsed: null,
          suggestedChips: [],
          invalid: [],
          errors: [`Groq API error: ${error.status} - ${error.message}`],
        } as ChatResponse,
        { status: error.status || 500 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error('[DEBUG] JSON Syntax Error:', error.message)
      return Response.json(
        {
          error: 'Invalid request format',
          raw: '',
          parsed: null,
          suggestedChips: [],
          invalid: [],
          errors: ['Failed to parse request body as JSON'],
        } as ChatResponse,
        { status: 400 }
      )
    }

    // Generic error
    console.error('[DEBUG] Generic error - returning 500')
    return Response.json(
      {
        error: 'Internal server error',
        raw: '',
        parsed: null,
        suggestedChips: [],
        invalid: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      } as ChatResponse,
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Processes LLM chips to:
 * 1. Remove any LLM-generated color chips (colors are data-driven)
 * 2. Add color chips derived from available products in suggested subcategories
 * 3. Filter colors by user intent if color family is mentioned (e.g., "bright colors", "earth tones")
 * 4. Keep LLM-generated occasions as-is (LLM is context-aware for activities)
 * 5. Keep LLM-generated materials as-is (no supplementation - LLM is context-aware)
 * 6. Keep LLM-generated style tags as-is (no supplementation - LLM is context-aware)
 * 
 * NOTE: Occasions, materials, and style tags are fully LLM-driven to ensure they match user intent.
 * For example, "running outfit" should only get athletic occasion and athletic materials (cotton, polyester),
 * not irrelevant ones (cashmere, silk) that might exist for the subcategories.
 */
function processChipsWithDerivedFacets(
  llmChips: FilterChip[],
  products: Product[],
  currentMessage: string,
  conversationHistory: Message[] = []
): FilterChip[] {
  // Separate chips by type
  const subcategoryChips = llmChips.filter(c => c.type === 'subcategory')
  const occasionChips = llmChips.filter(c => c.type === 'occasion')
  const materialChips = llmChips.filter(c => c.type === 'material')
  const styleChips = llmChips.filter(c => c.type === 'style_tag')
  const otherChips = llmChips.filter(c => 
    c.type !== 'subcategory' && 
    c.type !== 'occasion' &&
    c.type !== 'material' && 
    c.type !== 'style_tag' && 
    c.type !== 'color' // Remove LLM color chips - colors are data-driven
  )

  // Get subcategory values
  const subcategories = subcategoryChips.map(c => c.filterValue as string)
  
  // Derive colors from products matching the subcategories (fully data-driven)
  let availableColors = getColorsForSubcategories(products, subcategories)
  
  // Detect color intent from conversation (check current message + recent history)
  const colorIntent = detectColorIntent(currentMessage, conversationHistory)
  if (colorIntent) {
    // Filter colors to only include those matching the color intent
    availableColors = filterColorsByIntent(availableColors, colorIntent)
    console.log('[DEBUG] Color intent detected:', colorIntent, '→ filtered to', availableColors.length, 'colors')
  }
  
  const colorChips: FilterChip[] = availableColors.map(color => ({
    id: `chip-color-${color}`,
    type: 'color',
    label: capitalize(color),
    filterKey: 'colors',
    filterValue: color,
  }))

  // Occasions, materials, and style tags are fully LLM-driven (no catalog supplementation)
  // This ensures suggestions are context-aware and relevant to the user's query

  // Combine all chips in order:
  // 1. Subcategories (LLM-driven)
  // 2. Occasions (LLM-driven, context-aware for activities)
  // 3. Materials (LLM-driven, context-aware)
  // 4. Colors (data-driven from catalog)
  // 5. Style tags (LLM-driven, context-aware)
  // 6. Other chips (size, etc.)
  return [
    ...subcategoryChips,
    ...occasionChips,
    ...materialChips,
    ...colorChips,
    ...styleChips,
    ...otherChips,
  ]
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Detects color intent from user message and conversation history.
 * Returns a color family keyword if detected, null otherwise.
 */
function detectColorIntent(
  currentMessage: string,
  conversationHistory: Message[] = []
): string | null {
  // Combine current message with recent user messages (last 3 turns)
  const recentUserMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .slice(-3)
    .map(msg => msg.content.toLowerCase())
  
  const fullText = [currentMessage.toLowerCase(), ...recentUserMessages].join(' ')
  
  // Color family keywords (case-insensitive matching)
  const colorFamilies: Record<string, string[]> = {
    'earth tones': ['earth tones', 'earth tone', 'earthtone', 'earthy'],
    'brights': ['bright colors', 'bright color', 'brights', 'bold colors', 'bold color', 'vivid colors', 'vivid color'],
    'neutrals': ['neutrals', 'neutral colors', 'neutral color', 'neutral palette'],
    'pastels': ['pastels', 'pastel colors', 'pastel color', 'soft colors', 'soft color'],
    'dark': ['dark colors', 'dark color', 'moody colors', 'moody color', 'dark palette'],
  }
  
  // Check for color family mentions
  for (const [family, keywords] of Object.entries(colorFamilies)) {
    if (keywords.some(keyword => fullText.includes(keyword))) {
      return family
    }
  }
  
  return null
}

/**
 * Filters available colors to only include those matching the color intent.
 * Maps color families to actual catalog colors.
 */
function filterColorsByIntent(availableColors: string[], intent: string): string[] {
  // Map color families to actual catalog colors
  const colorFamilyMap: Record<string, string[]> = {
    'earth tones': ['brown', 'beige', 'olive', 'cream'],
    'brights': ['red', 'pink', 'blue', 'green', 'yellow', 'orange'],
    'neutrals': ['black', 'white', 'gray', 'beige', 'navy', 'cream'],
    'pastels': ['pink', 'blue', 'green', 'yellow', 'cream'],
    'dark': ['black', 'navy', 'gray'],
  }
  
  const matchingColors = colorFamilyMap[intent] || []
  
  // Return only colors that are both available AND match the intent
  return availableColors.filter(color => matchingColors.includes(color.toLowerCase()))
}

