import Groq from 'groq-sdk'
import { buildFilterPrompt } from '@/lib/ai/prompts'
import { validateLLMResponse, normalizeChip } from '@/lib/ai/validate'
import { getCatalogFacets } from '@/lib/catalog/facets'
import { 
  findProductsMatchingAnyChip, 
  getColorsForSubcategories
} from '@/lib/filters/engine'
import { FilterChip, ChatRequest, ChatResponse, Product } from '@/types'
import productsData from '@/data/products.json'

// Type assertion for imported JSON
const products = productsData as Product[]

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
  try {
    // Parse request body - simplified: only message field
    const body = await request.json() as ChatRequest
    const { message } = body

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
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
    const facets = getCatalogFacets(products)

    // Build the system prompt with available filters (simplified - no current filters or selected chips)
    const systemPrompt = buildFilterPrompt(facets)

    // Simple message structure - no conversation history
    const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    // Call Groq LLM
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: llmMessages,
      temperature: 0.7,
      max_tokens: 1024,
    })

    const rawResponse = completion.choices[0]?.message?.content || ''

    // Validate the LLM response against catalog facets
    const validated = validateLLMResponse(rawResponse, facets)

    // Normalize chips to match catalog casing (important for color matching)
    const normalizedChips = validated.valid.map(chip => normalizeChip(chip, facets))

    // Process chips: preserve LLM-requested colors, merge with data-driven colors
    const processedChips = processChipsWithDerivedFacets(normalizedChips, products, facets)

    // All chips are returned (no filtering of "already selected" chips - each request is independent)
    const suggestedChips = processedChips

    // Build simplified response
    const response: ChatResponse = {
      message: validated.data?.message || 'Here are some options for you.',
      suggestedChips: suggestedChips,
      invalid: validated.invalid.length > 0 ? validated.invalid : undefined,
      errors: validated.errors.length > 0 ? validated.errors : undefined,
    }

    return Response.json(response)

  } catch (error) {
    // Handle Groq API errors
    if (error instanceof Groq.APIError) {
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
 * 1. If user explicitly requested colors (LLM generated color chips) → ONLY use those colors, don't add derived colors
 * 2. If user did NOT explicitly request colors (vague query) → derive colors from available products in suggested subcategories
 * 3. Keep LLM-generated occasions, materials, style tags as-is (LLM is context-aware)
 * 
 * CRITICAL: When user explicitly requests a color (e.g., "red sweater"), we honor ONLY that color.
 * Even if no products match, we still apply the filter (user gets empty results, which is correct).
 */
function processChipsWithDerivedFacets(
  llmChips: FilterChip[],
  products: Product[],
  facets: { colors: string[] }
): FilterChip[] {
  // Separate chips by type
  const subcategoryChips = llmChips.filter(c => c.type === 'subcategory')
  const occasionChips = llmChips.filter(c => c.type === 'occasion')
  const materialChips = llmChips.filter(c => c.type === 'material')
  const styleChips = llmChips.filter(c => c.type === 'style_tag')
  const llmColorChips = llmChips.filter(c => c.type === 'color') // User explicitly requested these colors
  const otherChips = llmChips.filter(c => 
    c.type !== 'subcategory' && 
    c.type !== 'occasion' &&
    c.type !== 'material' && 
    c.type !== 'style_tag' && 
    c.type !== 'color'
  )

  // Get subcategory values
  const subcategories = subcategoryChips.map(c => c.filterValue as string)
  
  // Determine color chips based on whether user explicitly requested colors
  let colorChips: FilterChip[]
  
  if (llmColorChips.length > 0) {
    // User explicitly requested specific colors (e.g., "red sweater")
    // ONLY use the explicitly requested colors - do NOT add derived colors
    // This ensures user gets exactly what they asked for, even if it results in no products
    colorChips = llmColorChips
  } else {
    // User did NOT explicitly request colors (vague query like "something warm")
    // Derive colors from products matching the subcategories (data-driven)
    const derivedColors = getColorsForSubcategories(products, subcategories)
    
    colorChips = derivedColors.map(color => ({
      id: `chip-color-${color}`,
      type: 'color' as const,
      label: capitalize(color),
      filterKey: 'colors' as const,
      filterValue: color,
    }))
  }

  // Combine all chips in order:
  // 1. Subcategories (LLM-driven)
  // 2. Occasions (LLM-driven, context-aware for activities)
  // 3. Materials (LLM-driven, context-aware)
  // 4. Colors (explicitly requested OR derived from catalog)
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
