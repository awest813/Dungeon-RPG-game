import type { Hero, Enemy, Combatant, BattleState, SkillResult } from "../types/GameTypes";
import { isHero, cloneEnemy } from "../types/GameTypes";
import { tickStatuses, hasStatusFlag, removeStatus, applyStatus } from "./StatusSystem";
import { resolveSkill } from "./SkillResolver";
import { SKILLS } from "../data/skills";
import { ITEMS } from "../data/items";

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
  /**
   * Per-enemy cooldown tracker (mirrors the hero skillCooldowns system).
   * Maps enemyId → skillId → remaining cooldown turns.
   */
  private enemyCooldowns: Record<string, Record<string, number>> = {};
  /** Reference to the party's shared consumable inventory. */
  private partyItems: Record<string, number>;

  constructor(heroes: Hero[], enemies: Enemy[], partyItems: Record<string, number> = {}) {
    // Heroes are used directly (no deep-copy) so HP, XP, and levels persist
    // across encounters in the same dungeon run.
    this.heroes = heroes;
    // Deep-copy enemies so each encounter starts with fresh HP.
    this.enemies = enemies.map(cloneEnemy);
    this.partyItems = partyItems;
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
   * Returns the next N living combatants who will act after the current one
   * (within the current round). Useful for the turn-order preview UI.
   */
  getUpcomingActors(n: number = 3): Combatant[] {
    const upcoming: Combatant[] = [];
    let idx = this.currentTurnIndex + 1;
    while (upcoming.length < n && idx < this.turnOrder.length) {
      const c = this.turnOrder[idx];
      if (c && this.isAlive(c)) {
        upcoming.push(c);
      }
      idx++;
    }
    return upcoming;
  }

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
   * If the current actor is stunned, consume their turn and return a result.
   * Returns null if the actor is not stunned (normal flow continues).
   * Call this before showing the hero UI or executing an enemy turn.
   */
  processStunIfNeeded(): { result: SkillResult; state: BattleState } | null {
    const actor = this.getCurrentActor();
    if (!actor || !hasStatusFlag(actor, "stunned")) return null;

    removeStatus(actor, "stun");
    const msg = `${actor.name} is stunned and loses their turn!`;
    this.log.push(msg);
    this.advanceTurn();
    return {
      result: { actorId: actor.id, targetId: "", skillId: "stun", hpChange: 0, message: msg },
      state: this.getBattleState(),
    };
  }

  /**
   * Execute an action for the current actor.
   * `skillId` — which skill to use.
   * `targetId` — id of the target combatant. Pass `"aoe"` for area-of-effect skills.
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

    const skill = SKILLS[skillId];

    // ── AoE targeting ────────────────────────────────────────────────────────
    if (skill?.targetType === "all_enemies") {
      const targets = isHero(actor)
        ? this.enemies.filter((e) => e.stats.hp > 0)
        : this.heroes.filter((h) => h.stats.hp > 0);

      let totalHpChange = 0;
      const messages: string[] = [];
      let lastStatus: SkillResult["statusApplied"];

      for (const t of targets) {
        const r = resolveSkill(actor, t, skillId);
        totalHpChange += r.hpChange;
        messages.push(r.message);
        if (r.statusApplied) lastStatus = r.statusApplied;
      }

      const combinedMsg = messages.join(" ");
      this.log.push(combinedMsg);

      if (isHero(actor) && skill?.cooldown) {
        actor.skillCooldowns[skillId] = skill.cooldown;
      }

      this.advanceTurn();
      return {
        result: { actorId: actor.id, targetId: "all_enemies", skillId, hpChange: totalHpChange, statusApplied: lastStatus, message: combinedMsg },
        state: this.getBattleState(),
      };
    }

    if (skill?.targetType === "all_allies") {
      const targets = isHero(actor)
        ? this.heroes.filter((h) => h.stats.hp > 0)
        : this.enemies.filter((e) => e.stats.hp > 0);

      let totalHpChange = 0;
      const messages: string[] = [];

      for (const t of targets) {
        const r = resolveSkill(actor, t, skillId);
        totalHpChange += r.hpChange;
        messages.push(r.message);
      }

      const combinedMsg = messages.join(" ");
      this.log.push(combinedMsg);

      if (isHero(actor) && skill?.cooldown) {
        actor.skillCooldowns[skillId] = skill.cooldown;
      }

      this.advanceTurn();
      return {
        result: { actorId: actor.id, targetId: "all_allies", skillId, hpChange: totalHpChange, message: combinedMsg },
        state: this.getBattleState(),
      };
    }

    // ── Single-target ────────────────────────────────────────────────────────
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
   * Simple AI: pick a random ready (not on cooldown) skill and target a random living hero.
   */
  executeEnemyTurn(): { result: SkillResult; state: BattleState } | null {
    const actor = this.getCurrentActor();
    if (!actor || isHero(actor)) return null;

    // Check if the enemy is stunned — if so, skip their turn
    const stunSkip = this.processStunIfNeeded();
    if (stunSkip) return stunSkip;

    const livingHeroes = this.heroes.filter((h) => this.isAlive(h));
    if (livingHeroes.length === 0) {
      return { result: { actorId: actor.id, targetId: "", skillId: "", hpChange: 0, message: "No heroes to target." }, state: "defeat" };
    }

    // Select a skill that is not on cooldown; fall back to any skill if all are cooling down
    const enemyCds = this.enemyCooldowns[actor.id] ?? {};
    const readySkills = actor.skillIds.filter((sid) => (enemyCds[sid] ?? 0) === 0);
    const skillPool = readySkills.length > 0 ? readySkills : actor.skillIds;
    const skillId = skillPool[Math.floor(Math.random() * skillPool.length)];

    const skill = SKILLS[skillId];

    // Set enemy cooldown after choosing the skill (before executeAction advances the turn)
    if (skill?.cooldown) {
      if (!this.enemyCooldowns[actor.id]) this.enemyCooldowns[actor.id] = {};
      this.enemyCooldowns[actor.id][skillId] = skill.cooldown;
    }

    const target = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];

    // AoE skills — pass "aoe" sentinel; executeAction handles the targeting
    if (skill?.targetType === "all_enemies" || skill?.targetType === "all_allies") {
      return this.executeAction(skillId, "aoe");
    }

    // If the skill targets self (like guard), resolve on actor instead
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
    } else if (actor && !isHero(actor)) {
      this.tickEnemyCooldowns(actor.id);
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

  /** Decrement all skill cooldowns by 1 for an enemy after their turn. */
  private tickEnemyCooldowns(enemyId: string): void {
    const cds = this.enemyCooldowns[enemyId];
    if (!cds) return;
    for (const skillId of Object.keys(cds)) {
      if (cds[skillId] > 0) cds[skillId] -= 1;
    }
  }

  /**
   * Use a consumable item from the shared party inventory.
   * Consumes one unit of the item, resolves its effect, advances the turn.
   *
   * `itemId`   — the item to use (must exist in partyItems with qty > 0).
   * `targetId` — combatant id for single-target items;
   *              pass the current actor's id for "self" items;
   *              pass "all_enemies" for area items (handled internally).
   */
  useItem(itemId: string, targetId: string): { result: SkillResult; state: BattleState } {
    const actor = this.getCurrentActor();
    if (!actor || !isHero(actor)) {
      this.advanceTurn();
      return {
        result: { actorId: "", targetId, skillId: itemId, hpChange: 0, message: "No valid actor." },
        state: this.getBattleState(),
      };
    }

    const item = ITEMS[itemId];
    if (!item || (this.partyItems[itemId] ?? 0) <= 0) {
      return {
        result: { actorId: actor.id, targetId, skillId: itemId, hpChange: 0, message: `No ${item?.name ?? itemId} available.` },
        state: this.getBattleState(),
      };
    }

    let hpChange = 0;
    let statusApplied: SkillResult["statusApplied"];
    let message = "";

    if (item.targetType === "all_enemies") {
      // AoE item (e.g. smoke bomb) — apply to all living enemies
      const livingEnemies = this.enemies.filter((e) => e.stats.hp > 0);
      const msgs: string[] = [];
      for (const e of livingEnemies) {
        if (item.appliesStatus) {
          applyStatus(e, { ...item.appliesStatus });
          msgs.push(`${e.name}`);
          statusApplied = { ...item.appliesStatus };
        }
      }
      message = `${actor.name} uses ${item.name}! ${statusApplied?.name ?? ""} applied to: ${msgs.join(", ")}.`;
    } else {
      const target = this.findCombatant(targetId);
      if (!target) {
        return {
          result: { actorId: actor.id, targetId, skillId: itemId, hpChange: 0, message: `Target "${targetId}" not found.` },
          state: this.getBattleState(),
        };
      }

      if (item.type === "heal" && item.power) {
        hpChange = item.power;
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + hpChange);
        message = `${actor.name} uses ${item.name} on ${target.name}, restoring ${hpChange} HP. (${target.stats.hp}/${target.stats.maxHp} HP)`;
      } else if (item.type === "cleanse" && item.removesStatusIds) {
        const removed: string[] = [];
        for (const sid of item.removesStatusIds) {
          if (target.statusEffects.some((s) => s.id === sid)) {
            removeStatus(target, sid);
            removed.push(sid);
          }
        }
        message = removed.length > 0
          ? `${actor.name} uses ${item.name} on ${target.name}, curing ${removed.join(", ")}.`
          : `${actor.name} uses ${item.name} on ${target.name}, but there was nothing to cure.`;
      } else if (item.type === "buff") {
        if (item.resetsCooldowns && isHero(target)) {
          target.skillCooldowns = {};
          message = `${actor.name} drinks ${item.name} — all of ${target.name}'s skill cooldowns are reset!`;
        }
        if (item.appliesStatus) {
          applyStatus(target, { ...item.appliesStatus });
          statusApplied = { ...item.appliesStatus };
          message += ` ${target.name} is now affected by ${item.appliesStatus.name}.`;
        }
      }
    }

    this.log.push(message);

    // Deduct one unit from party inventory
    this.partyItems[itemId] = (this.partyItems[itemId] ?? 1) - 1;
    if (this.partyItems[itemId] <= 0) delete this.partyItems[itemId];

    this.advanceTurn();

    return {
      result: { actorId: actor.id, targetId, skillId: itemId, hpChange, statusApplied, message },
      state: this.getBattleState(),
    };
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
