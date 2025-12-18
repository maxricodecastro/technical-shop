'use client'

import { ProductCard } from './ProductCard'
import { Product } from '@/types'
import { useSearch } from '@/contexts/SearchContext'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  const { status } = useSearch()
  // Future: show skeleton when status === 'loading'
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-8 py-4" style={{ paddingLeft: '120px', paddingRight: '120px' }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            imageUrl={product.image_url}
            title={product.title}
            price={product.price}
            alt={product.title}
          />
        ))}
      </div>
    </div>
  )
}

