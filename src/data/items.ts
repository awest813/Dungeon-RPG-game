import type { Item } from "../types/GameTypes";

/** All purchasable/usable consumable items. Keyed by item id. */
export const ITEMS: Record<string, Item> = {
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    type: "heal",
    targetType: "single_ally",
    power: 30,
    cost: 15,
    description: "Restore 30 HP to any hero.",
  },
  greater_health_potion: {
    id: "greater_health_potion",
    name: "Greater Health Potion",
    type: "heal",
    targetType: "single_ally",
    power: 60,
    cost: 28,
    description: "Restore 60 HP to any hero.",
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    type: "cleanse",
    targetType: "single_ally",
    power: 0,
    removesStatusIds: ["poison", "bleed"],
    cost: 12,
    description: "Remove Poison and Bleed from any hero.",
  },
  elixir_of_clarity: {
    id: "elixir_of_clarity",
    name: "Elixir of Clarity",
    type: "cleanse",
    targetType: "single_ally",
    power: 0,
    removesStatusIds: ["stun", "freeze", "fear", "blind"],
    cost: 20,
    description: "Dispel Stun, Freeze, Fear, and Blind from any hero.",
  },
  smoke_bomb: {
    id: "smoke_bomb",
    name: "Smoke Bomb",
    type: "buff",
    targetType: "all_enemies",
    power: 0,
    appliesStatus: {
      id: "blind",
      name: "Blind",
      duration: 2,
      statModifier: { attack: -5 },
      flags: ["blinded"],
    },
    cost: 18,
    description: "Blind all enemies for 2 turns, reducing their attack by 5.",
  },
  ether_flask: {
    id: "ether_flask",
    name: "Ether Flask",
    type: "buff",
    targetType: "self",
    power: 0,
    resetsCooldowns: true,
    cost: 25,
    description: "Instantly reset all skill cooldowns for the user.",
  },
};

/** Display-friendly names for items (for shop labels). */
export const ITEM_ORDER = [
  "health_potion",
  "greater_health_potion",
  "antidote",
  "elixir_of_clarity",
  "smoke_bomb",
  "ether_flask",
] as const;
