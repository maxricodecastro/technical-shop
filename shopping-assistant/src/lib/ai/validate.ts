import { z } from 'zod'
import { CatalogFacets, FilterChip, LLMResponse, ValidationResult, ChipType } from '@/types'

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Schema for validating filter chip structure from LLM.
 * Note: filterValue validation against catalog happens separately.
 * 
 * Simplified for stateless flow:
 * - Removed price_range type
 * - Removed minPrice/maxPrice filterKeys
 */
const FilterChipSchema = z.object({
  id: z.string(),
  type: z.enum(['subcategory', 'occasion', 'color', 'material', 'style_tag', 'size']),
  label: z.string(),
  filterKey: z.enum(['subcategory', 'subcategories', 'occasions', 'colors', 'materials', 'styleTags', 'sizes', 'inStock']),
  filterValue: z.union([z.string(), z.boolean()])
})

/**
 * Schema for validating the complete LLM response structure.
 * 
 * Simplified for stateless flow:
 * - Removed intentMode
 * - Removed replaceCategories
 * - Removed priceQuestion
 * - Removed minPrice/maxPrice
 */
const LLMResponseSchema = z.object({
  message: z.string(),
  chips: z.array(FilterChipSchema),
})

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validates raw LLM response against schema and catalog facets.
 * 
 * Process:
 * 1. Parse JSON string (if needed)
 * 2. Validate structure with Zod schema
 * 3. Validate each chip's filterValue against catalog facets
 * 4. Split into valid/invalid chips
 * 
 * Simplified for stateless flow:
 * - No intent mode handling
 * - No price extraction
 * - No conversation context
 * 
 * @param raw - Raw LLM response (string or parsed object)
 * @param facets - Catalog facets for validation
 * @returns ValidationResult with valid/invalid chips and errors
 */
export function validateLLMResponse(
  raw: unknown,
  facets: CatalogFacets
): ValidationResult {
  const errors: string[] = []
  
  // Step 1: Parse JSON if string
  let parsed: unknown
  if (typeof raw === 'string') {
    try {
      // Handle potential markdown code blocks
      const cleaned = cleanJsonString(raw)
      parsed = JSON.parse(cleaned)
    } catch (e) {
      return {
        success: false,
        valid: [],
        invalid: [],
        errors: [`Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`]
      }
    }
  } else {
    parsed = raw
  }

  // Step 2: Validate structure with Zod
  const schemaResult = LLMResponseSchema.safeParse(parsed)
  
  if (!schemaResult.success) {
    const zodErrors = schemaResult.error.issues.map(
      (issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`
    )
    return {
      success: false,
      valid: [],
      invalid: [],
      errors: [`Schema validation failed: ${zodErrors.join(', ')}`]
    }
  }

  const llmResponse = schemaResult.data

  // Step 3: Validate each chip against catalog facets
  const valid: FilterChip[] = []
  const invalid: FilterChip[] = []

  for (const chip of llmResponse.chips) {
    const validation = validateChipAgainstCatalog(chip, facets)
    
    if (validation.isValid) {
      valid.push(chip)
    } else {
      invalid.push(chip)
      errors.push(validation.error!)
    }
  }

  return {
    success: true,
    data: {
      message: llmResponse.message,
      chips: valid,
    },
    valid,
    invalid,
    errors
  }
}

// ============================================
// CHIP VALIDATION HELPERS
// ============================================

interface ChipValidation {
  isValid: boolean
  error?: string
}

/**
 * Validates a single chip's filterValue against catalog facets.
 * 
 * Simplified for stateless flow:
 * - Removed price_range case
 */
function validateChipAgainstCatalog(
  chip: FilterChip,
  facets: CatalogFacets
): ChipValidation {
  const value = chip.filterValue

  switch (chip.type) {
    case 'subcategory':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Subcategory value must be string, got ${typeof value}` }
      }
      if (!facets.subcategories.includes(value.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Invalid subcategory "${value}". Valid: ${facets.subcategories.join(', ')}` 
        }
      }
      return { isValid: true }

    case 'color':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Color value must be string, got ${typeof value}` }
      }
      if (!facets.colors.includes(value.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Invalid color "${value}". Valid: ${facets.colors.join(', ')}` 
        }
      }
      return { isValid: true }

    case 'material':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Material value must be string, got ${typeof value}` }
      }
      if (!facets.materials.includes(value.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Invalid material "${value}". Valid: ${facets.materials.join(', ')}` 
        }
      }
      return { isValid: true }

    case 'occasion':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Occasion value must be string, got ${typeof value}` }
      }
      if (!facets.occasions.includes(value.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Invalid occasion "${value}". Valid: ${facets.occasions.join(', ')}` 
        }
      }
      return { isValid: true }

    case 'style_tag':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Style tag value must be string, got ${typeof value}` }
      }
      if (!facets.styleTags.includes(value.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Invalid style tag "${value}". Valid: ${facets.styleTags.join(', ')}` 
        }
      }
      return { isValid: true }

    case 'size':
      if (typeof value !== 'string') {
        return { isValid: false, error: `Size value must be string, got ${typeof value}` }
      }
      // Sizes are typically uppercase, check case-insensitively
      const upperValue = value.toUpperCase()
      if (!facets.sizes.includes(upperValue)) {
        return { 
          isValid: false, 
          error: `Invalid size "${value}". Valid: ${facets.sizes.join(', ')}` 
        }
      }
      return { isValid: true }

    default:
      return { isValid: false, error: `Unknown chip type: ${chip.type}` }
  }
}

// ============================================
// STRING CLEANING HELPERS
// ============================================

/**
 * Cleans LLM response string to extract valid JSON.
 * Handles markdown code blocks and extra whitespace.
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim()
  
  // Remove markdown code blocks if present
  // Handle ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1]
  }
  
  // Find the JSON object (starts with { ends with })
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }
  
  return cleaned
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalizes a chip's filterValue to match catalog casing.
 * Useful for ensuring consistency after validation passes.
 */
export function normalizeChip(chip: FilterChip, facets: CatalogFacets): FilterChip {
  const normalized = { ...chip }
  
  if (typeof chip.filterValue === 'string') {
    const lowerValue = chip.filterValue.toLowerCase()
    
    switch (chip.type) {
      case 'subcategory':
        normalized.filterValue = facets.subcategories.find(s => s.toLowerCase() === lowerValue) || chip.filterValue
        break
      case 'occasion':
        normalized.filterValue = facets.occasions.find(o => o.toLowerCase() === lowerValue) || chip.filterValue
        break
      case 'color':
        normalized.filterValue = facets.colors.find(c => c.toLowerCase() === lowerValue) || chip.filterValue
        break
      case 'material':
        normalized.filterValue = facets.materials.find(m => m.toLowerCase() === lowerValue) || chip.filterValue
        break
      case 'style_tag':
        normalized.filterValue = facets.styleTags.find(s => s.toLowerCase() === lowerValue) || chip.filterValue
        break
      case 'size':
        normalized.filterValue = facets.sizes.find(s => s.toLowerCase() === lowerValue) || chip.filterValue
        break
    }
  }
  
  return normalized
}

/**
 * Gets the valid facet values for a given chip type.
 * 
 * Simplified for stateless flow:
 * - Removed price_range case
 */
export function getValidValuesForType(
  type: ChipType, 
  facets: CatalogFacets
): string[] {
  switch (type) {
    case 'subcategory':
      return facets.subcategories
    case 'occasion':
      return facets.occasions
    case 'color':
      return facets.colors
    case 'material':
      return facets.materials
    case 'style_tag':
      return facets.styleTags
    case 'size':
      return facets.sizes
  }
}
