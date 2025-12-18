'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/catalyst/button'
import { Input } from '@/components/catalyst/input'
import { Badge, BadgeButton } from '@/components/catalyst/badge'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Text, Strong, Code } from '@/components/catalyst/text'
import { FilterChip, ChatResponse, Product, FilterState, initialFilterState } from '@/types'
import { applyFilters, applyChipToFilters, removeChipFromFilters } from '@/lib/filters/engine'
import productsData from '@/data/products.json'

// Type assertion for imported JSON
const allProducts = productsData as Product[]

export default function TestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ChatResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  
  // Track selected chips (active filters)
  const [selectedChips, setSelectedChips] = useState<FilterChip[]>([])

  // Convert selected chips to FilterState
  const currentFilters = useMemo(() => {
    return selectedChips.reduce((filters, chip) => {
      return applyChipToFilters(filters, chip)
    }, initialFilterState)
  }, [selectedChips])

  // Filter products based on selected chips
  const filteredProducts = useMemo(() => {
    if (selectedChips.length === 0) {
      return allProducts // Show all products when no filters
    }
    return applyFilters(allProducts, currentFilters)
  }, [selectedChips, currentFilters])

  // Handle chip click - toggle selection
  const handleChipClick = (chip: FilterChip) => {
    const isSelected = selectedChips.some(
      c => c.id === chip.id || (c.filterKey === chip.filterKey && c.filterValue === chip.filterValue)
    )
    
    if (isSelected) {
      // Deselect: remove from selected chips
      setSelectedChips(prev => prev.filter(
        c => !(c.id === chip.id || (c.filterKey === chip.filterKey && c.filterValue === chip.filterValue))
      ))
    } else {
      // Select: add to selected chips
      setSelectedChips(prev => [...prev, chip])
    }
  }

  // Check if a chip is selected
  const isChipSelected = (chip: FilterChip) => {
    return selectedChips.some(
      c => c.id === chip.id || (c.filterKey === chip.filterKey && c.filterValue === chip.filterValue)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setLastQuery(input)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || errorData.error || 'API request failed')
      }

      const data = await res.json() as ChatResponse
      setResult(data)
      
      // Auto-select all suggested chips when new response arrives
      if (data.suggestedChips && data.suggestedChips.length > 0) {
        setSelectedChips(data.suggestedChips)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setInput('') // Clear input after submit
    }
  }
  
  // Clear all and start fresh
  const handleClearAll = () => {
    setResult(null)
    setInput('')
    setLastQuery('')
    setError(null)
    setSelectedChips([])
  }

  // Clear only filters (keep result)
  const handleClearFilters = () => {
    setSelectedChips([])
  }

  // Quick test queries
  const quickTests = [
    'warm earth tones casual',
    'blue sweater',
    'something cozy for winter',
    'professional work outfit',
    'running clothes',
    'something nice',
    'dress like Jacob Elordi',
  ]

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <Heading className="mb-2 text-zinc-900">Simplified API Test Interface</Heading>
          <Text className="text-zinc-600">
            Test LLM filter generation • Select/deselect chips to test filtering • {allProducts.length} total products
          </Text>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter test query... (e.g., 'warm earth tones casual')"
              />
            </div>
            <Button type="submit" color="white" disabled={loading || !input.trim()}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Sending...
                </span>
              ) : (
                'Send'
              )}
            </Button>
          </div>

          {/* Quick Test Buttons */}
          <div className="flex flex-wrap gap-2">
            <Text className="mr-2 self-center text-xs text-zinc-500">Quick tests:</Text>
            {quickTests.map((query) => (
              <Button
                key={query}
                type="button"
                plain
                className="text-xs"
                onClick={() => setInput(query)}
              >
                {query}
              </Button>
            ))}
          </div>
        </form>

        {/* API Info */}
        <Section title="ℹ️ SIMPLIFIED API" color="zinc">
          <div className="space-y-2 text-sm">
            <Text><Strong>Request:</Strong> <Code>{`{ "message": "your query" }`}</Code></Text>
            <Text><Strong>Response:</Strong> <Code>{`{ "message": "...", "suggestedChips": [...] }`}</Code></Text>
            <Text className="text-zinc-500">Each request is independent - no conversation history, no price filtering.</Text>
          </div>
        </Section>

        {/* Error Display */}
        {error && (
          <Section title="❌ ERROR" color="red">
            <Text className="text-red-600">
              <Strong className="text-red-700">Error:</Strong> {error}
            </Text>
          </Section>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* User Input */}
            <Section title="📥 USER INPUT" color="zinc">
              <Code className="text-base text-zinc-800">{lastQuery}</Code>
            </Section>

            {/* AI Message */}
            <Section title="💬 AI RESPONSE MESSAGE" color="blue">
              <Text className="text-blue-900">{result.message}</Text>
            </Section>

            {/* Filter Chips - Selectable */}
            <Section title="🏷️ FILTER CHIPS (Click to select/deselect)" color="green">
              {result.suggestedChips && result.suggestedChips.length > 0 ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <Text className="text-green-700">
                      <Strong className="text-green-900">{selectedChips.length}</Strong> of{' '}
                      <Strong className="text-green-900">{result.suggestedChips.length}</Strong> chips selected
                    </Text>
                    {selectedChips.length > 0 && (
                      <Button plain onClick={handleClearFilters} className="text-xs text-zinc-500 hover:text-zinc-700">
                        Clear Filters
                      </Button>
                    )}
                  </div>
                  
                  {/* Group chips by type */}
                  <div className="space-y-3">
                    {groupChipsByType(result.suggestedChips).map(([type, chips]) => (
                      <div key={type}>
                        <Text className="mb-1 text-xs font-medium uppercase text-zinc-500">{type}</Text>
                        <div className="flex flex-wrap gap-2">
                          {chips.map((chip, i) => {
                            const selected = isChipSelected(chip)
                            return (
                              <SelectableChip 
                                key={i} 
                                chip={chip} 
                                selected={selected}
                                onClick={() => handleChipClick(chip)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <details className="group mt-4">
                    <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700">
                      Show JSON
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-green-50 p-3 text-xs text-green-800">
                      {JSON.stringify(result.suggestedChips, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <Text className="italic text-zinc-500">No chips suggested</Text>
              )}
            </Section>

            {/* Filtered Products */}
            <Section title={`📦 FILTERED PRODUCTS (${filteredProducts.length} of ${allProducts.length})`} color="purple">
              {selectedChips.length > 0 ? (
                <div className="mb-3">
                  <Text className="text-sm text-purple-700">
                    Showing products matching <Strong>{selectedChips.length}</Strong> active filter{selectedChips.length !== 1 ? 's' : ''}
                  </Text>
                </div>
              ) : (
                <div className="mb-3">
                  <Text className="text-sm text-purple-700">
                    No filters selected - showing all products
                  </Text>
                </div>
              )}
              
              {filteredProducts.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <Text className="italic text-zinc-500">No products match the selected filters</Text>
              )}
            </Section>

            {/* Invalid Chips */}
            {result.invalid && result.invalid.length > 0 && (
              <Section title="❌ INVALID CHIPS (dropped)" color="red">
                <div className="mb-4 flex flex-wrap gap-2">
                  {result.invalid.map((chip, i) => (
                    <ChipDisplay key={i} chip={chip} invalid />
                  ))}
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700">
                    Show JSON
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
                    {JSON.stringify(result.invalid, null, 2)}
                  </pre>
                </details>
              </Section>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <Section title="⚠️ VALIDATION ERRORS" color="amber">
                <ul className="list-inside list-disc space-y-1 text-sm text-amber-700">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Clear Button */}
            <div className="flex justify-center">
              <Button plain onClick={handleClearAll} className="text-zinc-500 hover:text-zinc-700">
                Clear All Results
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function groupChipsByType(chips: FilterChip[]): [string, FilterChip[]][] {
  const grouped: Record<string, FilterChip[]> = {}
  
  for (const chip of chips) {
    if (!grouped[chip.type]) {
      grouped[chip.type] = []
    }
    grouped[chip.type].push(chip)
  }
  
  // Return in a specific order
  const typeOrder = ['occasion', 'subcategory', 'material', 'color', 'style_tag', 'size']
  const result: [string, FilterChip[]][] = []
  
  for (const type of typeOrder) {
    if (grouped[type]) {
      result.push([type, grouped[type]])
    }
  }
  
  // Add any remaining types not in the order
  for (const [type, chips] of Object.entries(grouped)) {
    if (!typeOrder.includes(type)) {
      result.push([type, chips])
    }
  }
  
  return result
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: 'zinc' | 'blue' | 'green' | 'red' | 'amber' | 'purple'
  children: React.ReactNode
}) {
  const colors = {
    zinc: 'border-zinc-200 bg-zinc-50',
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    red: 'border-red-200 bg-red-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    purple: 'border-purple-200 bg-purple-50/50',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <Subheading className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
        {title}
      </Subheading>
      {children}
    </div>
  )
}

function ChipDisplay({ chip, invalid }: { chip: FilterChip; invalid?: boolean }) {
  const chipColors: Record<string, 'indigo' | 'zinc' | 'amber' | 'violet' | 'sky' | 'emerald' | 'teal'> = {
    subcategory: 'indigo',
    occasion: 'teal',
    color: 'zinc',
    material: 'amber',
    style_tag: 'violet',
    size: 'sky',
  }

  const badgeColor = invalid ? 'red' : chipColors[chip.type] || 'zinc'

  return (
    <Badge color={badgeColor} className={invalid ? 'line-through opacity-60' : ''}>
      {chip.label}
    </Badge>
  )
}

function SelectableChip({ 
  chip, 
  selected, 
  onClick 
}: { 
  chip: FilterChip
  selected: boolean
  onClick: () => void
}) {
  const chipColors: Record<string, 'indigo' | 'zinc' | 'amber' | 'violet' | 'sky' | 'emerald' | 'teal'> = {
    subcategory: 'indigo',
    occasion: 'teal',
    color: 'zinc',
    material: 'amber',
    style_tag: 'violet',
    size: 'sky',
  }

  const baseColor = chipColors[chip.type] || 'zinc'

  return (
    <BadgeButton 
      color={baseColor}
      onClick={onClick}
      className={`cursor-pointer transition-all ${
        selected 
          ? 'ring-2 ring-offset-1 ring-indigo-500 font-semibold opacity-100' 
          : 'opacity-60 hover:opacity-100'
      }`}
    >
      {selected && <span className="mr-1">✓</span>}
      {chip.label}
    </BadgeButton>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-sm border border-purple-200">
      <div className="flex-1">
        <div className="font-medium text-purple-900">{product.title}</div>
        <div className="text-xs text-purple-600 mt-1">{product.subcategory}</div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Badge color="purple">{product.color}</Badge>
        <Badge color="amber">{product.material}</Badge>
        {product.occasion.length > 0 && (
          <Badge color="teal">{product.occasion[0]}</Badge>
        )}
        {product.style_tags.length > 0 && (
          <Badge color="violet">{product.style_tags[0]}</Badge>
        )}
        <span className="font-medium text-purple-700 ml-2">
          ${product.price}
        </span>
        {product.in_stock ? (
          <Badge color="emerald">In Stock</Badge>
        ) : (
          <Badge color="red">Out of Stock</Badge>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
