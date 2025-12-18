'use client'

import { useSearch } from '@/contexts/SearchContext'

interface FilterItem {
  id: string
  label: string
}

interface FilterCategory {
  name: string
  filters: FilterItem[]
}

// Dummy filter data
const dummyFilters: FilterCategory[] = [
  {
    name: 'CATEGORIES',
    filters: [
      { id: '1', label: 'T-Shirts' },
      { id: '2', label: 'Hoodies' },
      { id: '3', label: 'Jeans' },
      { id: '4', label: 'Sweaters' },
      { id: '5', label: 'Jackets' },
      { id: '6', label: 'Shorts' },
      { id: '7', label: 'Pants' },
      { id: '8', label: 'Dresses' },
      { id: '9', label: 'Skirts' },
      { id: '10', label: 'Coats' },
      { id: '11', label: 'Vests' },
      { id: '12', label: 'Tank Tops' },
    ],
  },
  {
    name: 'COLORS',
    filters: [
      { id: '13', label: 'Black' },
      { id: '14', label: 'White' },
      { id: '15', label: 'Blue' },
      { id: '16', label: 'Gray' },
      { id: '17', label: 'Brown' },
      { id: '18', label: 'Green' },
      { id: '19', label: 'Red' },
      { id: '20', label: 'Navy' },
      { id: '21', label: 'Beige' },
      { id: '22', label: 'Pink' },
      { id: '23', label: 'Yellow' },
      { id: '24', label: 'Orange' },
      { id: '25', label: 'Purple' },
      { id: '26', label: 'Olive' },
    ],
  },
  {
    name: 'MATERIALS',
    filters: [
      { id: '27', label: 'Cotton' },
      { id: '28', label: 'Wool' },
      { id: '29', label: 'Denim' },
      { id: '30', label: 'Polyester' },
      { id: '31', label: 'Leather' },
      { id: '32', label: 'Linen' },
      { id: '33', label: 'Silk' },
      { id: '34', label: 'Cashmere' },
      { id: '35', label: 'Fleece' },
      { id: '36', label: 'Canvas' },
      { id: '37', label: 'Suede' },
      { id: '38', label: 'Mesh' },
    ],
  },
]

export function Filters() {
  const { selectedFilters, toggleFilter } = useSearch()

  return (
    <div className="flex flex-col gap-6 mt-6">
      {dummyFilters.map((category) => {
        // Separate selected and unselected filters
        const selected = category.filters.filter((f) => selectedFilters.has(f.id))
        const unselected = category.filters.filter((f) => !selectedFilters.has(f.id))
        // Combine: selected first, then unselected
        const orderedFilters = [...selected, ...unselected]

        return (
          <div key={category.name} className="flex flex-col gap-2">
            {/* Category Name */}
            <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-medium)] uppercase">
              {category.name}
            </div>

            {/* Filter Items */}
            <div className="flex flex-wrap gap-2">
              {orderedFilters.map((filter) => {
                const isSelected = selectedFilters.has(filter.id)
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    className={`text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] hover:underline cursor-pointer ${
                      isSelected ? 'underline' : ''
                    }`}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

