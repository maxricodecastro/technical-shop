'use client'

import { useMemo } from 'react'
import { useSearch } from '@/contexts/SearchContext'
import { FilterChip, FilterState, ChipType, CatalogFacets } from '@/types'
import { applyFilters, applyChipToFilters } from '@/lib/filters/engine'

// ============================================
// TYPES
// ============================================

interface FilterSection {
  name: string
  filterKey: keyof FilterState
  chipType: ChipType
  values: string[]
}

// ============================================
// HELPERS
// ============================================

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Builds filter sections from catalog facets.
 * Maps UI section names to their corresponding filter keys and chip types.
 */
function buildFilterSections(facets: CatalogFacets): FilterSection[] {
  return [
    {
      name: 'CATEGORIES',
      filterKey: 'subcategories',
      chipType: 'subcategory',
      values: facets.subcategories,
    },
    {
      name: 'COLORS',
      filterKey: 'colors',
      chipType: 'color',
      values: facets.colors,
    },
    {
      name: 'MATERIALS',
      filterKey: 'materials',
      chipType: 'material',
      values: facets.materials,
    },
    {
      name: 'STYLE',
      filterKey: 'styleTags',
      chipType: 'style_tag',
      values: facets.styleTags,
    },
    {
      name: 'OCCASION',
      filterKey: 'occasions',
      chipType: 'occasion',
      values: facets.occasions,
    },
    {
      name: 'SIZE',
      filterKey: 'sizes',
      chipType: 'size',
      values: facets.sizes,
    },
  ]
}

/**
 * Creates a FilterChip object from a filter value.
 */
function createChipFromValue(
  value: string,
  filterKey: keyof FilterState,
  chipType: ChipType
): FilterChip {
  // Use uppercase for size labels, capitalize for others
  const label = chipType === 'size' ? value.toUpperCase() : capitalize(value)
  
  return {
    id: `filter-${chipType}-${value}`,
    type: chipType,
    label,
    filterKey,
    filterValue: value,
  }
}

// ============================================
// COMPONENT
// ============================================

export function Filters() {
  const { 
    catalogFacets, 
    filterState, 
    allProducts,
    toggleFilter, 
    isChipActive 
  } = useSearch()

  // Memoize filter sections to avoid rebuilding on every render
  const sections = useMemo(() => {
    if (!catalogFacets) return []
    return buildFilterSections(catalogFacets)
  }, [catalogFacets])

  // Memoize which filters would have results
  // This computes for each possible filter whether adding it would return > 0 products
  const filterAvailability = useMemo(() => {
    if (!catalogFacets) return new Map<string, boolean>()
    
    const availability = new Map<string, boolean>()
    
    for (const section of sections) {
      for (const value of section.values) {
        const chip = createChipFromValue(value, section.filterKey, section.chipType)
        const chipKey = `${section.chipType}-${value}`
        
        // If already selected, it's available (user can toggle it off)
        if (isChipActive(chip)) {
          availability.set(chipKey, true)
          continue
        }
        
        // Check if adding this filter would return any products
        const hypotheticalState = applyChipToFilters(filterState, chip)
        const results = applyFilters(allProducts, hypotheticalState)
        availability.set(chipKey, results.length > 0)
      }
    }
    
    return availability
  }, [catalogFacets, filterState, allProducts, sections, isChipActive])

  if (!catalogFacets) return null

  return (
    <div className="flex flex-col gap-6 mt-6">
      {sections.map((section) => (
        <div key={section.name} className="flex flex-col gap-2">
          {/* Section Name */}
          <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-medium)] uppercase">
            {section.name}
          </div>

          {/* Filter Items */}
          <div className="flex flex-wrap gap-2">
            {section.values.map((value) => {
              const chip = createChipFromValue(value, section.filterKey, section.chipType)
              const isSelected = isChipActive(chip)
              const chipKey = `${section.chipType}-${value}`
              const isAvailable = filterAvailability.get(chipKey) ?? true
              const isDisabled = !isSelected && !isAvailable
              
              return (
                <button
                  key={chip.id}
                  onClick={() => !isDisabled && toggleFilter(chip)}
                  disabled={isDisabled}
                  className={`text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] ${
                    isDisabled 
                      ? 'text-[var(--text-secondary)] cursor-not-allowed' 
                      : 'hover:underline cursor-pointer'
                  } ${isSelected ? 'underline' : ''}`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
