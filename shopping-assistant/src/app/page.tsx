import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ProductGrid } from '@/components/ProductGrid'
import { SearchProvider } from '@/contexts/SearchContext'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Sticky */}
      <Header />

      {/* SearchProvider wraps content that needs search context */}
      <SearchProvider>
        {/* Content: Sidebar + Main */}
        <div className="flex">
          {/* Sidebar - Sticky */}
          <Sidebar />

          {/* Main - Product Grid (scrollable) */}
          <main className="flex-1">
            <ProductGrid />
          </main>
        </div>
      </SearchProvider>
    </div>
  )
}
