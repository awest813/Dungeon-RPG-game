import type { Job } from "../types/GameTypes";

/** All available jobs. Keyed by job id for easy lookup. */
export const JOBS: Record<string, Job> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "A frontline fighter with high defense.",
    skillIds: ["slash", "guard"],
    statBonus: { maxHp: 20, defense: 3 },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "A backline attacker with ranged skills.",
    skillIds: ["fire_arrow", "oil_flask", "heal"],
    statBonus: { attack: 4, speed: 2 },
    critChance: 0.2,
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "A backline spellcaster wielding arcane, fire, and ice magic.",
    skillIds: ["mana_bolt", "fireball", "ice_lance", "thunderbolt", "arcane_shield", "blinding_flash"],
    statBonus: { attack: 3, speed: 3 },
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "A swift shadow dancer who bleeds foes and exploits vulnerabilities.",
    skillIds: ["backstab", "shadow_step", "garrote", "vanish"],
    statBonus: { attack: 2, speed: 4 },
    critChance: 0.35,
  },
};
