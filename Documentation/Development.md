# Development Guide

This document covers API keys, testing, and development notes.

---

## API Keys

```bash
# Groq - LLM for filter generation
GROQ_API_KEY=your_groq_api_key_here

# OpenAI - GPT-4o Vision for image analysis
OPENAI_API_KEY=your_openai_api_key_here
```

**Security Note:** This project is intentionally loose on security for rapid development.

---

## Environment Setup

Create `.env.local` in the `shopping-assistant` directory:

```bash
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## Running the App

```bash
cd shopping-assistant
npm install
npm run dev
```

- Main app: [http://localhost:3000](http://localhost:3000)
- Test page: [http://localhost:3000/test-backend](http://localhost:3000/test-backend)

---

## Test Backend Page

The `/test-backend` page provides a UI for testing the API:

### Features
- Send queries to `/api/chat`
- View suggested chips
- Select/deselect chips to test filtering
- See filtered products in real-time
- View product count and details

### Test Queries

| Query | Expected Chips |
|-------|---------------|
| "cozy blue sweater" | sweaters, wool, blue, cozy |
| "running outfit" | t-shirts, pants, cotton, polyester, casual, fitted |
| "formal evening wear" | dresses, blouses, silk, elegant |
| "casual weekend" | jeans, t-shirts, hoodies, cotton, relaxed |

---

## Filter Logic Test Cases

### Test Case 1: Multiple Subcategories

**Selected Filters:**
- Subcategories: Sweaters, Hoodies
- Materials: Wool, fleece
- Colors: Beige, Navy
- Style Tags: Cozy, Oversized

**Expected Logic:**
```
(subcategory = sweaters OR subcategory = hoodies)
AND (material = wool OR material = fleece)
AND (color = beige OR color = navy)
AND (style_tag includes cozy OR style_tag includes oversized)
```

### Test Case 2: Occasion Filtering

**Query:** "running outfit"

**Expected:**
- Products with `occasion` including "athletic"
- Subcategories: t-shirts, pants (not formal wear)
- Materials: cotton, polyester (not cashmere)

---

## API Testing

### Test Groq API

```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

### Test Chat Endpoint

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want a cozy blue sweater"
  }'
```

---

## Models

| Service | Model | Purpose |
|---------|-------|---------|
| Groq | `llama-3.3-70b-versatile` | Filter chip generation |
| OpenAI | `gpt-4o` | Image analysis (future) |

### Groq Parameters

```typescript
{
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  max_tokens: 1024,
}
```

---

## Cost Estimates

### Groq (Llama 3.3 70B)
- Input: $0.59 / 1M tokens
- Output: $0.79 / 1M tokens
- ~500 chat messages ≈ $0.50

### OpenAI (GPT-4o)
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- ~100 image analyses ≈ $0.50-1.00

**For typical development: < $5 in API costs**

---

## Rate Limits

### Groq (Free Tier)
- Requests per minute: 30
- Tokens per minute: 6,000

### OpenAI (Tier 1)
- Requests per minute: 500
- Tokens per minute: 30,000

---

## Error Handling

### LLM Response Errors

```typescript
try {
  const completion = await groq.chat.completions.create({...})
} catch (error) {
  if (error instanceof Groq.APIError) {
    console.error('Groq API Error:', error.status, error.message)
    return Response.json({
      message: "I'm having trouble right now. Please try again.",
      suggestedChips: []
    })
  }
  throw error
}
```

### Validation Errors

Invalid chips are silently filtered out. The response still succeeds with valid chips only.

---

## Debugging

### Enable Debug Logs

The API route logs debug information:

```typescript
console.log('[DEBUG] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
console.log('[DEBUG] Raw LLM response:', rawResponse)
console.log('[DEBUG] Validated chips:', validated.valid.length)
console.log('[DEBUG] Invalid chips:', validated.invalid.length)
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "API key not found" | Check `.env.local` exists and has correct key |
| Empty chips array | Check if query is too vague or LLM failed |
| Invalid chips filtered | Check catalog has the suggested values |

---

## Product Catalog

### Location
`src/data/products.json`

### Schema
```json
{
  "id": "prod-001",
  "title": "Cozy Wool Crewneck Sweater",
  "description": "A warm wool sweater...",
  "image_url": "https://...",
  "price": 125,
  "in_stock": true,
  "category": "apparel",
  "subcategory": "sweaters",
  "color": "brown",
  "material": "wool",
  "style_tags": ["cozy", "casual", "classic"],
  "occasion": ["casual", "outdoor"],
  "size": "M"
}
```

### Available Values

| Facet | Values |
|-------|--------|
| Subcategories | sweaters, hoodies, t-shirts, blouses, pants, jeans, jackets, coats, dresses, skirts |
| Colors | beige, black, blue, brown, cream, gray, green, navy, olive, pink, white |
| Materials | cashmere, cotton, denim, fleece, leather, linen, polyester, silk, wool |
| Style Tags | casual, classic, cozy, edgy, elegant, fitted, formal, minimalist, modern, oversized, relaxed, romantic, vintage |
| Occasions | athletic, business, casual, evening, formal, outdoor, travel |
| Sizes | XS, S, M, L, XL |

---

## Dependencies

### Production
- `next` - Framework
- `react`, `react-dom` - UI
- `groq-sdk` - Groq API client
- `openai` - OpenAI API client (future)
- `zod` - Runtime validation
- `@headlessui/react` - Accessible components
- `motion` - Animations
- `clsx` - Class names

### Development
- `typescript` - Type checking
- `@types/node`, `@types/react` - Type definitions
- `tailwindcss` - Styling
- `eslint` - Linting

