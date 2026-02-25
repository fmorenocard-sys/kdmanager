---
trigger: always_on
glob: "**/*.{jsx,css}"
description: Ensure all UI changes are responsive and follow the accessibility guidelines.
---

# 📱 Responsiveness & ♿ Accessibility Rules

## Breakpoints
- **Mobile**: 360px (Standard)
- **Tablet**: 768px
- **Desktop**: 1024px+

## Constraints
- **Absolute No-No**: Horizontal scroll on any page.
- **Navigation**: Sidebar on Desktop/Tablet, BottomNav/Burger on Mobile.
- **Tap Targets**: Buttons/Links must be at least 44x44px for touch.
- **Contrast**: WCAG AA (4.5:1 for normal text).
- **Focus**: All interactive elements MUST have a visible `:focus` ring.
- **Semic**: Use `<button>` for actions, `<a>` for navigation.

Refer to [.agent/workflows/responsiveness.md](file:///.agent/workflows/responsiveness.md) for full audit cycle.
