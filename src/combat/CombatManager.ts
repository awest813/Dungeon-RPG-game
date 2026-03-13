import type { Hero, Enemy, Combatant, BattleState, SkillResult } from "../types/GameTypes";
import { isHero } from "../types/GameTypes";
import { tickStatuses } from "./StatusSystem";
import { resolveSkill } from "./SkillResolver";
import { SKILLS } from "../data/skills";

/**
 * CombatManager handles all combat flow:
 * - storing teams
 * - building turn order from speed
 * - advancing turns
 * - triggering status ticks
 * - detecting victory / defeat
 * - tracking per-hero skill cooldowns
 */
export class CombatManager {
  private heroes: Hero[];
  private enemies: Enemy[];
  private turnOrder: Combatant[] = [];
  private currentTurnIndex: number = 0;
  private round: number = 0;
  private log: string[] = [];

  constructor(heroes: Hero[], enemies: Enemy[]) {
    // Deep-copy so we don't mutate the original data
    this.heroes = heroes.map((h) => JSON.parse(JSON.stringify(h)) as Hero);
    this.enemies = enemies.map((e) => JSON.parse(JSON.stringify(e)) as Enemy);
    this.buildTurnOrder();
  }

  // ─── Turn order ────────────────────────────────────────────────────────────

  /** Sort all living combatants by speed (highest goes first). */
  private buildTurnOrder(): void {
    this.turnOrder = [...this.heroes, ...this.enemies].sort(
      (a, b) => b.stats.speed - a.stats.speed
    );
  }

  /** Rebuild turn order at the start of each round (handles deaths). */
  private refreshTurnOrder(): void {
    this.turnOrder = this.turnOrder.filter((c) => c.stats.hp > 0);
  }

  // ─── State helpers ─────────────────────────────────────────────────────────

  isAlive(c: Combatant): boolean {
    return c.stats.hp > 0;
  }

  getBattleState(): BattleState {
    const heroesAlive = this.heroes.some((h) => this.isAlive(h));
    const enemiesAlive = this.enemies.some((e) => this.isAlive(e));

    if (!enemiesAlive) return "victory";
    if (!heroesAlive) return "defeat";
    return "ongoing";
  }

  getHeroes(): Hero[] { return this.heroes; }
  getEnemies(): Enemy[] { return this.enemies; }
  getCurrentActor(): Combatant | null {
    return this.turnOrder[this.currentTurnIndex] ?? null;
  }
  getRound(): number { return this.round; }
  getLog(): string[] { return [...this.log]; }

  /**
   * Returns the remaining cooldown turns for a hero's skill.
   * 0 means the skill is ready to use.
   */
  getSkillCooldown(heroId: string, skillId: string): number {
    const hero = this.heroes.find((h) => h.id === heroId);
    return hero?.skillCooldowns[skillId] ?? 0;
  }

  // ─── Turn execution ────────────────────────────────────────────────────────

  /**
   * Execute an action for the current actor.
   * `skillId` — which skill to use.
   * `targetId` — id of the target combatant.
   * Returns the SkillResult, advances the turn, and returns battle state.
   */
  executeAction(skillId: string, targetId: string): { result: SkillResult; state: BattleState } {
    const actor = this.getCurrentActor();
    if (!actor || !this.isAlive(actor)) {
      this.advanceTurn();
      return {
        result: { actorId: "", targetId, skillId, hpChange: 0, message: "No valid actor." },
        state: this.getBattleState(),
      };
    }

    // Guard against using a skill that is still on cooldown
    if (isHero(actor)) {
      const cd = actor.skillCooldowns[skillId] ?? 0;
      if (cd > 0) {
        return {
          result: { actorId: actor.id, targetId, skillId, hpChange: 0, message: `${actor.name}'s ${skillId} is on cooldown (${cd} turns remaining).` },
          state: this.getBattleState(),
        };
      }
    }

    const target = this.findCombatant(targetId);
    if (!target) {
      return {
        result: { actorId: actor.id, targetId, skillId, hpChange: 0, message: `Target "${targetId}" not found.` },
        state: this.getBattleState(),
      };
    }

    const result = resolveSkill(actor, target, skillId);
    this.log.push(result.message);

    // Set cooldown on the hero after a successful skill use
    if (isHero(actor)) {
      const skill = SKILLS[skillId];
      if (skill?.cooldown) {
        actor.skillCooldowns[skillId] = skill.cooldown;
      }
    }

    this.advanceTurn();

    return { result, state: this.getBattleState() };
  }

