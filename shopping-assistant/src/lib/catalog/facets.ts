import { Product, CatalogFacets } from '@/types'

/**
 * Extracts unique facet values from the product catalog.
 * These facets are used for:
 * 1. Building the LLM prompt (so it knows what values are valid)
 * 2. Validating LLM responses (reject values not in catalog)
 * 3. Displaying filter options in the UI
 */
export function getCatalogFacets(products: Product[]): CatalogFacets {
  return {
    subcategories: [...new Set(products.map(p => p.subcategory))].sort(),
    colors: [...new Set(products.map(p => p.color))].sort(),
    materials: [...new Set(products.map(p => p.material))].sort(),
    styleTags: [...new Set(products.flatMap(p => p.style_tags))].sort(),
    sizes: ['XS', 'S', 'M', 'L', 'XL'].filter(size => 
      products.some(p => p.size === size)
    ),
    priceRange: {
      min: Math.min(...products.map(p => p.price)),
      max: Math.max(...products.map(p => p.price))
    }
  }
}

/**
 * Checks if a given value exists in the catalog facets.
 * Used for validating LLM-suggested filter values.
 */
export function isValidFacetValue(
  facets: CatalogFacets,
  facetType: keyof Omit<CatalogFacets, 'priceRange'>,
  value: string
): boolean {
  const validValues = facets[facetType]
  return validValues.includes(value.toLowerCase())
}

/**
 * Normalizes a facet value to match catalog casing.
 * Returns null if no match found.
 */
export function normalizeFacetValue(
  facets: CatalogFacets,
  facetType: keyof Omit<CatalogFacets, 'priceRange'>,
  value: string
): string | null {
  const validValues = facets[facetType]
  const lowerValue = value.toLowerCase()
  return validValues.find(v => v.toLowerCase() === lowerValue) || null
}

/**
 * Formats facets as a string for inclusion in LLM prompts.
 * Creates a readable list of available filter options.
 */
export function formatFacetsForPrompt(facets: CatalogFacets): string {
  return `
AVAILABLE FILTER VALUES (only use these exact values):

Subcategories: ${facets.subcategories.join(', ')}

Colors: ${facets.colors.join(', ')}

Materials: ${facets.materials.join(', ')}

Style Tags: ${facets.styleTags.join(', ')}

Sizes: ${facets.sizes.join(', ')}

Price Range: $${facets.priceRange.min} - $${facets.priceRange.max}
`.trim()
}

