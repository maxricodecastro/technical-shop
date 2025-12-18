'use client'

import { SearchBar } from './SearchBar'
import { Filters } from './Filters'
import { AIMessage } from './AIMessage'
import { useSearch } from '@/contexts/SearchContext'

export function Sidebar() {
  const { aiMessage } = useSearch()
  const isMessageVisible = aiMessage !== null && aiMessage.trim().length > 0
  
  return (
    <aside className="sticky top-[57px] h-[calc(100vh-57px)] w-84 flex-shrink-0 flex flex-col overflow-hidden relative border-r border-[var(--border-secondary)]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pt-2">
        <div className={`flex flex-col p-4 transition-[padding-bottom] duration-300 ease-out ${
          isMessageVisible ? 'pb-[120px]' : 'pb-6'
        }`}>
          <SearchBar />
          <Filters />
        </div>
      </div>

      {/* AI Message - positioned at bottom, outside scrollable area */}
      <AIMessage />
    </aside>
  )
}
