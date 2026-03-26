## 2024-03-23 - Explaining Disabled UI States
**Learning:** Tooltips on disabled buttons (`aria-disabled="true"`) need to provide context for *why* they are disabled. In the shop UI, adding explicit reasons (e.g., "(Not enough gold)") directly to the button title significantly improves the user experience by clarifying system state, rather than just relying on the grayed-out visual indicator.
**Action:** When creating or modifying disabled UI elements, always ensure there is an accessible explanation for the disabled state. Use `aria-disabled="true"` to keep the element focusable and append the reason to the element's `title` or `aria-label`.

## 2024-03-26 - Preserving Context on Disabled Elements
**Learning:** Overwriting the original description of a button entirely (such as entirely replacing a skill description with "On cooldown") removes necessary context that the user still needs. They often forget what the disabled action actually does.
**Action:** When providing a reason for a disabled state, append it to the original description rather than replacing it entirely, allowing users to still read what the action would do.