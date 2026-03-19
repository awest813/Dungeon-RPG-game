// Core game types and interfaces
// These are pure data types — no rendering logic here.

/** Base stats for any combatant */
export interface Stats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  /** 0–1 multiplier applied to incoming damage (used by guard, etc.) */
  damageReduction: number;
}

/** A skill's type determines how the resolver handles it */
export type SkillType = "damage" | "heal" | "buff" | "debuff" | "drain";

/** Targeting rules for a skill */
export type TargetType = "single_enemy" | "single_ally" | "self" | "all_enemies" | "all_allies";

/** A status effect that can be applied to a combatant */
export interface StatusEffect {
  id: string;
  name: string;
  duration: number;          // remaining turns
  /** Damage dealt per turn (e.g. burn, poison) */
  tickDamage?: number;
  /** Flat stat modifier applied while active */
  statModifier?: Partial<Stats>;
  /** Special flags that other systems can read (e.g. "oiled" for combo triggers) */
  flags?: string[];
}

/** A skill definition — loaded from data, not hardcoded in scene logic */
export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  targetType: TargetType;
  /** Base power: damage dealt, HP healed, etc. */
  power: number;
  /** Optional status effect applied on use */
  appliesStatus?: Omit<StatusEffect, "id"> & { id: string };
  /** Optional cooldown tracking (turns) */
  cooldown?: number;
  currentCooldown?: number;
  /**
   * For "drain" skills: fraction of damage dealt that is returned as healing
   * to the actor (default 0.5 = 50%).
   */
  drainRatio?: number;
  description: string;
}

/** A character job/class that grants a skill set */
export interface Job {
  id: string;
  name: string;
  description: string;
  /** IDs of skills this job can use */
  skillIds: string[];
  /** Base stat bonuses granted by this job */
  statBonus: Partial<Stats>;
  /**
   * Passive critical hit chance (0–1).
   * On a successful crit roll, damage is multiplied by 1.5.
   */
  critChance?: number;
}

/** A consumable item that can be used in combat or managed in town */
export interface Item {
  id: string;
  name: string;
  /** Primary effect category */
  type: "heal" | "cleanse" | "buff" | "damage";
  /** Who the item targets */
  targetType: TargetType;
  /** HP restored (heal type) or damage dealt (damage type) */
  power?: number;
  /** Status effect IDs to remove (cleanse type) */
  removesStatusIds?: string[];
  /** Status effect to apply to the target */
  appliesStatus?: Omit<StatusEffect, "id"> & { id: string };
  /** If true, resets all skill cooldowns for the user */
  resetsCooldowns?: boolean;
  /** Gold cost to purchase one unit */
  cost: number;
  description: string;
}

/** A player-controlled hero */
export interface Hero {
  id: string;
  name: string;
  jobId: string;
  stats: Stats;
  /** IDs of skills available to this hero */
  skillIds: string[];
  statusEffects: StatusEffect[];
  /** Which lane position (0 = front, 1 = back) */
  lanePosition: number;
  /**
   * Per-hero skill cooldown tracker.
   * Maps skillId → remaining turns before the skill can be used again (0 = ready).
   */
  skillCooldowns: Record<string, number>;
  /** Experience points accumulated across battles */
  xp: number;
  /** Current level (starts at 1) */
  level: number;
}

/** An enemy combatant */
export interface Enemy {
  id: string;
  name: string;
  stats: Stats;
  skillIds: string[];
  statusEffects: StatusEffect[];
  lanePosition: number;
}

/** Unified combatant for the turn system */
export type Combatant = Hero | Enemy;

/** Used to tell hero from enemy at runtime */
export function isHero(c: Combatant): c is Hero {
  return "jobId" in c;
}

/** Result object returned after resolving a skill or item use */
export interface SkillResult {
  actorId: string;
  targetId: string;
  skillId: string;
  hpChange: number;           // negative = damage, positive = heal
  statusApplied?: StatusEffect;
  /** Whether the attack landed as a critical hit */
  isCrit?: boolean;
  message: string;
}

/** Current state of a battle */
export type BattleState = "ongoing" | "victory" | "defeat";

/** Emitted when a hero levels up after an encounter */
export interface LevelUpEvent {
  heroId: string;
  heroName: string;
  newLevel: number;
}
