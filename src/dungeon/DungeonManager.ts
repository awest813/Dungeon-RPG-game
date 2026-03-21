import type { Hero, Enemy, LevelUpEvent } from "../types/GameTypes";
import { cloneEnemy } from "../types/GameTypes";
import { SAMPLE_ENEMIES } from "../data/enemies";

/**
 * DungeonManager — orchestrates multi-encounter dungeon runs.
 *
 * Each run consists of three sequential encounters.  Heroes carry their
 * current HP from one encounter to the next.  Enemies are drawn from a
 * tiered pool and their base stats are scaled by the current dungeon depth
 * so that repeat runs grow progressively harder.
 */
// ─── Reward constants (easy to tune) ────────────────────────────────────────
const BASE_XP_REWARD = 20;           // XP awarded per defeated enemy
const BASE_GOLD_REWARD = 10;         // Gold awarded per defeated enemy
const XP_PER_LEVEL_MULTIPLIER = 50;  // XP needed for level N = N * this value

// ─── Level-up stat bonuses ───────────────────────────────────────────────────
const LEVELUP_MAX_HP   = 5;
const LEVELUP_ATTACK   = 1;
const LEVELUP_DEFENSE  = 1;

// ─── Depth scaling per completed run ────────────────────────────────────────
const DEPTH_HP_SCALE      = 8;  // +maxHp per depth level
const DEPTH_ATTACK_SCALE  = 2;  // +attack per depth level
const DEPTH_DEFENSE_SCALE = 1;  // +defense per depth level

// ─── Item drop rates ─────────────────────────────────────────────────────────
const DROP_POTION_BASE      = 0.35;  // base chance of a health potion drop per encounter
const DROP_POTION_PER_ENEMY = 0.05;  // additional chance per defeated enemy
const DROP_POTION_CAP       = 0.70;  // maximum chance regardless of enemy count
const DROP_ANTIDOTE         = 0.20;  // chance of an antidote (any depth)
const DROP_ELIXIR           = 0.15;  // chance of Elixir of Clarity (depth >= 1)
const DROP_ETHER            = 0.12;  // chance of Ether Flask (depth >= 2)
const DROP_ELIXIR_MIN_DEPTH = 1;     // minimum depth for Elixir drops
const DROP_ETHER_MIN_DEPTH  = 2;     // minimum depth for Ether Flask drops

/** Combined rewards returned by advanceEncounter(). */
export interface EncounterRewards {
  levelUps: LevelUpEvent[];
  /** Consumable items dropped by enemies this encounter. */
  droppedItems: Record<string, number>;
}

export class DungeonManager {
  /** Ordered list of enemy groups for this run. */
  private encounters: Enemy[][];
  /** Index of the current (or next) encounter. */
  private currentEncounterIndex: number = 0;
  /** Gold accumulated during this run. */
  private goldEarned: number = 0;

  constructor(private heroes: Hero[], private depth: number = 0) {
    this.encounters = DungeonManager.buildProceduralEncounters(depth);
  }

  // ─── Encounter flow ───────────────────────────────────────────────────────

  /** True when all encounters have been completed. */
  isComplete(): boolean {
    return this.currentEncounterIndex >= this.encounters.length;
  }

  /** Returns the enemies for the current encounter, or null if done. */
  getCurrentEncounter(): Enemy[] | null {
    if (this.isComplete()) return null;
    return this.encounters[this.currentEncounterIndex];
  }

  /**
   * Advance to the next encounter.
   * Call this after a CombatManager signals "victory".
   * `defeatedEnemies` — list of enemies from the just-finished fight,
   *   used to tally XP and gold rewards.
   * Returns combined rewards: level-up events and any items dropped by enemies.
   */
  advanceEncounter(defeatedEnemies: Enemy[]): EncounterRewards {
    const levelUps = this.awardRewards(defeatedEnemies);
    const droppedItems = this.generateDrops(defeatedEnemies.length);
    this.currentEncounterIndex += 1;
    return { levelUps, droppedItems };
  }

  /** Current encounter number (1-based) for display. */
  getEncounterNumber(): number {
    return this.currentEncounterIndex + 1;
  }

  getTotalEncounters(): number {
    return this.encounters.length;
  }

  getGoldEarned(): number {
    return this.goldEarned;
  }

  // ─── XP & leveling ────────────────────────────────────────────────────────

  /**
   * Award XP and gold to living heroes based on defeated enemies.
   * Called automatically by advanceEncounter().
   * Returns level-up events for any heroes that leveled up.
   */
  private awardRewards(defeatedEnemies: Enemy[]): LevelUpEvent[] {
    const totalXp = defeatedEnemies.length * BASE_XP_REWARD;
    const totalGold = defeatedEnemies.length * BASE_GOLD_REWARD;

    this.goldEarned += totalGold;

    const levelUps: LevelUpEvent[] = [];
    const livingHeroes = this.heroes.filter((h) => h.stats.hp > 0);
    for (const hero of livingHeroes) {
      hero.xp += totalXp;
      const evt = this.checkLevelUp(hero);
      if (evt) levelUps.push(evt);
    }
    return levelUps;
  }

  /**
   * Check if a hero has enough XP to level up and apply stat improvements.
   * XP threshold for level N = N * 50.
   * Returns a LevelUpEvent if the hero leveled up, otherwise null.
   */
  private checkLevelUp(hero: Hero): LevelUpEvent | null {
    const threshold = hero.level * XP_PER_LEVEL_MULTIPLIER;
    if (hero.xp >= threshold) {
      hero.xp -= threshold;
      hero.level += 1;

      // Stat improvements on level-up
      hero.stats.maxHp += LEVELUP_MAX_HP;
      hero.stats.hp = Math.min(hero.stats.hp + LEVELUP_MAX_HP, hero.stats.maxHp);
      hero.stats.attack += LEVELUP_ATTACK;
      hero.stats.defense += LEVELUP_DEFENSE;

      return { heroId: hero.id, heroName: hero.name, newLevel: hero.level };
    }
    return null;
  }

