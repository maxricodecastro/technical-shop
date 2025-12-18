'use client'

import { SearchBar } from './SearchBar'
import { Filters } from './Filters'
import { AIMessage } from './AIMessage'

export function Sidebar() {
  return (
    <aside className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto w-80 flex-shrink-0 border-r border-[var(--border-secondary)] relative">
      {/* Sidebar content - flex col */}
      <div className="flex flex-col h-full p-4 pb-24">
        <SearchBar />
        <Filters />
      </div>

      {/* AI Message - positioned at bottom with high z-index */}
      <AIMessage />
    </aside>
  )
}
