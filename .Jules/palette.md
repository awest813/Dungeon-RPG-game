## 2026-03-21 - Dynamic ARIA Progressbars
**Learning:** When building custom UI components (like HP/XP bars) in canvas-based games that overlay DOM elements, screen readers completely miss the visual context (colors/widths). Adding `role="progressbar"` and `aria-value*` attributes makes these visual-only indicators fully accessible to assistive technologies.
**Action:** Always verify if visual bars or meters in overlaid DOM UIs have proper ARIA progressbar roles and values.