  /**
   * Randomly generate consumable item drops for the encounter just completed.
   * Drop rates scale with dungeon depth to reward deeper runs.
   */
  private generateDrops(enemyCount: number): Record<string, number> {
    const drops: Record<string, number> = {};
    const add = (itemId: string): void => {
      drops[itemId] = (drops[itemId] ?? 0) + 1;
    };

    // Health potion: base chance + bonus per enemy defeated, capped
    const potionChance = Math.min(DROP_POTION_CAP, DROP_POTION_BASE + enemyCount * DROP_POTION_PER_ENEMY);
    if (Math.random() < potionChance) add("health_potion");

    // Antidote: available at any depth
    if (Math.random() < DROP_ANTIDOTE) add("antidote");

    // Elixir of Clarity (cures stun/freeze/fear/blind): unlocked at depth 1+
    if (this.depth >= DROP_ELIXIR_MIN_DEPTH && Math.random() < DROP_ELIXIR) add("elixir_of_clarity");

    // Ether Flask (resets cooldowns): unlocked at depth 2+
    if (this.depth >= DROP_ETHER_MIN_DEPTH && Math.random() < DROP_ETHER) add("ether_flask");

    return drops;
  }

  // ─── Factory ──────────────────────────────────────────────────────────────

  /**
   * Build a procedurally generated 3-encounter dungeon.
   *
   * Enemies are drawn from four difficulty tiers and their base stats are
   * scaled by `depth` so that each completed run becomes harder.
   *
   * Tier 0 (intro) : Giant Rat, Goblin
   * Tier 1 (easy)  : Zombie, Giant Spider
   * Tier 2 (medium): Orc Brute, Skeleton Mage, Dark Archer, Harpy, Wight
   * Tier 3 (hard)  : Troll Brute, Minotaur, Basilisk
   * Tier 4 (boss)  : Fire Drake
   *
   * Depth 0:
   *   Encounter 1 — 1 Tier-0 enemy
   *   Encounter 2 — 1 Tier-0 + 1 Tier-1 enemy
   *   Encounter 3 — 1 Tier-2 + 1 Tier-1 enemy
   *
   * Depth 1+:
   *   Encounter 1 — 2 Tier-0/1 enemies
   *   Encounter 2 — 1 Tier-1 + 1 Tier-2 enemy
   *   Encounter 3 — 1 Tier-3 + 1 Tier-2 enemy
   *
   * Depth 3+:
   *   Encounter 3 replaces one Tier-3 enemy with the Fire Drake boss
   *
   * Per-depth scaling: +8 maxHp, +2 attack, +1 defense per level.
   */
  private static buildProceduralEncounters(depth: number): Enemy[][] {
    // Unique id counter so two enemies of the same type can be targeted individually
    let seq = 0;
    const clone = (e: Enemy): Enemy => {
      const c = cloneEnemy(e);
      c.id = `${e.id}_${seq++}`;
      return c;
    };

    // Build a lookup map from the shared enemy pool
    const pool: Record<string, Enemy> = Object.fromEntries(
      SAMPLE_ENEMIES.map((e) => [e.id, e])
    );

    /** Pick and clone a random enemy from a list of ids */
    const pick = (ids: string[]): Enemy => {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const template = pool[id];
      if (!template) throw new Error(`DungeonManager: unknown enemy id "${id}"`);
      return clone(template);
    };

    /** Scale a cloned enemy's stats by the current dungeon depth */
    const scale = (enemy: Enemy): Enemy => {
      enemy.stats.maxHp   += depth * DEPTH_HP_SCALE;
      enemy.stats.hp       = enemy.stats.maxHp;
      enemy.stats.attack  += depth * DEPTH_ATTACK_SCALE;
      enemy.stats.defense += depth * DEPTH_DEFENSE_SCALE;
      return enemy;
    };

    const tier0 = ["enemy_giant_rat", "enemy_goblin"];
    const tier1 = ["enemy_zombie", "enemy_giant_spider"];
    const tier2 = ["enemy_orc", "enemy_skeleton_mage", "enemy_dark_archer", "enemy_harpy", "enemy_wight", "enemy_cultist"];
    const tier3 = ["enemy_troll", "enemy_minotaur", "enemy_basilisk", "enemy_lich"];
    const tier4 = ["enemy_fire_drake"];

    let enc1: Enemy[];
    let enc2: Enemy[];
    let enc3: Enemy[];

    if (depth === 0) {
      // Gentle introduction
      enc1 = [scale(pick(tier0))];
      enc2 = [scale(pick(tier0)), scale(pick(tier1))];
      enc3 = [scale(pick(tier2)), scale(pick(tier1))];
    } else if (depth < 3) {
      // Growing threat
      enc1 = [scale(pick(tier0)), scale(pick(tier1))];
      enc2 = [scale(pick(tier1)), scale(pick(tier2))];
      enc3 = [scale(pick(tier3)), scale(pick(tier2))];
    } else {
      // Deep dungeon — boss encounters
      enc1 = [scale(pick(tier1)), scale(pick(tier2))];
      enc2 = [scale(pick(tier2)), scale(pick(tier3))];
      enc3 = [scale(pick(tier4)), scale(pick(tier2))];
    }

    return [enc1, enc2, enc3];
  }
}
