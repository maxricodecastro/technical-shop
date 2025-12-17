# Shopping Assistant - API Documentation

## Overview

This document details the external APIs used in the Shopping Assistant application. As outlined in the Architecture document, this is a **frontend-only Next.js application** that uses two AI services:

1. **Groq** - Fast LLM inference for filter generation (primary AI engine)
2. **OpenAI** - GPT-4o Vision for image analysis only

**Security Note:** This project is intentionally loose on security for rapid development. API keys are exposed below.

---

## API Keys

```bash
# Groq - LLM for filter generation
GROQ_API_KEY=your_groq_api_key_here

# OpenAI - GPT-4o Vision for image analysis
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 1. Groq API

### Purpose in Architecture

Groq is the **primary AI engine** for the shopping assistant. It handles:
- `/api/chat` - Main filter generation from user messages
- `/api/regenerate` - Alternative filter suggestions
- `/api/similar` - Similar product suggestions when filters return zero results

### Why Groq?

Groq uses custom Language Processing Units (LPUs) for extremely fast inference. This is critical for our UX where users expect near-instant filter suggestions after typing a message.

### Model

```
llama-3.3-70b-versatile
```

This is Meta's Llama 3.3 70B parameter model, optimized for versatile tasks including JSON generation and following complex instructions.

**Note:** The previous model `llama-3.3-70b-versatile` was decommissioned by Groq in late 2024.

### Installation

```bash
npm install groq-sdk
```

### Basic Usage (TypeScript)

```typescript
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: 'your_groq_api_key_here'
})

const chatCompletion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful shopping assistant.'
    },
    {
      role: 'user',
      content: 'I want a cozy blue sweater'
    }
  ],
  temperature: 0.7,
  max_tokens: 1024,
})

console.log(chatCompletion.choices[0].message.content)
```

### Integration with UserInputFlow

From `UserInputFlow.md`, Groq is called in Step 3 of the user input flow:

```typescript
// /api/chat/route.ts

import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // or hardcoded key
})

export async function POST(request: Request) {
  const { userMessage, conversationHistory, currentFilters } = await request.json()
  
  // Get catalog facets for the prompt
  const catalogFacets = getCatalogFacets()
  
  // Build system prompt with available filters
  const systemPrompt = buildFilterGenerationPrompt(catalogFacets, currentFilters)
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })
  
  const rawContent = completion.choices[0].message.content || ''
  
  // Validate with Zod and return
  const validated = parseAndValidateLLMResponse(rawContent, catalogFacets)
  return Response.json(validated.data)
}
```

### Key Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `model` | `llama-3.3-70b-versatile` | Best balance of speed and capability |
| `temperature` | `0.7` (chat), `0.9` (regenerate) | Higher for more variety |
| `max_tokens` | `1024` | Enough for JSON response with 15-20 chips |

### Rate Limits

Groq has generous rate limits for development:
- Requests per minute: 30 (free tier)
- Tokens per minute: 6,000 (free tier)

For production, consider upgrading to a paid plan.

### API Reference

- Documentation: https://console.groq.com/docs/quickstart
- OpenAI Compatibility: https://console.groq.com/docs/openai
- Models: https://console.groq.com/docs/models

---

## 2. OpenAI API

### Purpose in Architecture

OpenAI is used **only for image analysis** via GPT-4o Vision. When a user uploads an image (e.g., "find me something like this"), we use GPT-4o to describe the image, then pass that description to Groq for filter generation.

### Why OpenAI?

GPT-4o has superior vision capabilities compared to open-source alternatives. Since image analysis is a less frequent operation than chat, the slightly higher latency is acceptable.

### Model

```
gpt-4o
```

GPT-4o is OpenAI's multimodal model that can understand both text and images.

### Installation

```bash
npm install openai
```

### Basic Usage (TypeScript)

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'your_openai_api_key_here'
})

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Describe this image for a shopping assistant.'
        },
        {
          type: 'image_url',
          image_url: {
            url: 'data:image/jpeg;base64,/9j/4AAQ...'  // Base64 encoded image
          }
        }
      ]
    }
  ],
  max_tokens: 300,
})

console.log(response.choices[0].message.content)
```

### Integration with UserInputFlow

From `UserInputFlow.md`, OpenAI is used in the Image Upload flow:

```typescript
// /api/vision/route.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // or hardcoded key
})

export async function POST(request: Request) {
  const { imageBase64 } = await request.json()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe this image for a shopping assistant. Focus on:
- What type of item is this? (clothing, furniture, etc.)
- Colors present
- Style/aesthetic (modern, vintage, casual, formal, etc.)
- Material if visible
- Any other relevant shopping attributes

Be concise. Format as a shopping query.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  })
  
  return Response.json({
    description: response.choices[0].message.content,
  })
}
```

### Image Upload Flow

```
User uploads image
        │
        ▼
┌─ PromptInput ───────────────┐
│  Convert image to base64    │
│  Show preview with X button │
└─────────────┬───────────────┘
              │
User clicks Send
              │
              ▼
┌─ /api/vision (GPT-4o) ──────┐
│  "A modern blue velvet sofa │
│   with clean lines"         │
└─────────────┬───────────────┘
              │
              ▼
┌─ /api/chat (Groq) ──────────┐
│  Takes GPT-4o description   │
│  Generates filter chips     │
└─────────────────────────────┘
```

### Key Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `model` | `gpt-4o` | Multimodal model with vision |
| `max_tokens` | `300` | Short description is sufficient |
| `image_url.url` | `data:image/jpeg;base64,...` | Base64 encoded image |

### Supported Image Formats

- JPEG
- PNG  
- GIF
- WebP

### Rate Limits

OpenAI has tiered rate limits based on usage:
- Tier 1 (new accounts): 500 RPM, 30,000 TPM
- Images count toward token limits based on size

