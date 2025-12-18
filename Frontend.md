# Shopping Assistant - Frontend Implementation

## Component Organization

### Design System
- **Location**: `shopping-assistant/src/components/catalyst/`
- **Source**: All components moved from `typescript/` folder (Catalyst UI Kit with Tailwind CSS v4)
- **Import Pattern**: `@/components/catalyst/{component}`

### Custom Components
- **Location**: `shopping-assistant/src/components/`
- Components specific to the shopping assistant application

## Component Setup

### ✅ Completed
- All Catalyst UI components moved from `typescript/` to `shopping-assistant/src/components/catalyst/`
- Components use Tailwind CSS v4 syntax
- Import paths configured: `@/components/catalyst/{component}`
- **Icon Library**: Heroicons (`@heroicons/react`) - Sharp, minimal icons from Tailwind Labs
- **Dependencies**: `@headlessui/react`, `motion`, `clsx`, `@heroicons/react`

### Available Catalyst Components
- `alert`, `avatar`, `badge`, `button`, `checkbox`, `combobox`
- `description-list`, `dialog`, `divider`, `dropdown`, `fieldset`
- `heading`, `input`, `link`, `listbox`, `navbar`, `pagination`
- `radio`, `select`, `sidebar`, `sidebar-layout`, `stacked-layout`
- `switch`, `table`, `text`, `textarea`

## Typography System

### Font Family
- **Font**: Inter (Google Fonts)
- **Weights**: 400 (regular), 500 (medium)

