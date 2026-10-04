# Scout — Design System

## Philosophy
Dark, glassmorphic, unobtrusive. The UI should feel like a heads-up display, not a popup.

## Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0f172a` | Panel background |
| `--bg-card` | `#1e293b` | Card backgrounds |
| `--accent` | `#5eead4` | Primary highlights, headers |
| `--text-primary` | `#e2e8f0` | Main text |
| `--text-secondary` | `#94a3b8` | Descriptions |
| `--text-muted` | `#64748b` | Placeholders, labels |
| `--severity-high` | `#f43f5e` | Critical alerts |
| `--severity-medium` | `#f59e0b` | Warnings |
| `--severity-low` | `#3b82f6` | Info |
| `--severity-info` | `#10b981` | Neutral |

## Typography
- Font family: system UI stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`)
- Base size: 13px
- Panel title: 14px bold, letter-spacing 0.5px
- Card body: 12px
- Labels: 10-11px uppercase

## Components

### Pro Panel
- Width: 320px
- Max height: 520px
- Position: fixed top-right, 12px offset
- Border: 1px solid accent at 20% opacity
- Shadow: layered drop shadow for depth
- Backdrop filter: blur(12px)

### Cards
- Border-left: 3px color-coded by severity
- Hover: subtle translateX(-2px) for depth
- Source badge: top-right, muted

### Badges
- Fixed position, auto-dismiss 5s
- Entrance: slide in from right
- Exit: fade out to right

### Toasts
- Fixed position, right of panel
- Stacked vertically with 8px gap
- Auto-dismiss 4s

## Animation
- Card hover: 150ms ease
- Badge slide: 300ms ease
- Toast fade: 300ms ease
- Panel toggle: 200ms ease
