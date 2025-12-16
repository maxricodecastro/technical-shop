# Shopping Assistant Takehome — Build Spec (Text + Image Conversational Filters)

## 1) Problem
Create a web-based shopping assistant using conversational AI that makes product discovery and intent fulfillment more personalized and easier than traditional search + filters.

## 2) Product Concept
A conversational assistant replaces the standard filter panel on a product listing page. The assistant lives in a left sidebar and guides the user to the right products by proposing grounded, tap-to-apply filter chips that progressively narrow the product grid.

Primary verticals:
- Apparel (first)
- Furniture (second)
(Additional verticals are optional stretch.)

## 3) Core UX

### Layout
- Main view: product grid (updates in real time as filters change)
- Left sidebar: conversational AI experience
- Sidebar contains:
  - Conversation thread
  - Suggested filter chips (tap to apply)
  - Global filters always present near the input (e.g., Price, In stock)
  - Input area supports both text entry and image upload

### Key behaviors
- The assistant acts primarily as a filter builder, with light "shopping companion" nudges.
- Filters are suggested as chips (not auto-applied). Users tap to apply.
- Filters use AND logic (all selected filters must match).
- "Regenerate filters" triggers a new model call to propose alternative chips given current context and selections.
- Add-to-cart is supported from the grid (and/or via a sticky cart affordance).

## 4) Interaction Flows

### Text search / discovery
- User types a natural-language request (e.g., "I want something in the style of X").
- Assistant responds with:
  - A brief grounded interpretation of intent
  - Clarifying questions when needed (especially price if not provided)
  - Suggested chips: category and subcategory first (e.g., Coats, Sweaters, Pants), then attributes (color, material, size, etc.)
- User taps chips; the grid updates instantly.
- Chips adapt dynamically based on current selections and remaining candidate items.

### Image-based search
- User uploads an image (e.g., "match this room").
- Assistant uses image similarity to find relevant candidates and proposes chips derived from those candidates' common facets (category/subcategory/attributes).
- User refines via chips; grid updates.

## 5) Assistant Rules (Grounding + Recovery)

### Grounding
- The assistant must be grounded in catalog data.
- It should not invent attributes that are not represented in the catalog.

### Explanations
- The assistant provides brief, attribute-based reasoning for why results or chips are suggested (e.g., "showing these because: wool + neutral palette + relaxed fit").

### Clarifying questions
- The assistant should ask clarifying questions to narrow intent.
- Price is a required clarification if the user has not selected or stated a budget.

### Unavailable brand/style
- If the user asks for a brand or style not present in the catalog:
  - State it isn't available in the current catalog
  - Suggest the closest alternatives using catalog-backed descriptors/tags

### Zero results
- If filters produce zero results, the assistant widens constraints intelligently:
  - Relax the most specific constraints first (e.g., subcategory) before broader ones (e.g., category)
  - Offer "relax/remove X" chips and/or "show close matches" suggestions

### Contradictory constraints
- AND logic may create contradictions.
- Detect likely conflicts and guide recovery (e.g., propose which constraint to relax), without changing constraints silently unless explicitly chosen.

## 6) Catalog (MVP Assumptions)
Dataset size: ~500 items.

Each item includes, at minimum:
- id
- title
- description
- image_url (placeholder acceptable initially)
- price
- in_stock
- category (apparel / furniture)
- subcategory (e.g., coats, sweaters; sofa, chair)
- color
- material
- style_tags
- size (for apparel; optional/omitted for furniture)
- optional brand

All assistant suggestions (chips and explanations) must map to these fields.

## 7) Retrieval / Filtering Approach (MVP)

### Source of truth
- The product grid is always driven by applying AND filters over the catalog fields.

### Semantic support (for "vibe/style" and free text)
- Create text embeddings for each item using title + description + tags.
- Use semantic search to:
  - Propose an initial candidate set
  - Determine high-signal chips by aggregating common facets among candidates

### Image support
- Use an image embedding model (CLIP-like) to retrieve nearest items by visual similarity.
- Derive suggested chips from the top candidates' facets.

## 8) In Scope vs Deferred

### In scope (MVP)
- Web UI: grid + left AI sidebar
- Text + image input
- Suggested filter chips + regenerate
- Global filters (price, in stock) always visible
- Grounded assistant responses with clarifying questions
- Add-to-cart interaction

### Deferred (stretch / later)
- "More like this" / pin-item-as-reference
- Personality tuning
- Additional verticals beyond apparel + furniture

