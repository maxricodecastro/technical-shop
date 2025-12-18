'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { useSearch } from '@/contexts/SearchContext'

interface ProductCardProps {
  imageUrl: string
  title: string
  price: number
  color: string
  alt?: string
  product?: Product
  isExpandedView?: boolean
}

export function ProductCard({ imageUrl, title, price, color, alt, product, isExpandedView = false }: ProductCardProps) {
  const { addToCart, removeFromCart, isInCart } = useSearch()
  
  const productInCart = product ? isInCart(product.id) : false
  
  // Scale factor: 4 columns = 1.0, 3 columns = 4/3 = 1.333...
  // Only scale the image, not the text
  const scaleFactor = isExpandedView ? 4 / 3 : 1
  const maxWidth = 200 * scaleFactor

  const handleToggleCart = () => {
    if (!product) return
    
    if (productInCart) {
      removeFromCart(product.id)
    } else {
      addToCart(product)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Photo */}
      <div 
        className="relative mb-2 group cursor-pointer transition-all duration-300 ease-in-out" 
        style={{ 
          aspectRatio: '640 / 1200',
          width: `${maxWidth}px`,
        }}
      >
        <Image
          src={imageUrl}
          alt={alt || title}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Hover Overlay */}
        <div 
          className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity duration-200"
          onClick={handleToggleCart}
        >
          <span className="text-black uppercase font-[var(--font-weight-regular)] text-[var(--font-size-base)] leading-[var(--line-height-base)]">
            {productInCart ? 'REMOVE' : 'ADD TO CART'}
          </span>
        </div>
      </div>

      {/* Title - All Caps */}
      <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] uppercase">
        {title}
      </div>

      {/* Color - All Caps */}
      <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)] uppercase">
        {color}
      </div>

      {/* Price */}
      <div className="text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
        ${price}
      </div>
    </div>
  )
}

