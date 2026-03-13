import type { Skill } from "../types/GameTypes";

/** All available skills. Keyed by skill id for easy lookup. */
export const SKILLS: Record<string, Skill> = {
  slash: {
    id: "slash",
    name: "Slash",
    type: "damage",
    targetType: "single_enemy",
    power: 12,
    description: "A basic sword slash that deals moderate damage.",
  },
  guard: {
    id: "guard",
    name: "Guard",
    type: "buff",
    targetType: "self",
    power: 0,
    appliesStatus: {
      id: "guard",
      name: "Guard",
      duration: 1,
      statModifier: { damageReduction: 0.4 },
      flags: ["guarding"],
    },
    description: "Brace for impact — reduce incoming damage by 40% for 1 turn.",
  },
  fire_arrow: {
    id: "fire_arrow",
    name: "Fire Arrow",
    type: "damage",
    targetType: "single_enemy",
    power: 10,
    appliesStatus: {
      id: "burn",
      name: "Burn",
      duration: 2,
      tickDamage: 3,
      flags: ["burning"],
    },
    description: "Shoot a flaming arrow that deals damage and applies Burn.",
  },
  heal: {
    id: "heal",
    name: "Heal",
    type: "heal",
    targetType: "single_ally",
    power: 15,
    description: "Restore HP to a single ally.",
  },
};