  /**
   * Auto-resolve a turn for an AI-controlled enemy.
   * Simple AI: pick a random skill and target a random living hero.
   */
  executeEnemyTurn(): { result: SkillResult; state: BattleState } | null {
    const actor = this.getCurrentActor();
    if (!actor || isHero(actor)) return null;

    const livingHeroes = this.heroes.filter((h) => this.isAlive(h));
    if (livingHeroes.length === 0) {
      return { result: { actorId: actor.id, targetId: "", skillId: "", hpChange: 0, message: "No heroes to target." }, state: "defeat" };
    }

    const target = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];
    const skillId = actor.skillIds[Math.floor(Math.random() * actor.skillIds.length)];

    // If the skill targets self (like guard), resolve on actor instead
    const skill = SKILLS[skillId];
    const resolvedTarget = skill?.targetType === "self" ? actor : target;

    return this.executeAction(skillId, resolvedTarget.id);
  }

  // ─── Round management ──────────────────────────────────────────────────────

  /** Called after each combatant's turn. Advances to next living combatant. */
  private advanceTurn(): void {
    // Tick down cooldowns for the actor that just acted
    const actor = this.turnOrder[this.currentTurnIndex];
    if (actor && isHero(actor)) {
      this.tickCooldowns(actor);
    }

    this.currentTurnIndex += 1;

    // Start a new round if we've gone through all combatants
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.startNewRound();
    } else {
      // Skip dead combatants mid-round
      while (
        this.currentTurnIndex < this.turnOrder.length &&
        !this.isAlive(this.turnOrder[this.currentTurnIndex])
      ) {
        this.currentTurnIndex += 1;
      }
      // If we hit the end mid-skip, start new round
      if (this.currentTurnIndex >= this.turnOrder.length) {
        this.startNewRound();
      }
    }
  }

  /**
   * Decrement all skill cooldowns by 1 for a hero after their turn.
   * Cooldowns reach 0 when ready to use again.
   */
  private tickCooldowns(hero: Hero): void {
    for (const skillId of Object.keys(hero.skillCooldowns)) {
      if (hero.skillCooldowns[skillId] > 0) {
        hero.skillCooldowns[skillId] -= 1;
      }
    }
  }

  /** Start a new round: tick statuses, rebuild turn order. */
  private startNewRound(): void {
    this.round += 1;
    this.log.push(`─── Round ${this.round} ───`);

    // Tick status effects for all living combatants
    for (const c of [...this.heroes, ...this.enemies]) {
      if (this.isAlive(c)) {
        const tickLog = tickStatuses(c);
        this.log.push(...tickLog);
      }
    }

    this.refreshTurnOrder();
    this.currentTurnIndex = 0;
  }

  /** Start combat (call this after constructing to begin round 1). */
  start(): void {
    this.round = 1;
    this.currentTurnIndex = 0;
    this.log.push(`─── Round ${this.round} ───`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private findCombatant(id: string): Combatant | undefined {
    return (
      this.heroes.find((h) => h.id === id) ??
      this.enemies.find((e) => e.id === id)
    );
  }

  /** Returns all living heroes and enemies for UI rendering. */
  getLivingCombatants(): Combatant[] {
    return [...this.heroes, ...this.enemies].filter((c) => this.isAlive(c));
  }
}
