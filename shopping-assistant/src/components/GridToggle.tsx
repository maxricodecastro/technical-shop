'use client'

import { useSearch } from '@/contexts/SearchContext'

export function GridToggle() {
  const { isExpandedView, toggleExpandedView } = useSearch()

  return (
    <div className="sticky top-[65px] z-50 flex justify-end pr-4 pb-2">
      <button
        onClick={toggleExpandedView}
        className="w-8 h-8 flex items-center justify-center text-black bg-white transition-all duration-300 ease-in-out cursor-pointer"
        style={{ borderRadius: 0 }}
        aria-label={isExpandedView ? 'Switch to 4 columns' : 'Switch to 3 columns'}
      >
        <span className="text-[15px] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
          {isExpandedView ? '−' : '+'}
        </span>
      </button>
    </div>
  )
}

