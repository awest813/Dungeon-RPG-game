import type { Hero, Enemy } from "../types/GameTypes";
import { SAMPLE_ENEMIES } from "../data/enemies";

/**
 * DungeonManager — orchestrates multi-encounter dungeon runs.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * NEXT MILESTONE: Dungeon Progression System
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Planned features for the next development milestone:
 *
 * 1. ENCOUNTER PROGRESSION
 *    - A dungeon consists of N sequential encounters (e.g. 3 fights).
 *    - Heroes persist between encounters with their HP from the previous fight.
 *    - After clearing all encounters the dungeon is "complete" and the party
 *      returns to town with rewards.
 *
 * 2. EXPERIENCE & LEVELING
 *    - Each defeated enemy awards XP to the surviving heroes.
 *    - Heroes level up when XP crosses a threshold.
 *    - On level-up: increase max HP, attack, and defense slightly.
 *
 * 3. LOOT / REWARDS
 *    - Enemies drop gold on defeat.
 *    - Gold is tracked per-run and handed to the town on completion.
 *    - (Future: add items/equipment in a later milestone.)
 *
 * 4. TOWN UPGRADES (downstream)
 *    - Spend gold in town on upgrades (e.g. Blacksmith → +attack,
 *      Alchemist → +heal power, Inn → restore HP before next dungeon).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Implementation notes (TODO for next milestone):
 *   - Replace SAMPLE_ENEMIES with a procedurally chosen encounter list.
 *   - Pass the same hero array through each CombatManager instance so HP
 *     changes persist across encounters.
 *   - Wire DungeonManager into Game.ts: Game calls dungeon.nextEncounter()
 *     after each CombatScene victory, and dungeon.isComplete() to know when
 *     to show the dungeon-complete summary before returning to town.
 * ──────────────────────────────────────────────────────────────────────────────
 */
// ─── Reward constants (easy to tune) ────────────────────────────────────────
const BASE_XP_REWARD = 20;           // XP awarded per defeated enemy
const BASE_GOLD_REWARD = 10;         // Gold awarded per defeated enemy
const XP_PER_LEVEL_MULTIPLIER = 50;  // XP needed for level N = N * this value

// ─── Level-up stat bonuses ───────────────────────────────────────────────────
const LEVELUP_MAX_HP   = 5;
const LEVELUP_ATTACK   = 1;
const LEVELUP_DEFENSE  = 1;

export class DungeonManager {
  /** Ordered list of enemy groups for this run. */
  private encounters: Enemy[][];
  /** Index of the current (or next) encounter. */
  private currentEncounterIndex: number = 0;
  /** Gold accumulated during this run. */
  private goldEarned: number = 0;

  constructor(private heroes: Hero[], encounters?: Enemy[][]) {
    // Default to a simple 3-encounter dungeon built from the sample enemy pool
    this.encounters = encounters ?? DungeonManager.buildDefaultEncounters();
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
   */
  advanceEncounter(defeatedEnemies: Enemy[]): void {
    this.awardRewards(defeatedEnemies);
    this.currentEncounterIndex += 1;
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
   */
  private awardRewards(defeatedEnemies: Enemy[]): void {
    const totalXp = defeatedEnemies.length * BASE_XP_REWARD;
    const totalGold = defeatedEnemies.length * BASE_GOLD_REWARD;

    this.goldEarned += totalGold;

    const livingHeroes = this.heroes.filter((h) => h.stats.hp > 0);
    for (const hero of livingHeroes) {
      hero.xp += totalXp;
      this.checkLevelUp(hero);
    }
  }

  /**
   * Check if a hero has enough XP to level up and apply stat improvements.
   * XP threshold for level N = N * 50.
   */
  private checkLevelUp(hero: Hero): void {
    const threshold = hero.level * XP_PER_LEVEL_MULTIPLIER;
    if (hero.xp >= threshold) {
      hero.xp -= threshold;
      hero.level += 1;

      // Stat improvements on level-up
      hero.stats.maxHp += LEVELUP_MAX_HP;
      hero.stats.hp = Math.min(hero.stats.hp + LEVELUP_MAX_HP, hero.stats.maxHp);
      hero.stats.attack += LEVELUP_ATTACK;
      hero.stats.defense += LEVELUP_DEFENSE;
    }
  }

  // ─── Factory ──────────────────────────────────────────────────────────────

  /**
   * Build a simple default 3-encounter dungeon from the sample enemy pool.
   * Returns deep copies so combat mutations don't affect future encounters.
   */
  private static buildDefaultEncounters(): Enemy[][] {
    const clone = (e: Enemy): Enemy => JSON.parse(JSON.stringify(e)) as Enemy;

    const [goblin, orc, skeletonMage] = SAMPLE_ENEMIES;

    return [
      // Encounter 1 — easy opener
      [clone(goblin), clone(goblin)],
      // Encounter 2 — moderate threat
      [clone(goblin), clone(skeletonMage)],
      // Encounter 3 — boss encounter
      [clone(orc), clone(skeletonMage)],
    ];
  }
}
