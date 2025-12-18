import Groq from 'groq-sdk'
import { buildFilterPrompt } from '@/lib/ai/prompts'
import { validateLLMResponse } from '@/lib/ai/validate'
import { getCatalogFacets } from '@/lib/catalog/facets'
import { 
  findProductsMatchingAnyChip, 
  getColorsForSubcategories
} from '@/lib/filters/engine'
import { FilterChip, ChatRequest, ChatResponse, Product } from '@/types'
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
 * Simplified chat endpoint for filter generation.
 * Takes a user message and returns suggested filter chips.
 * 
 * Flow:
 * 1. Extract catalog facets for prompt context
 * 2. Build system prompt with available filters
 * 3. Call Groq LLM with user message (no conversation history)
 * 4. Validate response against catalog facets
 * 5. Return valid chips (all chips are auto-applied)
 */
export async function POST(request: Request): Promise<Response> {
  console.log('[DEBUG] POST /api/chat - Request received')
  
  try {
    // Parse request body - simplified: only message field
    console.log('[DEBUG] Parsing request body...')
    const body = await request.json() as ChatRequest
    const { message } = body
    console.log('[DEBUG] Message received:', message)

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log('[DEBUG] Invalid message - returning 400')
      return Response.json(
        { 
          message: 'Message is required',
          suggestedChips: [],
          errors: ['Message is required']
        } as ChatResponse,
        { status: 400 }
      )
    }

    // Get catalog facets for prompt and validation
    console.log('[DEBUG] Getting catalog facets...')
    const facets = getCatalogFacets(products)
    console.log('[DEBUG] Facets retrieved - colors:', facets.colors.length, 'materials:', facets.materials.length)

    // Build the system prompt with available filters (simplified - no current filters or selected chips)
    console.log('[DEBUG] Building system prompt...')
    const systemPrompt = buildFilterPrompt(facets)
    console.log('[DEBUG] System prompt length:', systemPrompt.length)

    // Simple message structure - no conversation history
    const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    console.log('[DEBUG] Calling Groq API with', llmMessages.length, 'messages...')
    console.log('[DEBUG] API Key for request:', process.env.GROQ_API_KEY ? 'Present' : 'MISSING!')

    // Call Groq LLM
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
    const processedChips = processChipsWithDerivedFacets(validated.valid, products)
    console.log('[DEBUG] Processed chips:', processedChips.length)

    // All chips are returned (no filtering of "already selected" chips - each request is independent)
    const suggestedChips = processedChips
    console.log('[DEBUG] Suggested chips:', suggestedChips.length)

    // Build simplified response
    const response: ChatResponse = {
      message: validated.data?.message || 'Here are some options for you.',
      suggestedChips: suggestedChips,
      invalid: validated.invalid.length > 0 ? validated.invalid : undefined,
      errors: validated.errors.length > 0 ? validated.errors : undefined,
    }

    console.log('[DEBUG] Response message:', response.message)
    console.log('[DEBUG] Suggested chips count:', suggestedChips.length)

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
          message: 'Sorry, I had trouble processing your request. Please try again.',
          suggestedChips: [],
          errors: [`AI service error: ${error.message}`],
        } as ChatResponse,
        { status: error.status || 500 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error('[DEBUG] JSON Syntax Error:', error.message)
      return Response.json(
        {
          message: 'Invalid request format.',
          suggestedChips: [],
          errors: ['Failed to parse request body as JSON'],
        } as ChatResponse,
        { status: 400 }
      )
    }

    // Generic error
    console.error('[DEBUG] Generic error - returning 500')
    return Response.json(
      {
        message: 'Something went wrong. Please try again.',
        suggestedChips: [],
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
 * 3. Keep LLM-generated occasions, materials, style tags as-is (LLM is context-aware)
 */
function processChipsWithDerivedFacets(
  llmChips: FilterChip[],
  products: Product[]
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
  const availableColors = getColorsForSubcategories(products, subcategories)
  
  const colorChips: FilterChip[] = availableColors.map(color => ({
    id: `chip-color-${color}`,
    type: 'color',
    label: capitalize(color),
    filterKey: 'colors',
    filterValue: color,
  }))

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
