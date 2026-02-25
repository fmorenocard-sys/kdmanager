# Minimal Design Tokens

## Colors
### Base
- **Background**: `bg-[#0b1121]` (Deep Navy)
- **Surface**: `bg-slate-900/50` (Glassmorphism)
- **Border**: `border-white/10` or `border-slate-700`

### Text
- **Primary**: `text-white` or `text-slate-200`
- **Secondary**: `text-slate-400`
- **Accent**: `text-indigo-400` / `text-blue-400`

### Semantic
- **Success**: `text-emerald-400`, `bg-emerald-500/20`
- **Warning**: `text-amber-400`, `bg-amber-500/20`
- **Danger**: `text-red-400`, `bg-red-500/20`

## Spacing
- **Unit**: 4px
- **Padding (Card)**: `p-4` (16px) or `p-6` (24px)
- **Gap**: `gap-4` (16px) standard

## Components
### Card
```jsx
className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-lg p-6"
```

### Navigation (Sidebar)
- **Mobile (< 768px)**: Fixed Drawer (Overlay), `w-64`, `translate-x` transition.
- **Desktop (>= 768px)**: Persistent Sidebar, `w-20` (collapsed) / `w-64` (expanded).

### Tables
- **Container**: `overflow-auto` for x-scroll.
- **Header**: Sticky top, `bg-slate-900/50`.
