import type { Enemy } from "../types/GameTypes";

/** Sample enemies for combat encounters. */
export const SAMPLE_ENEMIES: Enemy[] = [
  {
    id: "enemy_goblin",
    name: "Goblin",
    stats: {
      maxHp: 40,
      hp: 40,
      attack: 7,
      defense: 2,
      speed: 6,
      damageReduction: 0,
    },
    skillIds: ["slash"],
    statusEffects: [],
    lanePosition: 0,
  },
  {
    id: "enemy_orc",
    name: "Orc Brute",
    stats: {
      maxHp: 70,
      hp: 70,
      attack: 12,
      defense: 5,
      speed: 3,
      damageReduction: 0,
    },
    skillIds: ["slash", "guard"],
    statusEffects: [],
    lanePosition: 0,
  },
  {
    id: "enemy_skeleton_mage",
    name: "Skeleton Mage",
    stats: {
      maxHp: 35,
      hp: 35,
      attack: 9,
      defense: 1,
      speed: 7,
      damageReduction: 0,
    },
    skillIds: ["poison_dart", "slash"],
    statusEffects: [],
    lanePosition: 1,
  },
];
