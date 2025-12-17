# Shopping Assistant - UI Layout Specification

## Overview
The application is a product listing page with an AI-powered conversational shopping assistant that can be toggled via a sidebar interface. The layout supports desktop only (no mobile/tablet view).

**UI Framework:** Catalyst UI Kit (Tailwind Labs) + custom components
**Styling:** Tailwind CSS v4.0

## Layout Structure

### Initial State (Default View)
```
┌─────────────────────────────────────────────────────────┐
│                      HEADER                              │
├──────────────┬──────────────────────────────────────────┤
│   Filters    │                                           │
│   Panel      │         Product Grid                      │
│              │         (Responsive Grid)                 │
│   ┌─────┐   │                                           │
│   │     │   │    [Product] [Product] [Product]          │
│   │     │   │    [Product] [Product] [Product]          │
│   └─────┘   │    [Product] [Product] [Product]          │
│              │                                           │
│  [Button]    │                                           │
│              │                                           │
└──────────────┴──────────────────────────────────────────┘
```

### Chat Sidebar Active State
```
┌─────────────────────────────────────────────────────────┐
│                      HEADER                              │
├──────────────────────────┬─┬────────────────────────────┤
│   Chat Sidebar (30%)     │║│    Product Grid            │
│                          │║│    (Resized - 70%)         │
│  ┌──────────────────┐   │║│                            │
│  │ Conversation      │   │║│   [Prod] [Prod] [Prod]    │
│  │ Thread            │   │║│   [Prod] [Prod] [Prod]    │
│  │                   │   │║│                            │
│  │ [Filter Chips]    │   │║│                            │
│  │ [Filter Chips]    │   │║│                            │
│  │                   │   │║│                            │
│  │ (Scrollable)      │   │║│                            │
│  └──────────────────┘   │║│                            │
│  [Global Filters]        │║│                            │
│  ┌──────────────────┐   │║│                            │
│  │ [Image Preview]  │   │║│                            │
│  │ Prompt Input     │   │║│                            │
│  │ (Fixed Bottom)   │   │║│                            │
│  └──────────────────┘   │║│                            │
└──────────────────────────┴─┴────────────────────────────┘
                           ↕ (Resizable)
```

## Component to Catalyst Mapping

| Layout Element | Catalyst Component | Custom |
|---------------|-------------------|--------|
| Header | — | Custom with Tailwind |
| Logo | — | Custom SVG/image |
| Search bar | `Input` | — |
| Cart icon | `Button` + `Dropdown` | — |
| Filters Panel | `Fieldset`, `Field`, `Label` | Container custom |
| Category filter | `Select` or `Listbox` | — |
| Color/Material filters | `CheckboxGroup`, `CheckboxField`, `Checkbox` | — |
| In-stock toggle | `SwitchField`, `Switch` | — |
| Price slider | — | `@radix-ui/react-slider` |
| Chat toggle button | `Button` | — |
| Chat sidebar | `Sidebar`, `SidebarBody`, `SidebarFooter` | — |
| Chat messages | `Text`, `Heading` | Custom layout |
| Filter chips | `BadgeButton` | Extended with selected state |
| Prompt input | `Textarea` or `Input` | — |
| Send button | `Button` | — |
| Product card | — | Custom with Tailwind |
| Add to cart button | `Button` | — |

## Component Details

### 1. Header
- Spans full width of viewport
- Always visible
- Contains:
  - Logo
  - Search bar
  - Cart icon
  - Navigation menu

### 2. Filters Panel (Initial State)
- Fixed width on the left side
- Contains traditional filter controls:
  - `Select`/`Listbox` for category/subcategory
  - `CheckboxGroup` with `Checkbox` for colors, materials
  - `Switch` for in-stock toggle
  - Custom `Slider` for price range
- Has a toggle button at the bottom to activate chat mode
- **Behavior:** When chat sidebar opens, this panel completely disappears and is replaced by the chat interface

### 3. Chat Toggle Button
- Located below the filters panel in initial state
- Activates/deactivates the chat sidebar
- Button text: Placeholder (e.g., "AI Shopping Assistant")
- Toggles between traditional filter view and chat view

### 4. Chat Sidebar

#### Width Behavior
- Default width: 30% of viewport
- Resizable via drag handle (smooth dragging, no snap points)
- Maximum width: 50% of viewport
- Minimum width: TBD (suggest ~250px for usability)
- Can be closed to return to traditional filter view

