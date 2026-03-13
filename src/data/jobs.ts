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
  },
};
