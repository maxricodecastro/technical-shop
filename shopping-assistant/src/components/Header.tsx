'use client'

import Image from 'next/image'
import { useSearch } from '@/contexts/SearchContext'

interface HeaderProps {
  logoSize?: number
}

export function Header({ logoSize = 28 }: HeaderProps) {
  const { cartCount } = useSearch()

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="grid grid-cols-3 items-center w-full  px-4 sm:px-6 lg:px-4 py-4">
        {/* Left Navigation */}
        <nav className="flex items-center gap-4 text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
          <a href="#" className="underline">MENSWEAR</a>
          <a href="#" className="hover:underline">WOMENSWEAR</a>
          <a href="#" className="hover:underline">EVERYTHING ELSE</a>
          <a href="#" className="hover:underline">SEARCH</a>
        </nav>

        {/* Center Logo */}
        <div className="flex justify-center">
          <Image
            src="/ramp.svg"
            alt="RAMPLOGO"
            width={logoSize}
            height={logoSize * (110 / 540)} // Maintain aspect ratio (540:110)
            className="h-auto"
            priority
          />
        </div>

        {/* Right Navigation */}
        <nav className="flex items-center gap-4 justify-end text-[var(--font-size-base)] leading-[var(--line-height-base)] font-[var(--font-weight-regular)]">
          <a href="#" className="hover:underline">ENGLISH</a>
          <a href="#" className="hover:underline">LOGIN</a>
          <a href="#" className="hover:underline">WISHLIST</a>
          <a href="#" className="hover:underline">BAG({cartCount})</a>
        </nav>
      </div>
    </header>
  )
}
