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
    occasions: [...new Set(products.flatMap(p => p.occasion))].sort(),
    colors: [...new Set(products.map(p => p.color))].sort(),
    materials: [...new Set(products.map(p => p.material))].sort(),
    styleTags: [...new Set(products.flatMap(p => p.style_tags))].sort(),
    sizes: ['XS', 'S', 'M', 'L', 'XL'].filter(size => 
      products.some(p => p.size === size)
    ),
  }
}

