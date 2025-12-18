'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@/contexts/SearchContext'

export function AIMessage() {
  const { aiMessage, clearFilters } = useSearch()
  const messageRef = useRef<HTMLDivElement>(null)
  const [messageHeight, setMessageHeight] = useState(0)
  
  const isVisible = aiMessage !== null && aiMessage.trim().length > 0

  // Measure the actual height of the AI message container
  useEffect(() => {
    if (!messageRef.current) {
      setMessageHeight(0)
      return
    }

    const updateHeight = () => {
      if (messageRef.current) {
        // Get the actual rendered height
        const height = messageRef.current.offsetHeight
        setMessageHeight(height)
      }
    }

    // Update height when message changes or visibility changes
    // Use a small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      updateHeight()
    }, 0)

    // Use ResizeObserver to track height changes (handles text wrapping, etc.)
    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    resizeObserver.observe(messageRef.current)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [aiMessage, isVisible])

  return (
    <>
      {/* CLEAR FILTERS button - position adjusts based on message visibility */}
      <div 
        className="absolute left-0 right-0 z-50 bg-white transition-[bottom] duration-300 ease-out"
        style={{
          bottom: isVisible ? `${messageHeight}px` : '0px'
        }}
      >
        <div className="px-3 pt-3 pb-4">
          <button
            onClick={clearFilters}
            className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] hover:underline cursor-pointer text-black"
          >
            CLEAR FILTERS
          </button>
        </div>
      </div>

      {/* AI Message - slides up from below the button */}
      <div
        ref={messageRef}
        className={`absolute bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white border-t border-[var(--border-secondary)]">
          <div className="mb-4 w-full py-3 px-3 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] bg-white text-black">
            {aiMessage || ''}
          </div>
        </div>
      </div>
    </>
  )
}