#### Closing Behavior
- When sidebar is closed, filters applied via chat chips are synchronized to the traditional filter panel where applicable
- This allows seamless transition between chat and traditional filtering modes

#### Structure (Bottom to Top)
1. **Prompt Input Box** (fixed at bottom)
2. **Global Filters** (fixed above prompt)
3. **Conversation Area** (scrollable above global filters)

### 5. Conversation Area (Scrollable)
- Contains chat messages (user + assistant)
- Displays suggested filter chips/tags as part of assistant responses
- Filter chips are clickable/tappable and appear inline with messages
- Scrolls independently from grid
- Auto-scrolls to bottom when new messages arrive

### 6. Filter Chips/Tags
- **Component:** Catalyst `BadgeButton` with extended selected state
- Appear within the conversation thread as part of assistant responses
- Clickable to apply filters
- Visual states:
  - Unselected: `BadgeButton color="zinc"` (subtle gray), `opacity-70`
  - Selected: `BadgeButton color` by type + ring highlight + checkmark
- Color by filter type:
  - Category/Subcategory: `indigo`
  - Colors: `zinc` (neutral to not clash with color name)
  - Materials: `amber`
  - Style tags: `violet`
  - Size: `sky`

#### Chip Persistence (Phase 2)
- **Selected chips persist** across queries and jump to front of row
- **Unselected chips refresh** with new suggestions on each query
- **Visual separator** between selected and suggested chips
- **Deselection** moves chip back to suggested area
- On new query: selected stay, unselected replaced with new suggestions

### 7. Global Filters
- Always visible above the prompt input box
- Includes: Price range, In stock toggle, and other always-available filters
- Fixed position (does not scroll with conversation)
- Note: Future goal is to attach these to the top of the input box area

### 8. Prompt Input Box
- Fixed at bottom of chat sidebar
- Does not scroll with content
- Supports text input
- **Image Upload:**
  - Uploaded image appears as a small preview inside the prompt box
  - Preview displays above the text input area
  - Similar to modern AI chat interfaces (ChatGPT, Claude, etc.)
  - On hover, an "X" button appears centered on the image to delete/remove it
  - Removes image from the search/query process when deleted

### 9. Resize Handle
- Vertical divider between sidebar and grid
- Draggable to adjust sidebar width
- Constrained to max 50% viewport width
- Visual indicator that it's draggable (cursor changes, subtle styling)
- Smooth dragging (no snap points)
- Grid resizes in real-time as handle is dragged

### 10. Product Grid
- Responsive grid layout
- Number of columns adjusts dynamically based on available width
- Updates in real-time as filters are applied
- Resizes when sidebar width changes
- **Infinite scroll** for loading more products
- **Loading states:** Shimmer effect displayed when filters change or new products load
- Grid recalculates column count based on remaining horizontal space

### 11. Product Cards
- Display in grid
- Include at minimum:
  - Product image
  - Product title
  - Price
  - Add-to-cart button
- **Future optional features:** Hover states, quick-view, "more like this" (see Objective.md Section 8 - Deferred)

## State Management

### Session Persistence
- Sidebar open/closed state persists across page reloads
- Sidebar width persists during session
- Applied filters persist according to standard e-commerce patterns

### Real-Time Updates
- Grid updates immediately when filter chips are tapped
- No debouncing or delay in applying filters
- Loading shimmer shown during filter application

### Filter Synchronization
- When closing chat sidebar, filters applied via chips are mapped to traditional filter controls where possible
- Ensures consistency between chat and traditional filtering modes
- Filters that don't map to traditional controls remain active in the grid

## Responsive Behavior
**Desktop only** - No mobile or tablet view required for MVP

## Technical Considerations

### Performance
- Grid should handle smooth resizing without layout thrashing
- Infinite scroll should implement virtualization for large catalogs
- Filter updates should be optimized to avoid unnecessary re-renders

### Accessibility
- Resize handle should be keyboard accessible
- Chat input should support standard keyboard navigation
- Filter chips should be keyboard selectable
- Proper ARIA labels for all interactive elements

## Related to Objective.md
- Layout supports both text and image input as specified in Section 3
- Filter chips implement the "tap to apply" pattern from Section 3
- Grid updates in real time per Section 3 requirements
- Conversation thread maintains context per Section 4
- Global filters (price, in stock) always present per Section 3
- Sidebar structure supports the "Regenerate filters" functionality per Section 3
