'use client'

import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { ProductCard } from './ProductCard'
import { useSearch } from '@/contexts/SearchContext'
import { Product, FilterState } from '@/types'

/**
 * Deep equality check for FilterState objects
 */
function filterStatesEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.subcategory === b.subcategory &&
    a.inStock === b.inStock &&
    JSON.stringify([...a.subcategories].sort()) === JSON.stringify([...b.subcategories].sort()) &&
    JSON.stringify([...a.colors].sort()) === JSON.stringify([...b.colors].sort()) &&
    JSON.stringify([...a.materials].sort()) === JSON.stringify([...b.materials].sort()) &&
    JSON.stringify([...a.sizes].sort()) === JSON.stringify([...b.sizes].sort()) &&
    JSON.stringify([...a.styleTags].sort()) === JSON.stringify([...b.styleTags].sort()) &&
    JSON.stringify([...a.occasions].sort()) === JSON.stringify([...b.occasions].sort())
  )
}

export function ProductGrid() {
  const { filteredProducts, status, filterState, isExpandedView } = useSearch()
  
  const [displayProducts, setDisplayProducts] = useState<Product[]>(filteredProducts)
  const [exitingProducts, setExitingProducts] = useState<Product[] | null>(null)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'start' | 'animating'>('idle')
  const prevStatusRef = useRef(status)
  const prevFilterStateRef = useRef<FilterState>(filterState)
  const displayProductsRef = useRef(displayProducts)

  // Keep ref in sync with state
  useEffect(() => {
    displayProductsRef.current = displayProducts
  }, [displayProducts])

  useEffect(() => {
    // Check if filters actually changed
    const filtersChanged = !filterStatesEqual(prevFilterStateRef.current, filterState)
    
    // When transitioning from loading to success, trigger animation ONLY if filters changed
    if (prevStatusRef.current === 'loading' && status === 'success') {
      if (filtersChanged) {
        // Capture current displayProducts before updating
        setExitingProducts([...displayProductsRef.current])
        setDisplayProducts(filteredProducts)
        setAnimationPhase('start')
      } else {
        // No filter change, just update products without animation
        setDisplayProducts(filteredProducts)
      }
    } else if (status !== 'loading') {
      setDisplayProducts(filteredProducts)
    }
    
    prevStatusRef.current = status
    prevFilterStateRef.current = filterState
  }, [status, filteredProducts, filterState])

  // Two-phase animation: 'start' positions elements, then 'animating' triggers transition
  useLayoutEffect(() => {
    if (animationPhase === 'start') {
      // Force a reflow then start animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationPhase('animating')
        })
      })
    }
  }, [animationPhase])

  // Clear exiting products after animation completes
  useEffect(() => {
    if (animationPhase === 'animating') {
      const timer = setTimeout(() => {
        setExitingProducts(null)
        setAnimationPhase('idle')
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [animationPhase])

  const gridClasses = `grid ${isExpandedView ? 'grid-cols-3' : 'grid-cols-4'} gap-8 py-4 transition-all duration-300 ease-in-out`
  const gridStyle = { paddingLeft: '120px', paddingRight: '120px' }

  // Determine transforms based on animation phase
  const getExitingTransform = () => {
    if (animationPhase === 'start') return 'translateX(0)'
    if (animationPhase === 'animating') return 'translateX(100%)'
    return 'translateX(0)'
  }

  const getEnteringTransform = () => {
    if (animationPhase === 'start') return 'translateX(-100%)'
    if (animationPhase === 'animating') return 'translateX(0)'
    return 'translateX(0)'
  }

  const transitionStyle = animationPhase === 'animating' 
    ? 'transform 400ms ease-in-out' 
    : 'none'

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto pt-2 relative">
      {/* Empty state */}
      {displayProducts.length === 0 && status !== 'loading' && (
        <div 
          className="py-4"
          style={{ paddingLeft: '120px', paddingRight: '120px' }}
        >
          <div className="flex flex-col gap-1">
            <div className="text-[13px] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
              No products found
            </div>
            <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
              Try another search
            </div>
          </div>
        </div>
      )}
      
      {/* Exiting grid - slides out to right */}
      {exitingProducts && exitingProducts.length > 0 && (
        <div 
          className={`${gridClasses} absolute inset-0 overflow-y-auto`}
          style={{ 
            ...gridStyle,
            transform: getExitingTransform(),
            transition: transitionStyle,
          }}
        >
          {exitingProducts.map((product) => (
            <ProductCard
              key={product.id}
              imageUrl={product.image_url}
              title={product.title}
              price={product.price}
              color={product.color}
              alt={product.title}
              product={product}
              isExpandedView={isExpandedView}
            />
          ))}
        </div>
      )}
      
      {/* Current grid - slides in from left */}
      {displayProducts.length > 0 && (
        <div 
          className={gridClasses}
          style={{ 
            ...gridStyle,
            transform: getEnteringTransform(),
            transition: transitionStyle,
          }}
        >
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              imageUrl={product.image_url}
              title={product.title}
              price={product.price}
              color={product.color}
              alt={product.title}
              product={product}
              isExpandedView={isExpandedView}
            />
          ))}
        </div>
      )}
    </div>
  )
}
