'use client'

import { useState } from 'react'
import { Button } from '@/components/catalyst/button'
import { Input } from '@/components/catalyst/input'
import { Badge } from '@/components/catalyst/badge'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Text, Strong, Code } from '@/components/catalyst/text'
import { FilterChip, Product } from '@/types'

interface TestResult {
  raw: string
  validated: FilterChip[]
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]
}

export default function TestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')

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
        throw new Error(errorData.error || 'API request failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
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

            {/* Raw LLM Response */}
            <Section title="🤖 RAW LLM RESPONSE" color="blue">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                {result.raw}
              </pre>
            </Section>

            {/* Valid Chips */}
            <Section title="✅ VALID CHIPS" color="green">
              {result.validated.length > 0 ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {result.validated.map((chip, i) => (
                      <ChipDisplay key={i} chip={chip} valid />
                    ))}
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700">
                      Show JSON
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-green-50 p-3 text-xs text-green-800">
                      {JSON.stringify(result.validated, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <Text className="italic text-zinc-500">No valid chips</Text>
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
  const chipColors: Record<string, 'indigo' | 'zinc' | 'amber' | 'violet' | 'sky' | 'emerald'> = {
    subcategory: 'indigo',
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
