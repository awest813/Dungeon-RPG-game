import type { Hero } from "../types/GameTypes";

/** Sample starting heroes. */
export const SAMPLE_HEROES: Hero[] = [
  {
    id: "hero_aldric",
    name: "Aldric",
    jobId: "warrior",
    stats: {
      maxHp: 80,
      hp: 80,
      attack: 10,
      defense: 6,
      speed: 5,
      damageReduction: 0,
    },
    skillIds: ["slash", "guard"],
    statusEffects: [],
    lanePosition: 0,
    skillCooldowns: {},
    xp: 0,
    level: 1,
  },
  {
    id: "hero_lyra",
    name: "Lyra",
    jobId: "ranger",
    stats: {
      maxHp: 60,
      hp: 60,
      attack: 14,
      defense: 3,
      speed: 8,
      damageReduction: 0,
    },
    skillIds: ["fire_arrow", "oil_flask", "heal"],
    statusEffects: [],
    lanePosition: 1,
    skillCooldowns: {},
    xp: 0,
    level: 1,
  },
];
