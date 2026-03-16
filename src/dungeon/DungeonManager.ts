import type { Hero, Enemy, LevelUpEvent } from "../types/GameTypes";
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

export class DungeonManager {
  /** Ordered list of enemy groups for this run. */
  private encounters: Enemy[][];
  /** Index of the current (or next) encounter. */
  private currentEncounterIndex: number = 0;
  /** Gold accumulated during this run. */
  private goldEarned: number = 0;

  constructor(private heroes: Hero[], depth: number = 0) {
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
   * Returns level-up events for any heroes that leveled up.
   */
  advanceEncounter(defeatedEnemies: Enemy[]): LevelUpEvent[] {
    const levelUps = this.awardRewards(defeatedEnemies);
    this.currentEncounterIndex += 1;
    return levelUps;
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

  // ─── Factory ──────────────────────────────────────────────────────────────

  /**
   * Build a procedurally generated 3-encounter dungeon.
   *
   * Enemies are drawn from three difficulty tiers and their base stats are
   * scaled by `depth` so that each completed run becomes harder.
   *
   * Tier 1 (easy)  : Goblin, Dark Archer
   * Tier 2 (medium): Skeleton Mage, Dark Archer
   * Tier 3 (hard)  : Orc Brute, Troll Brute
   *
   * Encounter 1 — 1 Tier-1 enemy (depth 0) or 2 Tier-1 enemies (depth ≥ 1)
   * Encounter 2 — 1 Tier-1 + 1 Tier-2 enemy
   * Encounter 3 — 1 Tier-3 + 1 Tier-2 enemy (boss encounter)
   *
   * Per-depth scaling: +8 maxHp, +2 attack, +1 defense per level.
   */
  private static buildProceduralEncounters(depth: number): Enemy[][] {
    // Unique id counter so two enemies of the same type can be targeted individually
    let seq = 0;
    const clone = (e: Enemy): Enemy => {
      const c = JSON.parse(JSON.stringify(e)) as Enemy;
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

    const tier1 = ["enemy_goblin", "enemy_dark_archer"];
    const tier2 = ["enemy_skeleton_mage", "enemy_dark_archer"];
    const tier3 = ["enemy_orc", "enemy_troll"];

    // Encounter 1 — easy opener
    const enc1: Enemy[] =
      depth === 0
        ? [scale(pick(tier1))]
        : [scale(pick(tier1)), scale(pick(tier1))];

    // Encounter 2 — moderate threat
    const enc2: Enemy[] = [scale(pick(tier1)), scale(pick(tier2))];

    // Encounter 3 — boss encounter
    const enc3: Enemy[] = [scale(pick(tier3)), scale(pick(tier2))];

    return [enc1, enc2, enc3];
  }
}
