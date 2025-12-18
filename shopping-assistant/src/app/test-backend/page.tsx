'use client'

import { useState } from 'react'
import { Button } from '@/components/catalyst/button'
import { Input } from '@/components/catalyst/input'
import { Badge, BadgeButton } from '@/components/catalyst/badge'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Text, Strong, Code } from '@/components/catalyst/text'
import { FilterChip, Product, Message, IntentMode, ReplaceCategory } from '@/types'

interface TestResult {
  raw: string
  parsed?: { message: string; priceQuestion?: string } | null
  suggestedChips: FilterChip[]
  intentMode: IntentMode
  replaceCategories: ReplaceCategory[]
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]
  minPrice?: number | null  // Extracted minimum price for slider
  maxPrice?: number | null  // Extracted maximum price for slider
  appliedFilters?: {        // State sync verification data
    suggestedChipCount: number
    effectiveMinPrice: number | null
    effectiveMaxPrice: number | null
    totalProductsBeforeFilter: number
    totalProductsAfterFilter: number
  }
}

export default function TestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  
  // Track selected chips separately
  const [selectedChips, setSelectedChips] = useState<FilterChip[]>([])
  const [suggestedChips, setSuggestedChips] = useState<FilterChip[]>([])
  
  // Track conversation history for multi-turn context
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  
  // Price range state - controlled by LLM extraction or manual adjustment
  const CATALOG_MIN_PRICE = 0
  const CATALOG_MAX_PRICE = 275
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: CATALOG_MIN_PRICE,
    max: CATALOG_MAX_PRICE,
  })

  // Check if a chip is currently selected
  const isChipSelected = (chip: FilterChip) => {
    return selectedChips.some(c => c.filterValue === chip.filterValue && c.type === chip.type)
  }

  /**
   * Handles intent mode from LLM response.
   * Clears appropriate chips/state based on intentMode and replaceCategories.
   * 
   * @param intentMode - 'replace' | 'refine' | 'explore'
   * @param replaceCategories - Categories to clear when intentMode is 'replace'
   * @returns Updated selectedChips array
   */
  const handleIntentMode = (
    intentMode: IntentMode,
    replaceCategories: ReplaceCategory[]
  ): FilterChip[] => {
    // For 'refine' or 'explore', keep all existing state
    if (intentMode !== 'replace') {
      console.log('[DEBUG] Intent mode:', intentMode, '- keeping existing state')
      return selectedChips
    }

    // For 'replace', check what categories to clear
    console.log('[DEBUG] Intent mode: replace, categories to clear:', replaceCategories)

    // If 'all' is in replaceCategories, clear everything INCLUDING price
    if (replaceCategories.includes('all')) {
      console.log('[DEBUG] Clearing ALL selected chips and resetting price')
      setPriceRange({ min: CATALOG_MIN_PRICE, max: CATALOG_MAX_PRICE })
      return []
    }

    // If 'all_except_price' is present, clear chips but NOT price
    if (replaceCategories.includes('all_except_price')) {
      console.log('[DEBUG] Clearing ALL chips but preserving price range')
      return []
    }

    // If 'price' is explicitly in replaceCategories, reset price only (keep chips)
    if (replaceCategories.includes('price')) {
      console.log('[DEBUG] Resetting price range only, keeping chips')
      setPriceRange({ min: CATALOG_MIN_PRICE, max: CATALOG_MAX_PRICE })
      // Don't return early - continue to process other category clears if any
    }

    // Map replaceCategories to chip types
    const categoryToChipType: Record<ReplaceCategory, string | null> = {
      'all': null, // Handled above
      'all_except_price': null, // Handled above
      'subcategory': 'subcategory',
      'occasions': 'occasion',
      'materials': 'material',
      'colors': 'color',
      'style_tags': 'style_tag',
      'sizes': 'size',
      'price': null, // Handled above (price is not a chip)
    }

    // Filter out chips that match the categories being replaced
    const typesToClear = replaceCategories
      .map(cat => categoryToChipType[cat])
      .filter((type): type is string => type !== null)

    console.log('[DEBUG] Chip types to clear:', typesToClear)

    const remainingChips = selectedChips.filter(chip => !typesToClear.includes(chip.type))
    console.log('[DEBUG] Chips remaining after clear:', remainingChips.length)

    return remainingChips
  }

  // Handle chip click - toggle selection
  const handleChipClick = (chip: FilterChip) => {
    if (isChipSelected(chip)) {
      // Deselect: remove from selected, add back to suggested
      setSelectedChips(prev => prev.filter(c => 
        !(c.filterValue === chip.filterValue && c.type === chip.type)
      ))
      setSuggestedChips(prev => [chip, ...prev])
    } else {
      // Select: remove from suggested, add to selected
      setSuggestedChips(prev => prev.filter(c => 
        !(c.filterValue === chip.filterValue && c.type === chip.type)
      ))
      setSelectedChips(prev => [...prev, chip])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setLastQuery(input)

    // Create user message for history
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          conversationHistory: conversationHistory, // Pass full conversation context
          selectedChips: selectedChips, // Pass selected chips to avoid duplicates
          currentPriceRange: {
            min: priceRange.min,
            max: priceRange.max,
            isDefault: priceRange.min === CATALOG_MIN_PRICE && priceRange.max === CATALOG_MAX_PRICE,
          },
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const data = await res.json() as TestResult
      setResult(data)
      
      // Handle intent mode - clear appropriate chips based on LLM's intent detection
      const intentMode = data.intentMode || 'refine'
      const replaceCategories = data.replaceCategories || []
      
      console.log('[DEBUG] Received intentMode:', intentMode, 'replaceCategories:', replaceCategories)
      
      // Apply intent mode to update selected chips
      const updatedSelectedChips = handleIntentMode(intentMode, replaceCategories)
      setSelectedChips(updatedSelectedChips)
      
      // Update suggested chips with new response
      setSuggestedChips(data.suggestedChips || [])
      
      // Handle extracted price values - update slider with conflict resolution
      const newMinPrice = data.minPrice ?? null
      const newMaxPrice = data.maxPrice ?? null
      
      if (newMinPrice !== null || newMaxPrice !== null) {
        setPriceRange(prev => {
          let updatedMin = prev.min
          let updatedMax = prev.max
          
          // Case 1: Both prices received from LLM
          if (newMinPrice !== null && newMaxPrice !== null) {
            if (newMinPrice > newMaxPrice) {
              // Invalid range from LLM - ignore both
              console.warn('[PRICE CONFLICT] LLM returned invalid range: min=', newMinPrice, '> max=', newMaxPrice, '- ignoring both')
              return prev
            }
            // Valid range - apply both
            updatedMin = newMinPrice
            updatedMax = newMaxPrice
            console.log('[DEBUG] Applied price range:', updatedMin, '-', updatedMax)
          }
          // Case 2: Only minPrice received
          else if (newMinPrice !== null) {
            // If new min > current max, reset max to catalog max
            if (newMinPrice > prev.max) {
              console.log('[PRICE CONFLICT] New minPrice', newMinPrice, '> current maxPrice', prev.max, '- resetting max to', CATALOG_MAX_PRICE)
              updatedMax = CATALOG_MAX_PRICE
            }
            updatedMin = newMinPrice
            console.log('[DEBUG] Updated minPrice to:', updatedMin, 'maxPrice:', updatedMax)
          }
          // Case 3: Only maxPrice received
          else if (newMaxPrice !== null) {
            // If new max < current min, reset min to catalog min
            if (newMaxPrice < prev.min) {
              console.log('[PRICE CONFLICT] New maxPrice', newMaxPrice, '< current minPrice', prev.min, '- resetting min to', CATALOG_MIN_PRICE)
              updatedMin = CATALOG_MIN_PRICE
            }
            updatedMax = newMaxPrice
            console.log('[DEBUG] Updated maxPrice to:', updatedMax, 'minPrice:', updatedMin)
          }
          
          return { min: updatedMin, max: updatedMax }
        })
      }

      // Create assistant message for history
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.parsed?.message || 'Here are some suggestions based on your request.',
        suggestedChips: data.suggestedChips || [],
        priceQuestion: data.parsed?.priceQuestion,
        timestamp: Date.now(),
      }

      // Add both messages to conversation history
      setConversationHistory(prev => [...prev, userMessage, assistantMessage])
      
      // State sync verification (dev mode only)
      if (process.env.NODE_ENV === 'development' && data.appliedFilters) {
        const frontendChipCount = selectedChips.length + (data.suggestedChips?.length || 0)
        const backendChipCount = data.appliedFilters.suggestedChipCount
        
        if (frontendChipCount !== backendChipCount) {
          console.warn('[STATE SYNC] Chip count mismatch:', {
            frontend: frontendChipCount,
            backend: backendChipCount,
            selectedChips: selectedChips.length,
            suggestedChips: data.suggestedChips?.length || 0,
          })
        }
        
        console.log('[FILTER STATE]', {
          priceRange: `${data.appliedFilters.effectiveMinPrice ?? 0} - ${data.appliedFilters.effectiveMaxPrice ?? 275}`,
          productsFiltered: `${data.appliedFilters.totalProductsBeforeFilter} → ${data.appliedFilters.totalProductsAfterFilter}`,
          chips: backendChipCount,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Still add user message to history even on error (shows what they asked)
      setConversationHistory(prev => [...prev, userMessage])
    } finally {
      setLoading(false)
      setInput('') // Clear input after submit
    }
  }
  
  // Clear all selections and start fresh
  const handleClearAll = () => {
    setSelectedChips([])
    setSuggestedChips([])
    setResult(null)
    setInput('')
    setLastQuery('')
    setConversationHistory([]) // Clear conversation context
    setError(null)
    setPriceRange({ min: CATALOG_MIN_PRICE, max: CATALOG_MAX_PRICE }) // Reset price
  }

  // Quick test queries
  const quickTests = [
    'warm earth tones casual',
    'blue sweater',
    'something cozy for winter',
    'professional work outfit',
    'something nice',
  ]

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <Heading className="mb-2 text-zinc-900">Prompt Test Interface</Heading>
          <Text className="text-zinc-600">
            Test LLM filter generation • See raw outputs • Validate against catalog
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

        {/* Conversation History - Shows context being passed to LLM */}
        {conversationHistory.length > 0 && (
          <Section title="💬 CONVERSATION CONTEXT" color="zinc">
            <Text className="mb-3 text-xs text-zinc-500">
              This context is sent to the LLM with each request ({conversationHistory.length} messages)
            </Text>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {conversationHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-50 border-l-2 border-blue-400'
                      : 'bg-green-50 border-l-2 border-green-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Strong className={msg.role === 'user' ? 'text-blue-700' : 'text-green-700'}>
                      {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                    </Strong>
                    <span className="text-xs text-zinc-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Text className="text-zinc-700">{msg.content}</Text>
                </div>
              ))}
            </div>
          </Section>
        )}

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

            {/* Intent Mode Display */}
            <Section title="🎯 INTENT MODE" color="zinc">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Strong className="text-zinc-700">Mode:</Strong>
                  <Badge 
                    color={
                      result.intentMode === 'replace' ? 'red' : 
                      result.intentMode === 'explore' ? 'amber' : 
                      'green'
                    }
                  >
                    {result.intentMode || 'refine'}
                  </Badge>
                </div>
                {result.intentMode === 'replace' && result.replaceCategories && result.replaceCategories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Strong className="text-zinc-700">Clearing:</Strong>
                    {result.replaceCategories.map((cat, i) => (
                      <Badge key={i} color="red">{cat}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Text className="mt-2 text-xs text-zinc-500">
                {result.intentMode === 'replace' 
                  ? 'User is changing preferences - clearing specified categories'
                  : result.intentMode === 'explore'
                  ? 'User wants alternatives - keeping existing state'
                  : 'User is adding/refining - keeping existing state'}
              </Text>
            </Section>

            {/* Price Range Display */}
            <Section title="💰 PRICE RANGE" color="green">
              <div className="space-y-4">
                {/* Extracted prices from LLM */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Strong className="text-zinc-700">Extracted Min:</Strong>
                    <Badge color={result.minPrice !== null && result.minPrice !== undefined ? 'emerald' : 'zinc'}>
                      {result.minPrice !== null && result.minPrice !== undefined ? `$${result.minPrice}` : 'Not set'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Strong className="text-zinc-700">Extracted Max:</Strong>
                    <Badge color={result.maxPrice !== null && result.maxPrice !== undefined ? 'emerald' : 'zinc'}>
                      {result.maxPrice !== null && result.maxPrice !== undefined ? `$${result.maxPrice}` : 'Not set'}
                    </Badge>
                  </div>
                </div>
                
                {/* Current slider state */}
                <div className="flex items-center gap-4">
                  <Strong className="text-zinc-700">Current Range:</Strong>
                  <Badge color="emerald">
                    ${priceRange.min} - ${priceRange.max}
                  </Badge>
                  {(priceRange.min > CATALOG_MIN_PRICE || priceRange.max < CATALOG_MAX_PRICE) && (
                    <Button 
                      plain 
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                      onClick={() => setPriceRange({ min: CATALOG_MIN_PRICE, max: CATALOG_MAX_PRICE })}
                    >
                      Reset to full range
                    </Button>
                  )}
                </div>

                {/* Simple slider controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-600">Min: $</Text>
                    <input
                      type="number"
                      min={CATALOG_MIN_PRICE}
                      max={priceRange.max}
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ 
                        ...prev, 
                        min: Math.min(Number(e.target.value), prev.max) 
                      }))}
                      className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-zinc-600">Max: $</Text>
                    <input
                      type="number"
                      min={priceRange.min}
                      max={CATALOG_MAX_PRICE}
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ 
                        ...prev, 
                        max: Math.max(Number(e.target.value), prev.min) 
                      }))}
                      className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </div>
                </div>

                <Text className="text-xs text-zinc-500">
                  Catalog range: ${CATALOG_MIN_PRICE} - ${CATALOG_MAX_PRICE}
                </Text>
              </div>
            </Section>

            {/* Raw LLM Response */}
            <Section title="🤖 RAW LLM RESPONSE" color="blue">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                {result.raw}
              </pre>
            </Section>

            {/* Filter Chips - Selected first, then Suggested */}
            <Section title="🏷️ FILTER CHIPS" color="green">
              {(selectedChips.length > 0 || suggestedChips.length > 0) ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {/* Selected chips first (highlighted) */}
                    {selectedChips.map((chip, i) => (
                      <SelectableChip 
                        key={`selected-${i}`} 
                        chip={chip} 
                        isSelected={true}
                        onClick={() => handleChipClick(chip)}
                      />
                    ))}
                    {/* Visual separator if both exist */}
                    {selectedChips.length > 0 && suggestedChips.length > 0 && (
                      <div className="mx-2 h-6 w-px bg-zinc-300" />
                    )}
                    {/* Suggested chips (normal) */}
                    {suggestedChips.map((chip, i) => (
                      <SelectableChip 
                        key={`suggested-${i}`} 
                        chip={chip} 
                        isSelected={false}
                        onClick={() => handleChipClick(chip)}
                      />
                    ))}
                  </div>
                  {selectedChips.length > 0 && (
                    <div className="mb-3 flex items-center gap-2">
                      <Text className="text-xs text-zinc-500">
                        <Strong>{selectedChips.length}</Strong> selected
                      </Text>
                      <Button plain className="text-xs text-zinc-500 hover:text-zinc-700" onClick={handleClearAll}>
                        Clear all
                      </Button>
                    </div>
                  )}
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700">
                      Show JSON
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-green-50 p-3 text-xs text-green-800">
                      {JSON.stringify({ selected: selectedChips, suggested: suggestedChips }, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <Text className="italic text-zinc-500">No chips yet - send a query to get suggestions</Text>
              )}
            </Section>

            {/* Invalid Chips */}
            <Section title="❌ INVALID CHIPS (dropped)" color="red">
              {result.invalid.length > 0 ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {result.invalid.map((chip, i) => (
                      <ChipDisplay key={i} chip={chip} valid={false} />
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
                </>
              ) : (
                <Text className="italic text-zinc-500">All chips valid ✓</Text>
              )}
            </Section>

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

            {/* Matching Products */}
            {result.matchingProducts && result.matchingProducts.length > 0 && (
              <Section title="📦 MATCHING PRODUCTS" color="purple">
                <Text className="mb-3 text-purple-700">
                  <Strong className="text-purple-900">
                    {result.matchingProducts.length}
                  </Strong>{' '}
                  products match these filters
                </Text>
                <div className="space-y-2">
                  {result.matchingProducts.slice(0, 5).map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-sm"
                    >
                      <span className="text-purple-900">{p.title}</span>
                      <div className="flex items-center gap-3">
                        <Badge color="purple">{p.color}</Badge>
                        <Badge color="zinc">{p.material}</Badge>
                        <span className="font-medium text-purple-700">
                          ${p.price}
                        </span>
                      </div>
                    </div>
                  ))}
                  {result.matchingProducts.length > 5 && (
                    <Text className="text-zinc-500">
                      ...and {result.matchingProducts.length - 5} more
                    </Text>
                  )}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
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

function ChipDisplay({ chip, valid }: { chip: FilterChip; valid: boolean }) {
  const chipColors: Record<string, 'indigo' | 'zinc' | 'amber' | 'violet' | 'sky' | 'emerald' | 'teal'> = {
    subcategory: 'indigo',
    occasion: 'teal',
    color: 'zinc',
    material: 'amber',
    style_tag: 'violet',
    size: 'sky',
    price_range: 'emerald',
  }

  const badgeColor = valid ? chipColors[chip.type] || 'zinc' : 'red'

  return (
    <Badge color={badgeColor} className={!valid ? 'line-through opacity-60' : ''}>
      <span className="text-xs opacity-60">{chip.type}:</span> {chip.label}
    </Badge>
  )
}

function SelectableChip({ 
  chip, 
  isSelected, 
  onClick 
}: { 
  chip: FilterChip
  isSelected: boolean
  onClick: () => void
}) {
  const chipColors: Record<string, 'indigo' | 'zinc' | 'amber' | 'violet' | 'sky' | 'emerald' | 'teal'> = {
    subcategory: 'indigo',
    occasion: 'teal',
    color: 'zinc',
    material: 'amber',
    style_tag: 'violet',
    size: 'sky',
    price_range: 'emerald',
  }

  const baseColor = chipColors[chip.type] || 'zinc'

  return (
    <BadgeButton 
      color={baseColor}
      onClick={onClick}
      className={`cursor-pointer transition-all ${
        isSelected 
          ? 'ring-2 ring-offset-1 ring-indigo-500 font-semibold' 
          : 'opacity-70 hover:opacity-100'
      }`}
    >
      {isSelected && <span className="mr-1">✓</span>}
      <span className="text-xs opacity-60">{chip.type}:</span> {chip.label}
    </BadgeButton>
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

