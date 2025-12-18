import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ProductGrid } from '@/components/ProductGrid'
import { GridToggle } from '@/components/GridToggle'
import { SearchProvider } from '@/contexts/SearchContext'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* SearchProvider wraps content that needs search context */}
      <SearchProvider>
        {/* Header - Sticky */}
        <Header />

        {/* Content: Sidebar + Main */}
        <div className="flex">
          {/* Sidebar - Sticky */}
          <Sidebar />

          {/* Main - Product Grid (scrollable) */}
          <main className="flex-1 relative">
            <GridToggle />
            <ProductGrid />
          </main>
        </div>
      </SearchProvider>
    </div>
  )
}
