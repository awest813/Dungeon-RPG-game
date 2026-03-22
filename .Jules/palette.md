## 2026-03-21 - Dynamic ARIA Progressbars
**Learning:** When building custom UI components (like HP/XP bars) in canvas-based games that overlay DOM elements, screen readers completely miss the visual context (colors/widths). Adding `role="progressbar"` and `aria-value*` attributes makes these visual-only indicators fully accessible to assistive technologies.
**Action:** Always verify if visual bars or meters in overlaid DOM UIs have proper ARIA progressbar roles and values.

## 2026-03-22 - Focusable Disabled Buttons
**Learning:** Using the native `disabled` attribute on buttons removes them from the tab order, preventing keyboard and screen reader users from accessing helpful tooltips or `title` attributes (e.g., explaining *why* an item is unaffordable or a skill is on cooldown).
**Action:** Use `aria-disabled="true"` instead of `disabled` and apply CSS pointer-events/styling when interactive elements contain context necessary for the user to understand the disabled state.