### Base Typography
- **Font Size**: 11px (`--font-size-base`)
- **Font Weight**: 400 (regular), 500 (medium)
- **Line Height**: 15px (`--line-height-base`)
- **Letter Spacing**: normal
- **Primary Color**: Black (#000000)

### Implementation
- **Font Loading**: Configured in `shopping-assistant/src/app/layout.tsx`
- **CSS Variables**: Defined in `shopping-assistant/src/app/globals.css`
- **Base Styles**: Applied to `body` element globally
- **Usage**: Components use `text-[var(--font-size-base)]`, `leading-[var(--line-height-base)]`, `font-[var(--font-weight-regular)]`

## Color System

### CSS Variables (in `globals.css`)
- `--foreground`: #000000 (black, primary text)
- `--text-secondary`: #7D7D7D (secondary text, placeholders)
- `--border-secondary`: #ADADAD (borders)

### Usage
- Primary text: `text-[var(--foreground)]` or default `text-black`
- Secondary text: `text-[var(--text-secondary)]`
- Borders: `border-[var(--border-secondary)]` or `border-[var(--border-secondary)]`

## Layout Structure

### Current Implementation
```
┌────────────────────────────────────────────────────────────┐
│                    HEADER (sticky, z-50)                    │
│  [MENSWEAR] [WOMENSWEAR] [EVERYTHING ELSE] [SEARCH]        │
│                       SSENSE LOGO                           │
│         [ENGLISH] [LOGIN] [WISHLIST] [BAG(0)]              │
├────────────┬───────────────────────────────────────────────┤
│  SIDEBAR   │                 MAIN                           │
│  (sticky)  │            Product Grid                        │
│  w-80      │           (4 columns)                          │
│  flex-col  │                                                │
│  [Search]  │  [Product] [Product] [Product] [Product]       │
│  [Filters] │  [Product] [Product] [Product] [Product]       │
│            │  [Product] [Product] [Product] [Product]       │
│            │         (scrollable content)                   │
└────────────┴───────────────────────────────────────────────┘
```

### Layout Details
- **Header**: Sticky at top, z-index 50, white background
- **Sidebar**: Sticky, positioned below header (`top-[57px]`), fixed width 320px (`w-80`)
- **Main**: Flex-1, scrollable product grid
- **Structure**: Flex layout with sidebar and main content side-by-side

## Header Component

### File
`shopping-assistant/src/components/Header.tsx`

### Layout
- CSS Grid with 3 equal columns (`grid-cols-3`)
- Uses `justify-between` equivalent via grid layout

### Content
**Left Navigation** (`gap-4`):
- MENSWEAR (underlined - active state)
- WOMENSWEAR
- EVERYTHING ELSE
- SEARCH

**Center Logo**:
- SSENSE SVG logo (`/ssenselogo.svg`)
- Size controlled via `logoSize` prop (default: 100px)
- Maintains aspect ratio (540:110)

**Right Navigation** (`gap-4`, `justify-end`):
- ENGLISH
- LOGIN
- WISHLIST
- BAG(0)

### Styling
- Typography: 11px font, 15px line height, regular weight
- Sticky positioning: `sticky top-0 z-50`
- Background: White (`bg-white`)

## Sidebar Component

### File
`shopping-assistant/src/components/Sidebar.tsx`

### Layout
- **Width**: `w-80` (320px)
- **Position**: Sticky, `top-[57px]` (below header)
- **Height**: `calc(100vh - 57px)` (full remaining viewport)
- **Border**: Right border using `--border-secondary` color (#ADADAD)
- **Content**: Flex column, scrollable when overflow

### Components Inside
1. **SearchBar** (at top)
2. **Filters** (below SearchBar)
3. **AIMessage** (at bottom, overlays content)

### Structure
- Container: `flex flex-col h-full p-4 pb-24` (padding-bottom for AIMessage space)
- Scrollable: `overflow-y-auto` on aside element
- Relative positioning: `relative` class for AIMessage absolute positioning

## SearchBar Component

### File
`shopping-assistant/src/components/SearchBar.tsx`

### Features

#### Layout
- Full width (sidebar width minus padding)
- Uses `textarea` instead of `input` for multi-line support

#### Styling
- **Border**: `border-[var(--border-secondary)]` (#ADADAD)
- **No shadow**: No box-shadow applied
- **No rounded corners**: `borderRadius: 0`
- **Background**: White

#### Icons
- **Search Icon**: Heroicons `MagnifyingGlassIcon`
  - Position: `left-3 top-3`
  - Color: Black
  - Size: `h-4 w-4`
- **Up Arrow Icon**: Heroicons `ArrowUpIcon`
  - Position: `right-3 top-3`
  - Color: Black
  - Size: `h-4 w-4`
  - **Conditional**: Only appears when user has typed content
  - **Animation**: Fade-in and slide-up animation (`fadeInUp` keyframe, 0.2s ease-out)
  - **Sticky**: Stays visible even when textarea scrolls (z-index 10)

#### Typography
- **Placeholder**: Secondary color (#7D7D7D)
- **Typed Content**: Black when user types
- **Font**: 11px, 15px line height, regular weight

#### Auto-Expanding Height
- Starts at 1 line height
- Expands automatically up to **3 lines** (45px = 15px × 3 + 24px padding)
- After 3 lines, enables scrolling (`overflow-y: auto`)
- Uses `useEffect` to dynamically adjust height based on content
- Padding adjusts: `pr-10` when arrow visible, `pr-3` when hidden

#### Animation
- **Keyframe**: `fadeInUp` defined in `globals.css`
- **Effect**: Arrow fades in from opacity 0 and slides up from 4px below
- **Duration**: 0.2s with ease-out timing

#### Search Submission
- **Arrow Click**: Clicking the up arrow submits the search
- **Enter Key**: Pressing Enter (without Shift) submits the search
- **Callback**: `onSearchSubmit` prop triggers parent handler
- **Auto-clear**: Search query clears after submission

## Filters Component

### File
`shopping-assistant/src/components/Filters.tsx`

### Layout
- Flex column layout
- Categories spaced with `gap-6`
- Filter items within categories spaced with `gap-2`

### Category Names
- **Format**: Uppercase (e.g., "CATEGORIES", "COLORS", "MATERIALS")
- **Typography**: 11px font, 15px line height, **regular weight** (400)
- **Spacing**: `gap-2` below category name

### Filter Items
- **Display**: Flex wrap layout (`flex flex-wrap gap-2`)
- **Typography**: 11px font, 15px line height, regular weight
- **Interaction**: Click to toggle selection
- **Hover**: Underline on hover

### Selection Behavior
- **Selected State**: Underlined (`underline` class)
- **Reordering**: Selected filters automatically move to the **front** of their row
- **Logic**: Filters are separated into `selected` and `unselected` arrays, then combined with selected first
- **State Management**: Uses `useState<Set<string>>` to track selected filter IDs

### Current Data
- **Dummy Data**: Hardcoded filter categories and items
- **Categories**: CATEGORIES, COLORS, MATERIALS
- **No Backend Integration**: Ready to connect to backend filter generation

## ProductCard Component

### File
`shopping-assistant/src/components/ProductCard.tsx`

### Layout
- Flex column layout (`flex flex-col`)

### Image
- **Aspect Ratio**: 640:1200 (portrait orientation)
- **Max Width**: 200px (`max-w-[200px]`)
- **Object Position**: `object-top` (top anchored, bottom cropped)
- **Object Fit**: `object-cover`
- Uses Next.js `Image` component with `fill` prop

### Title
- **Format**: All caps (uppercase)
- **Typography**: 11px font, 15px line height, regular weight
- **Spacing**: `mb-2` below image

### Price
- **Format**: Dollar sign prefix (`$` + price)
- **Typography**: 11px font, 15px line height, regular weight

### Props
- `imageUrl`: string - Product image URL
- `title`: string - Product title
- `price`: number - Product price
- `alt`: string (optional) - Alt text for image

## ProductGrid Component

### File
`shopping-assistant/src/components/ProductGrid.tsx`

### Layout
- **Grid**: Fixed 4 columns (`grid-cols-4`)
- **Gap**: `gap-8` between products
- **Padding**: 120px left/right for centering
- **Container**: Scrollable (`overflow-y-auto`)

### Props
- `products`: Product[] - Array of products to display

### Behavior
- Maps over products array and renders `ProductCard` for each
- Grid automatically wraps to new rows
- Scrollable container for long product lists

## Test Data

### Dummy Products
- **File**: `shopping-assistant/src/data/dummyProducts.json`
- **Count**: 16 products
- **Note**: DELETE THIS FILE LATER - temporary for testing
- **Usage**: Imported in `page.tsx` and passed to `ProductGrid`

### Dummy Filters
- **Location**: Hardcoded in `Filters.tsx` component
- **Categories**: CATEGORIES, COLORS, MATERIALS
- **Note**: Will be replaced with backend integration

## Page Structure

### Main Page
- **File**: `shopping-assistant/src/app/page.tsx`
- **Layout**:
  1. Header (sticky)
  2. Flex container:
     - Sidebar (sticky)
     - Main (scrollable ProductGrid)

### Component Hierarchy
```
HomePage (page.tsx)
├── Header
└── Flex Container
    ├── Sidebar
    │   ├── SearchBar (with onSearchSubmit callback)
    │   ├── Filters
    │   └── AIMessage (absolute positioned at bottom)
    └── Main
        └── ProductGrid
            └── ProductCard[] (16 items)
```

## AIMessage Component

### File
`shopping-assistant/src/components/AIMessage.tsx`

### Purpose
Displays AI-generated messages at the bottom of the sidebar, appearing with a slide-up animation when new messages arrive.

### Layout
- **Position**: Absolute at bottom of sidebar (`absolute bottom-0 left-0 right-0`)
- **Z-Index**: `z-50` (above all other sidebar elements)
- **Width**: Full sidebar width

### Styling
- **Matches SearchBar**: Same border (`border-[var(--border-secondary)]`), padding, typography
- **Border**: `border-[var(--border-secondary)]` (#ADADAD)
- **No rounded corners**: `borderRadius: 0`
- **Background**: White
- **Typography**: 11px font, 15px line height, regular weight, black text
- **Top Border**: `border-t` on container for separation

### Animation
- **Transition**: `transition-transform duration-300 ease-out`
- **Hidden State**: `translate-y-full` (below viewport)
- **Visible State**: `translate-y-0` (normal position)
- **Behavior**: Slides up from below screen when message appears

### Props
- `message`: `string | null` - AI message text to display
  - When `null` or empty: Component hidden below screen
  - When has content: Component slides up and displays message

### Integration with SearchBar
1. User types in SearchBar and submits (arrow click or Enter)
2. `onSearchSubmit` callback triggered in Sidebar
3. AIMessage immediately hides (slides down) - `message` set to `null`
4. After API delay (simulated), new AI message arrives
5. AIMessage slides up with new message content

### State Management
- Managed in `Sidebar` component
- `aiMessage`: Current message string or null
- `isWaitingForResponse`: Tracks API call state
- `handleSearchSubmit`: Hides message, waits, then shows new response

### Testing
- **Test Button**: "Test AI Message" button in Sidebar (easily removable)
- **Functionality**: Triggers animation with random dummy messages
- **Purpose**: Test animation without typing/searching

## CSS Animations

### fadeInUp
- **Location**: `globals.css`
- **Purpose**: Animate up arrow appearance in SearchBar
- **Keyframes**:
  - From: `opacity: 0`, `translateY(4px)`
  - To: `opacity: 1`, `translateY(0)`
- **Duration**: 0.2s
- **Timing**: ease-out

### AIMessage Slide-Up
- **Implementation**: Tailwind `translate-y-full` → `translate-y-0` transition
- **Duration**: 300ms
- **Timing**: ease-out
- **Purpose**: Slide AI message up from below viewport when new message arrives

## Next Steps

### Backend Integration
- Connect Filters component to backend filter generation
- Replace dummy filter data with API responses
- Wire up SearchBar to search functionality
- Connect filter selections to product filtering

### Future Components
- Filter chips (from AI suggestions)
- Price slider
- In-stock toggle
- Resize handle for sidebar

### Completed Components
- ✅ **AIMessage**: AI message display with slide-up animation (at bottom of sidebar)
