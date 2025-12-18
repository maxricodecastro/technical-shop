'use client'

import { useSearch } from '@/contexts/SearchContext'

export function AIMessage() {
  const { aiMessage } = useSearch()
  
  const isVisible = aiMessage !== null && aiMessage.trim().length > 0

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="p-4 bg-white border-[var(--border-secondary)]">
        <div className="w-full py-3 px-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] border border-[var(--border-secondary)] bg-white text-black">
          {aiMessage}
        </div>
      </div>
    </div>
  )
}
