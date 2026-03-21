import { Engine } from "@babylonjs/core";
import { BaseScene } from "./scenes/BaseScene";
import { BootScene } from "./scenes/BootScene";
import { TownScene } from "./scenes/TownScene";
import { CombatScene } from "./scenes/CombatScene";
import { DungeonManager } from "./dungeon/DungeonManager";
import { SAMPLE_HEROES } from "./data/heroes";
import { ITEMS } from "./data/items";
import type { Hero, Enemy } from "./types/GameTypes";
import { cloneHero } from "./types/GameTypes";

/**
 * Game — the top-level controller.
 * Owns the Babylon Engine and manages scene switching.
 *
 * State that persists across scenes:
 *   heroes     — the party; their stats mutate in place during dungeon runs.
 *   gold       — accumulated from completed dungeon runs; spent on town upgrades.
 *   partyItems — shared consumable inventory; bought in town, used in combat.
 */
export class Game {
  private engine: Engine;
  private activeScene: BaseScene | null = null;

  /** Persistent hero party — mutated in place during combat. */
  private heroes: Hero[];
  /** Gold accumulated from completed dungeon runs. */
  private gold: number = 0;
  /** Number of completed dungeon runs; used to scale enemy difficulty. */
  private dungeonDepth: number = 0;
  /** Active dungeon run (null when in town). */
  private dungeon: DungeonManager | null = null;
  /** Shared consumable inventory — persists across encounters and runs. */
  private partyItems: Record<string, number> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    // Clone SAMPLE_HEROES once so we own a mutable copy.
    this.heroes = SAMPLE_HEROES.map(cloneHero);

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  /** Start the game — boot into BootScene. */
  start(): void {
    this.switchTo(new BootScene(this.engine, () => this.goToTown()));
  }

  /** Run the render loop. Call once after start(). */
  run(): void {
    this.engine.runRenderLoop(() => {
      this.activeScene?.getBabylonScene().render();
    });
  }

  // ─── Scene transitions ────────────────────────────────────────────────────

  private goToTown(): void {
    this.switchTo(
      new TownScene(this.engine, {
        heroes: this.heroes,
        getGold: () => this.gold,
        dungeonDepth: this.dungeonDepth,
        partyItems: this.partyItems,
        onUpgrade: (type) => this.applyUpgrade(type),
        onBuyItem: (itemId) => this.buyItem(itemId),
        onEnterDungeon: () => this.goToDungeon(),
      })
    );
  }

  private goToDungeon(): void {
    this.dungeon = new DungeonManager(this.heroes, this.dungeonDepth);
    this.goToNextEncounter();
  }

  private goToNextEncounter(): void {
    const enemies = this.dungeon!.getCurrentEncounter()!;
    this.switchTo(
      new CombatScene(this.engine, {
        heroes: this.heroes,
        enemies,
        encounterNum: this.dungeon!.getEncounterNumber(),
        totalEncounters: this.dungeon!.getTotalEncounters(),
        partyItems: this.partyItems,
        onVictory: (defeatedEnemies) => this.handleEncounterVictory(defeatedEnemies),
        onDefeat: () => this.handleDungeonDefeat(),
      })
    );
  }

  /** Called when the party wins an encounter. */
  private handleEncounterVictory(defeatedEnemies: Enemy[]): void {
    const { droppedItems } = this.dungeon!.advanceEncounter(defeatedEnemies);

    // Merge dropped items into the shared party inventory
    for (const [itemId, qty] of Object.entries(droppedItems)) {
      this.partyItems[itemId] = (this.partyItems[itemId] ?? 0) + qty;
    }

    if (this.dungeon!.isComplete()) {
      this.gold += this.dungeon!.getGoldEarned();
      this.dungeonDepth += 1;
      this.dungeon = null;
      this.goToTown();
    } else {
      // Clear status effects and cooldowns between encounters.
      for (const hero of this.heroes) {
        hero.statusEffects = [];
        hero.skillCooldowns = {};
      }
      this.goToNextEncounter();
    }
  }

  /** Called when the entire party is defeated. */
  private handleDungeonDefeat(): void {
    this.dungeon = null;
    // Restore heroes to full HP so they can try again.
    for (const hero of this.heroes) {
      hero.stats.hp = hero.stats.maxHp;
      hero.statusEffects = [];
      hero.skillCooldowns = {};
    }
    this.goToTown();
  }

  // ─── Town upgrades ────────────────────────────────────────────────────────

  /**
   * Apply a town upgrade if the party can afford it.
   * Returns the new gold total on success, or -1 if insufficient funds.
   *
   * Blacksmith (30g) — all heroes gain +3 attack.
   * Inn        (20g) — all heroes fully restored to max HP.
   * Alchemist  (25g) — all heroes gain +10 max HP and +1 defense.
   */
  private applyUpgrade(type: "blacksmith" | "inn" | "alchemist"): number {
    const costs: Record<string, number> = { blacksmith: 30, inn: 20, alchemist: 25 };
    const cost = costs[type];
    if (this.gold < cost) return -1;

    this.gold -= cost;

    for (const hero of this.heroes) {
      if (type === "blacksmith") {
        hero.stats.attack += 3;
      } else if (type === "inn") {
        hero.stats.hp = hero.stats.maxHp;
      } else {
        // alchemist
        hero.stats.maxHp += 10;
        hero.stats.hp = Math.min(hero.stats.hp + 10, hero.stats.maxHp);
        hero.stats.defense += 1;
      }
    }

    return this.gold;
  }

  /**
   * Purchase one unit of a consumable item from the Apothecary.
   * Returns the new gold total on success, or -1 if insufficient funds.
   */
  private buyItem(itemId: string): number {
    const item = ITEMS[itemId];
    if (!item || this.gold < item.cost) return -1;

    this.gold -= item.cost;
    this.partyItems[itemId] = (this.partyItems[itemId] ?? 0) + 1;

    return this.gold;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private switchTo(next: BaseScene): void {
    this.activeScene?.dispose();
    this.activeScene = next;
    next.init();
  }
}
