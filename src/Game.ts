import { Engine } from "@babylonjs/core";
import { BaseScene } from "./scenes/BaseScene";
import { BootScene } from "./scenes/BootScene";
import { TownScene } from "./scenes/TownScene";
import { CombatScene } from "./scenes/CombatScene";

/**
 * Game — the top-level controller.
 * Owns the Babylon Engine and manages scene switching.
 */
export class Game {
  private engine: Engine;
  private activeScene: BaseScene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);

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
    this.switchTo(new TownScene(this.engine, () => this.goToCombat()));
  }

  private goToCombat(): void {
    this.switchTo(new CombatScene(this.engine, () => this.goToTown()));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private switchTo(next: BaseScene): void {
    this.activeScene?.dispose();
    this.activeScene = next;
    next.init();
  }
}
