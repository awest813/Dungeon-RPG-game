import type { Equipment } from "../types/GameTypes";

/**
 * All equipment definitions.
 * Keyed by equipment id for fast lookup.
 *
 * Rarity guide:
 *   common   — available in the Armory shop and mid-tier drops
 *   uncommon — hard-tier drops and late-game shop
 *   rare     — boss drops only (never sold in the Armory)
 */
export const EQUIPMENT: Record<string, Equipment> = {
  // ─── Weapons ─────────────────────────────────────────────────────────────
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    slot: "weapon",
    rarity: "common",
    statBonus: { attack: 4 },
    cost: 40,
    description: "+4 ATK. A sturdy blade forged by the town smith.",
  },
  longbow: {
    id: "longbow",
    name: "Longbow",
    slot: "weapon",
    rarity: "common",
    statBonus: { attack: 5, speed: 1 },
    cost: 45,
    description: "+5 ATK, +1 SPD. A ranger's favoured ranged weapon.",
  },
  oak_staff: {
    id: "oak_staff",
    name: "Oak Staff",
    slot: "weapon",
    rarity: "common",
    statBonus: { attack: 4, speed: 2 },
    cost: 42,
    description: "+4 ATK, +2 SPD. Channels arcane energy through knotted wood.",
  },
  shadow_dagger: {
    id: "shadow_dagger",
    name: "Shadow Dagger",
    slot: "weapon",
    rarity: "common",
    statBonus: { attack: 3, speed: 3 },
    critBonus: 0.05,
    cost: 48,
    description: "+3 ATK, +3 SPD, +5% Crit. Swift and silent in the dark.",
  },
  silver_sword: {
    id: "silver_sword",
    name: "Silver Sword",
    slot: "weapon",
    rarity: "uncommon",
    statBonus: { attack: 8 },
    cost: 85,
    description: "+8 ATK. Blessed silver — especially effective against undead.",
  },
  arcane_tome: {
    id: "arcane_tome",
    name: "Arcane Tome",
    slot: "weapon",
    rarity: "uncommon",
    statBonus: { attack: 8, speed: 3 },
    cost: 90,
    description: "+8 ATK, +3 SPD. Amplifies the power of all spells.",
  },
  assassins_blade: {
    id: "assassins_blade",
    name: "Assassin's Blade",
    slot: "weapon",
    rarity: "rare",
    statBonus: { attack: 7, speed: 4 },
    critBonus: 0.10,
    cost: 130,
    description: "+7 ATK, +4 SPD, +10% Crit. A weapon of deadly precision.",
  },

  // ─── Armour ───────────────────────────────────────────────────────────────
  leather_armour: {
    id: "leather_armour",
    name: "Leather Armour",
    slot: "armour",
    rarity: "common",
    statBonus: { defense: 3 },
    cost: 35,
    description: "+3 DEF. Light protective gear for agile fighters.",
  },
  chainmail: {
    id: "chainmail",
    name: "Chainmail",
    slot: "armour",
    rarity: "common",
    statBonus: { defense: 5, maxHp: 10 },
    cost: 55,
    description: "+5 DEF, +10 HP. Interlocked rings offer solid protection.",
  },
  mage_robes: {
    id: "mage_robes",
    name: "Mage Robes",
    slot: "armour",
    rarity: "common",
    statBonus: { defense: 2, maxHp: 8, speed: 1 },
    cost: 38,
    description: "+2 DEF, +8 HP, +1 SPD. Warded cloth for the scholarly.",
  },
  shadow_garb: {
    id: "shadow_garb",
    name: "Shadow Garb",
    slot: "armour",
    rarity: "common",
    statBonus: { defense: 2, speed: 3 },
    cost: 42,
    description: "+2 DEF, +3 SPD. Allows near-silent movement.",
  },
  plate_armour: {
    id: "plate_armour",
    name: "Plate Armour",
    slot: "armour",
    rarity: "uncommon",
    statBonus: { defense: 9, maxHp: 20 },
    cost: 95,
    description: "+9 DEF, +20 HP. A full suit of tempered plate.",
  },
  dragonscale_vest: {
    id: "dragonscale_vest",
    name: "Dragonscale Vest",
    slot: "armour",
    rarity: "rare",
    statBonus: { defense: 7, maxHp: 15, speed: 1 },
    cost: 140,
    description: "+7 DEF, +15 HP, +1 SPD. Crafted from a Fire Drake's scales.",
  },

  // ─── Accessories ──────────────────────────────────────────────────────────
  amulet_of_health: {
    id: "amulet_of_health",
    name: "Amulet of Health",
    slot: "accessory",
    rarity: "common",
    statBonus: { maxHp: 20 },
    cost: 40,
    description: "+20 Max HP. A gem brimming with restorative energy.",
  },
  ring_of_speed: {
    id: "ring_of_speed",
    name: "Ring of Speed",
    slot: "accessory",
    rarity: "common",
    statBonus: { speed: 4 },
    cost: 38,
    description: "+4 SPD. The wearer moves with preternatural haste.",
  },
  talisman_of_power: {
    id: "talisman_of_power",
    name: "Talisman of Power",
    slot: "accessory",
    rarity: "common",
    statBonus: { attack: 3 },
    cost: 42,
    description: "+3 ATK. Channels aggressive energy into every strike.",
  },
  guardian_pendant: {
    id: "guardian_pendant",
    name: "Guardian Pendant",
    slot: "accessory",
    rarity: "uncommon",
    statBonus: { defense: 4, maxHp: 10 },
    cost: 65,
    description: "+4 DEF, +10 HP. Blessed by an ancient guardian spirit.",
  },
};

/** Ordered list for Armory shop display (common items only — rare/uncommon are drops). */
export const ARMORY_ORDER = [
  // Weapons
  "iron_sword",
  "longbow",
  "oak_staff",
  "shadow_dagger",
  // Armour
  "leather_armour",
  "chainmail",
  "mage_robes",
  "shadow_garb",
  // Accessories
  "amulet_of_health",
  "ring_of_speed",
  "talisman_of_power",
] as const;

/**
 * Equipment drop pools per enemy tier.
 * Each entry is a list of equipment ids that can drop from that tier.
 */
export const EQUIP_DROP_POOL: Record<"mid" | "hard" | "boss", string[]> = {
  mid:  ["iron_sword", "longbow", "leather_armour", "mage_robes", "amulet_of_health"],
  hard: ["silver_sword", "arcane_tome", "chainmail", "plate_armour", "ring_of_speed", "talisman_of_power", "guardian_pendant"],
  boss: ["assassins_blade", "dragonscale_vest", "silver_sword", "arcane_tome", "guardian_pendant"],
};

/** Probability of an equipment drop per encounter, by tier of enemies present. */
export const EQUIP_DROP_CHANCE: Record<"mid" | "hard" | "boss", number> = {
  mid:  0.20,
  hard: 0.35,
  boss: 0.70,
};
