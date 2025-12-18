import Image from 'next/image'

interface ProductCardProps {
  imageUrl: string
  title: string
  price: number
  color: string
  alt?: string
}

export function ProductCard({ imageUrl, title, price, color, alt }: ProductCardProps) {
  return (
    <div className="flex flex-col">
      {/* Photo */}
      <div className="w-full max-w-[200px] relative mb-2" style={{ aspectRatio: '640 / 1200' }}>
        <Image
          src={imageUrl}
          alt={alt || title}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
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

