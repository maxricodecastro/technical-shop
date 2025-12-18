'use client'

import { ProductCard } from './ProductCard'
import { useSearch } from '@/contexts/SearchContext'

export function ProductGrid() {
  const { filteredProducts, status } = useSearch()
  // Future: show skeleton when status === 'loading'
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-8 py-4" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            imageUrl={product.image_url}
            title={product.title}
            price={product.price}
            color={product.color}
            alt={product.title}
          />
        ))}
      </div>
    </div>
  )
}
