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
    if (filters.colors.length > 0 && !filters.colors.includes(product.color)) {
      return false
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

/**
 * Applies multiple chips to the filter state.
 */
export function applyChipsToFilters(
  filters: FilterState,
  chips: FilterChip[]
): FilterState {
  return chips.reduce((acc, chip) => applyChipToFilters(acc, chip), filters)
}

/**
 * Counts how many filters are currently active.
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0
  
  if (filters.subcategory) count++
  count += filters.subcategories.length
  count += filters.occasions.length
  count += filters.colors.length
  count += filters.materials.length
  count += filters.sizes.length
  count += filters.styleTags.length
  if (filters.inStock !== null) count++
  
  return count
}

/**
 * Checks if any filters are active.
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Converts current filter state to an array of active chips.
 * Useful for displaying currently applied filters.
 */
export function filtersToChips(filters: FilterState): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.subcategory) {
    chips.push({
      id: `active-subcategory-${filters.subcategory}`,
      type: 'subcategory',
      label: capitalize(filters.subcategory),
      filterKey: 'subcategory',
      filterValue: filters.subcategory
    })
  }

  // Add subcategories (for OR logic)
  for (const subcategory of filters.subcategories) {
    // Avoid duplicates with single subcategory
    if (subcategory !== filters.subcategory) {
      chips.push({
        id: `active-subcategory-${subcategory}`,
        type: 'subcategory',
        label: capitalize(subcategory),
        filterKey: 'subcategories',
        filterValue: subcategory
      })
    }
  }

  for (const occasion of filters.occasions) {
    chips.push({
      id: `active-occasion-${occasion}`,
      type: 'occasion',
      label: capitalize(occasion),
      filterKey: 'occasions',
      filterValue: occasion
    })
  }

  for (const color of filters.colors) {
    chips.push({
      id: `active-color-${color}`,
      type: 'color',
      label: capitalize(color),
      filterKey: 'colors',
      filterValue: color
    })
  }

  for (const material of filters.materials) {
    chips.push({
      id: `active-material-${material}`,
      type: 'material',
      label: capitalize(material),
      filterKey: 'materials',
      filterValue: material
    })
  }

  for (const size of filters.sizes) {
    chips.push({
      id: `active-size-${size}`,
      type: 'size',
      label: size.toUpperCase(),
      filterKey: 'sizes',
      filterValue: size
    })
  }

  for (const tag of filters.styleTags) {
    chips.push({
      id: `active-style-${tag}`,
      type: 'style_tag',
      label: capitalize(tag),
      filterKey: 'styleTags',
      filterValue: tag
    })
  }

  return chips
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

/**
 * Gets all unique materials available for the given subcategories.
 * Used to supplement LLM-suggested materials with what actually exists.
 */
export function getMaterialsForSubcategories(
  products: Product[],
  subcategories: string[]
): string[] {
  if (subcategories.length === 0) return []

  const materials = new Set<string>()
  
  for (const product of products) {
    if (subcategories.includes(product.subcategory)) {
      materials.add(product.material)
    }
  }

  return Array.from(materials).sort()
}

/**
 * Gets all unique style tags available for the given subcategories.
 */
export function getStyleTagsForSubcategories(
  products: Product[],
  subcategories: string[]
): string[] {
  if (subcategories.length === 0) return []

  const styleTags = new Set<string>()
  
  for (const product of products) {
    if (subcategories.includes(product.subcategory)) {
      for (const tag of product.style_tags) {
        styleTags.add(tag)
      }
    }
  }

  return Array.from(styleTags).sort()
}

// ============================================
// OR-BASED MATCHING (for preview/suggestions)
// ============================================

/**
 * Finds products that match ANY of the given chips (OR logic).
 * Used for preview when showing suggested filters - we want to show
 * products that would match if the user clicked ANY of the chips.
 * 
 * Products are scored by how many chips they match, with best matches first.
 */
export function findProductsMatchingAnyChip(
  products: Product[],
  chips: FilterChip[]
): Product[] {
  if (chips.length === 0) return []

  // Score each product by how many chips it matches
  const scored = products.map(product => {
    let score = 0
    const matchedChips: string[] = []

    for (const chip of chips) {
      if (doesProductMatchChip(product, chip)) {
        score++
        matchedChips.push(chip.label)
      }
    }

    return { product, score, matchedChips }
  })

  // Filter to only products that match at least one chip
  const matching = scored.filter(s => s.score > 0)

  // Sort by score descending (best matches first)
  matching.sort((a, b) => b.score - a.score)

  return matching.map(s => s.product)
}

/**
 * Checks if a single product matches a single chip.
 */
function doesProductMatchChip(product: Product, chip: FilterChip): boolean {
  const value = chip.filterValue as string

  switch (chip.filterKey) {
    case 'subcategory':
    case 'subcategories':
      return product.subcategory === value
    case 'occasions':
      return product.occasion.includes(value)
    case 'colors':
      return product.color === value
    case 'materials':
      return product.material === value
    case 'sizes':
      return product.size === value
    case 'styleTags':
      return product.style_tags.includes(value)
    default:
      return false
  }
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