### API Reference

- Documentation: https://platform.openai.com/docs/api-reference
- Vision Guide: https://platform.openai.com/docs/guides/vision
- Models: https://platform.openai.com/docs/models

---

## API Routes Summary

| Route | Service | Model | Purpose |
|-------|---------|-------|---------|
| `/api/chat` | Groq | llama-3.3-70b-versatile | Convert user message → filter chips |
| `/api/regenerate` | Groq | llama-3.3-70b-versatile | Alternative filter suggestions |
| `/api/vision` | OpenAI | gpt-4o | Describe uploaded image |
| `/api/similar` | Groq | llama-3.3-70b-versatile | Suggest alternatives for zero results |

### `/api/chat` Request/Response (Phase 2)

**Request:**
```typescript
interface ChatRequest {
  message: string
  conversationHistory?: Message[]
  currentFilters?: FilterState
  selectedChips?: FilterChip[]  // Chips user has selected (won't be re-suggested)
  currentPriceRange?: {         // Current price slider state (manual or LLM-set)
    min: number
    max: number
    isDefault: boolean          // True if price range hasn't been modified
  }
}
```

**Response:**
```typescript
interface ChatResponse {
  raw: string
  parsed: LLMResponse | null
  suggestedChips: FilterChip[]  // NEW chips only (excludes selectedChips)
  invalid: FilterChip[]
  errors: string[]
  matchingProducts?: Product[]  // Pre-filtered by occasion, then OR logic for other chips
  minPrice?: number | null       // LLM-extracted minimum price for slider update
  maxPrice?: number | null       // LLM-extracted maximum price for slider update
  appliedFilters?: {             // State sync verification (what backend actually used)
    suggestedChipCount: number
    effectiveMinPrice: number | null
    effectiveMaxPrice: number | null
    totalProductsBeforeFilter: number
    totalProductsAfterFilter: number
  }
}
```

The API filters out any chips that match `selectedChips` values, ensuring no duplicates.

**Matching Products Logic:**
- If occasion chips are present, products are pre-filtered to only those matching at least one occasion (hard gate)
- Price filters (minPrice/maxPrice) are applied if extracted from user query
- Then OR logic applies for other chips within that filtered set
- This ensures queries like "running outfit" only show athletic products, not casual pants that happen to match a subcategory

**Price Extraction:**
- The LLM extracts price values ONLY from explicit dollar amounts (e.g., "budget is $200" → maxPrice: 200)
- Subjective terms like "luxury", "budget-friendly", "premium" do NOT trigger price extraction
- If frontend has a non-default price range (manual slider adjustment), API uses it unless LLM extracts new values
- LLM-extracted prices override frontend state
- Price is controlled via a slider component, not filter chips
- Price range is inferred from prompts: "budget is $X" → $0 to $X, "minimum $X" → $X to max

**Price Conflict Resolution (Frontend):**
- If new minPrice > current maxPrice → reset maxPrice to catalog max (275)
- If new maxPrice < current minPrice → reset minPrice to catalog min (0)
- If LLM returns both and minPrice > maxPrice → ignore both (invalid range)

### Chip Post-Processing (in `/api/chat`)

After the LLM response is validated, chips are post-processed:

1. **Colors:** Fully data-driven - LLM color chips are removed, colors are derived from products in suggested subcategories
2. **Materials:** LLM-first + supplemented - LLM material suggestions appear first, then additional materials from the catalog are appended
3. **Style Tags:** LLM-first + supplemented - LLM style tag suggestions appear first, then additional style tags from the catalog are appended

**Final chip order:** Subcategories → Occasions (LLM-driven) → Materials (LLM-driven) → Colors (data-driven) → Style tags (LLM-driven)

> **Note:** Multiple occasion chips can be returned for queries like "travel and outdoor activities" → [travel, outdoor]. Occasions use OR logic between them (product must match at least one), but act as a hard gate before other chip filtering.

---

## Environment Setup

### Option 1: Environment Variables (Recommended)

Create `.env.local` in your project root:

```bash
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Then access in code:

```typescript
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
```

### Option 2: Hardcoded (Quick Development)

```typescript
const groq = new Groq({ 
  apiKey: 'your_groq_api_key_here' 
})

const openai = new OpenAI({ 
  apiKey: 'your_openai_api_key_here' 
})
```

---

## Error Handling

### Groq Errors

```typescript
try {
  const completion = await groq.chat.completions.create({...})
} catch (error) {
  if (error instanceof Groq.APIError) {
    console.error('Groq API Error:', error.status, error.message)
    // Return fallback response
    return Response.json({
      message: "I'm having trouble right now. Please try again.",
      chips: []
    })
  }
  throw error
}
```

### OpenAI Errors

```typescript
try {
  const response = await openai.chat.completions.create({...})
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error('OpenAI API Error:', error.status, error.message)
    return Response.json({
      description: "Unable to analyze image. Please try a different image.",
    })
  }
  throw error
}
```

---

## Cost Estimates

### Groq (Llama 3.1 70B)
- Input: $0.59 / 1M tokens
- Output: $0.79 / 1M tokens
- ~500 chat messages ≈ $0.50

### OpenAI (GPT-4o)
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- Image tokens vary by size (typically 85-1500 tokens per image)
- ~100 image analyses ≈ $0.50-1.00

**For a typical development session, expect < $5 in API costs.**

---

## Testing the APIs

### Test Groq

```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer your_groq_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

### Test OpenAI

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer your_openai_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

---

## Related Documentation

- **Architecture.md** - Overall system design and API route structure
- **Layout.md** - UI components that consume API responses
- **Objective.md** - Product requirements driving API usage
- **UserInputFlow.md** - Step-by-step flow showing where APIs are called

