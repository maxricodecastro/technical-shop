import { Product, FilterState, FilterChip } from '@/types'

/**
 * Filter Engine
 * 
 * Applies filter logic:
 * - OR within each category (e.g., blue OR green)
 * - AND across categories (e.g., (blue OR green) AND wool)
 * 
 * Example:
 * - colors: ["blue", "green"] → product.color is blue OR green
 * - materials: ["wool"] → AND product.material is wool
 * - Combined: (blue OR green) AND (wool)
 */

// ============================================
// MAIN FILTER FUNCTION
// ============================================

/**
 * Applies all active filters to the product list.
 * Returns products that match ALL filter criteria (AND logic).
 * 
 * @param products - Full product catalog
 * @param filters - Current filter state
 * @returns Filtered products
 */
export function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter(product => {
    // Subcategories (OR within - for multiple subcategories)
    // If subcategories array has values, use it (takes precedence over single subcategory)
    if (filters.subcategories.length > 0) {
      if (!filters.subcategories.includes(product.subcategory)) {
        return false
      }
    } else if (filters.subcategory) {
      // Single subcategory filter (backward compatibility)
      if (product.subcategory !== filters.subcategory) {
        return false
      }
    }

    // Occasions (OR within, AND with others)
    // Product must have at least one matching occasion
    if (filters.occasions.length > 0) {
      const hasMatchingOccasion = product.occasion.some(occ => 
        filters.occasions.includes(occ)
      )
      if (!hasMatchingOccasion) {
        return false
      }
    }

    // Colors (OR within, AND with others)
    // Case-insensitive comparison to handle normalization differences
    if (filters.colors.length > 0) {
      const productColorLower = product.color.toLowerCase()
      const hasMatchingColor = filters.colors.some(filterColor => 
        filterColor.toLowerCase() === productColorLower
      )
      if (!hasMatchingColor) {
        return false
      }
    }

    // Materials (OR within, AND with others)
    if (filters.materials.length > 0 && !filters.materials.includes(product.material)) {
      return false
    }

    // Sizes (OR within, AND with others)
    if (filters.sizes.length > 0 && !filters.sizes.includes(product.size)) {
      return false
    }

    // Style Tags (product must have at least one matching tag)
    if (filters.styleTags.length > 0) {
      const hasMatchingTag = product.style_tags.some(tag => 
        filters.styleTags.includes(tag)
      )
      if (!hasMatchingTag) {
        return false
      }
    }

    // In Stock
    if (filters.inStock !== null && product.in_stock !== filters.inStock) {
      return false
    }

    return true
  })
}

// ============================================
// FILTER STATE HELPERS
// ============================================

/**
 * Applies a single chip to the current filter state.
 * Returns a new FilterState with the chip applied.
 */
export function applyChipToFilters(
  filters: FilterState,
  chip: FilterChip
): FilterState {
  const newFilters = { ...filters }

  switch (chip.filterKey) {
    case 'subcategory':
      // For single subcategory, also add to subcategories array for OR logic
      newFilters.subcategory = chip.filterValue as string
      if (!newFilters.subcategories.includes(chip.filterValue as string)) {
        newFilters.subcategories = [...newFilters.subcategories, chip.filterValue as string]
      }
      break

    case 'subcategories':
      // Direct subcategories array for OR logic
      if (!newFilters.subcategories.includes(chip.filterValue as string)) {
        newFilters.subcategories = [...newFilters.subcategories, chip.filterValue as string]
      }
      break

    case 'occasions':
      if (!newFilters.occasions.includes(chip.filterValue as string)) {
        newFilters.occasions = [...newFilters.occasions, chip.filterValue as string]
      }
      break

    case 'colors':
      if (!newFilters.colors.includes(chip.filterValue as string)) {
        newFilters.colors = [...newFilters.colors, chip.filterValue as string]
      }
      break

    case 'materials':
      if (!newFilters.materials.includes(chip.filterValue as string)) {
        newFilters.materials = [...newFilters.materials, chip.filterValue as string]
      }
      break

    case 'sizes':
      if (!newFilters.sizes.includes(chip.filterValue as string)) {
        newFilters.sizes = [...newFilters.sizes, chip.filterValue as string]
      }
      break

    case 'styleTags':
      if (!newFilters.styleTags.includes(chip.filterValue as string)) {
        newFilters.styleTags = [...newFilters.styleTags, chip.filterValue as string]
      }
      break

    case 'inStock':
      newFilters.inStock = chip.filterValue as boolean
      break
  }

  return newFilters
}

/**
 * Removes a chip from the current filter state.
 * Returns a new FilterState with the chip removed.
 */
export function removeChipFromFilters(
  filters: FilterState,
  chip: FilterChip
): FilterState {
  const newFilters = { ...filters }

  switch (chip.filterKey) {
    case 'subcategory':
      newFilters.subcategory = null
      newFilters.subcategories = newFilters.subcategories.filter(s => s !== chip.filterValue)
      break

    case 'subcategories':
      newFilters.subcategories = newFilters.subcategories.filter(s => s !== chip.filterValue)
      break

    case 'occasions':
      newFilters.occasions = newFilters.occasions.filter(o => o !== chip.filterValue)
      break

    case 'colors':
      newFilters.colors = newFilters.colors.filter(c => c !== chip.filterValue)
      break

    case 'materials':
      newFilters.materials = newFilters.materials.filter(m => m !== chip.filterValue)
      break

    case 'sizes':
      newFilters.sizes = newFilters.sizes.filter(s => s !== chip.filterValue)
      break

    case 'styleTags':
      newFilters.styleTags = newFilters.styleTags.filter(t => t !== chip.filterValue)
      break

    case 'inStock':
      newFilters.inStock = null
      break
  }

  return newFilters
}


// ============================================
// DERIVE FACETS FROM SUBCATEGORIES
// ============================================

/**
 * Gets all unique colors available for the given subcategories.
 * Used to dynamically surface color options based on what actually exists.
 */
export function getColorsForSubcategories(
  products: Product[],
  subcategories: string[]
): string[] {
  if (subcategories.length === 0) return []

  const colors = new Set<string>()
  
  for (const product of products) {
    if (subcategories.includes(product.subcategory)) {
      colors.add(product.color)
    }
  }

  return Array.from(colors).sort()
}


// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
