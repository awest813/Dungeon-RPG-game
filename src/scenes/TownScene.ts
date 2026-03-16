import {
  Color4,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
} from "@babylonjs/core";
import type { Engine } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import type { Hero } from "../types/GameTypes";

/** Options passed to TownScene by Game. */
export interface TownSceneOptions {
  /** Live hero party — read for stats display. */
  heroes: Hero[];
  /**
   * Getter for current gold (called fresh each render so the shop display
   * stays up-to-date after upgrades).
   */
  getGold: () => number;
  /** Number of completed dungeon runs — shown in the UI and used to set expectations. */
  dungeonDepth?: number;
  /**
   * Apply a shop upgrade. Returns the new gold total on success, or -1 if
   * the party cannot afford it.
   */
  onUpgrade: (type: "blacksmith" | "inn" | "alchemist") => number;
  /** Start a new dungeon run. */
  onEnterDungeon: () => void;
}

/**
 * TownScene — the hub between dungeon runs.
 *
 * Shows:
 *   - Party stats (HP, level, XP) for each hero.
 *   - Current gold and an upgrade shop (Blacksmith / Inn / Alchemist).
 *   - An "Enter Dungeon" button to start the next run.
 */
export class TownScene extends BaseScene {
  constructor(engine: Engine, private options: TownSceneOptions) {
    super(engine);
  }

  init(): void {
    this.scene.clearColor = new Color4(0.1, 0.08, 0.06, 1);

    // Camera
    const camera = new FreeCamera("townCam", new Vector3(0, 5, -10), this.scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.engine.getRenderingCanvas()!, true);

    // Lighting
    const light = new HemisphericLight("townLight", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;

    // Ground
    MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, this.scene);

    // A few placeholder "buildings"
    for (let i = -2; i <= 2; i++) {
      const box = MeshBuilder.CreateBox(`building_${i}`, { height: 2, width: 1.5, depth: 1.5 }, this.scene);
      box.position.set(i * 3, 1, 4);
    }

    this.showTownUI();
  }

  // ─── Town UI ──────────────────────────────────────────────────────────────

  private showTownUI(): void {
    const panel = document.createElement("div");
    panel.id = "town-ui";
    panel.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; font-family: serif; color: #c8a96e;
      background: rgba(0,0,0,0.55); pointer-events: none;
    `;

    // Inner card (pointer-events restored)
    const card = document.createElement("div");
    card.style.cssText = `
      pointer-events: auto;
      background: rgba(10,6,20,0.92); border: 2px solid #c8a96e;
      border-radius: 6px; padding: 24px 32px;
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      min-width: 340px;
    `;

    // Title
    const title = document.createElement("h2");
    title.style.cssText = "margin:0; font-size:1.8rem; text-shadow: 0 0 8px #c8a96e;";
    title.textContent = "Town";

    card.appendChild(title);
    if ((this.options.dungeonDepth ?? 0) > 0) {
      const depthLabel = document.createElement("div");
      depthLabel.style.cssText = "font-size:0.8rem; color:#a07040; letter-spacing:1px;";
      depthLabel.textContent = `Dungeon Depth: ${this.options.dungeonDepth}`;
      card.appendChild(depthLabel);
    }
    card.appendChild(this.buildPartyPanel());
    card.appendChild(this.buildGoldRow());
    card.appendChild(this.buildShopPanel());
    card.appendChild(this.buildEnterDungeonBtn());

    panel.appendChild(card);
    document.body.appendChild(panel);
  }

  // ─── Party stats ──────────────────────────────────────────────────────────

  private buildPartyPanel(): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText = `
      width: 100%; border: 1px solid #5a3a1e; border-radius: 4px;
      padding: 8px 12px; font-size: 0.85rem;
    `;

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.75rem; color:#888; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;";
    heading.textContent = "Party";
    div.appendChild(heading);

    for (const hero of this.options.heroes) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; gap:12px; padding:3px 0;";
      const alive = hero.stats.hp > 0;
      const xpNeeded = hero.level * 50;
      row.innerHTML = `
        <span style="color:${alive ? "#8ab4f8" : "#555"}; font-weight:bold">${hero.name}</span>
        <span>Lv.${hero.level}</span>
        <span style="color:${alive ? "#c8a96e" : "#555"}">HP ${hero.stats.hp}/${hero.stats.maxHp}</span>
        <span style="color:#aaa">ATK ${hero.stats.attack} &nbsp; DEF ${hero.stats.defense}</span>
        <span style="color:#a0c080">XP ${hero.xp}/${xpNeeded}</span>
      `;
      div.appendChild(row);
    }

    return div;
  }

  // ─── Gold display ─────────────────────────────────────────────────────────

  private buildGoldRow(): HTMLElement {
    const div = document.createElement("div");
    div.id = "town-gold-display";
    div.style.cssText = "font-size:1rem; color:#ffd700;";
    div.textContent = `Gold: ${this.options.getGold()}`;
    return div;
  }

  // ─── Upgrade shop ─────────────────────────────────────────────────────────

  private buildShopPanel(): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText = `
      width: 100%; border: 1px solid #5a3a1e; border-radius: 4px; padding: 8px 12px;
    `;

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.75rem; color:#888; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;";
    heading.textContent = "Shop";
    div.appendChild(heading);

    const upgrades: Array<{
      type: "blacksmith" | "inn" | "alchemist";
      label: string;
      cost: number;
      desc: string;
    }> = [
      { type: "blacksmith", label: "Blacksmith", cost: 30, desc: "All heroes +3 ATK" },
      { type: "inn",        label: "Inn",        cost: 20, desc: "Restore all HP" },
      { type: "alchemist",  label: "Alchemist",  cost: 25, desc: "All heroes +10 Max HP, +1 DEF" },
    ];

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";

    for (const upg of upgrades) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        flex: 1; padding: 6px 8px; background: #2a1a0a; color: #c8a96e;
        border: 1px solid #c8a96e; font-family: serif; font-size: 0.85rem;
        cursor: pointer; border-radius: 3px; text-align: center;
      `;
      btn.innerHTML = `<strong>${upg.label}</strong><br><span style="color:#ffd700">${upg.cost}g</span><br><span style="font-size:0.75rem;color:#aaa">${upg.desc}</span>`;
      btn.title = upg.desc;
      btn.addEventListener("click", () => {
        const newGold = this.options.onUpgrade(upg.type);
        if (newGold < 0) {
          btn.style.borderColor = "#c0392b";
          setTimeout(() => (btn.style.borderColor = "#c8a96e"), 600);
          return;
        }
        // Refresh UI to reflect new hero stats and gold
        this.removeTownUI();
        this.showTownUI();
      });
      btnRow.appendChild(btn);
    }

    div.appendChild(btnRow);
    return div;
  }

  // ─── Enter dungeon ────────────────────────────────────────────────────────

  private buildEnterDungeonBtn(): HTMLElement {
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding: 10px 40px; background: #3a1e0e; color: #c8a96e;
      border: 2px solid #c8a96e; font-family: serif; font-size: 1.1rem;
      cursor: pointer; border-radius: 4px; margin-top: 4px;
    `;
    btn.textContent = "Enter Dungeon";
    btn.addEventListener("click", () => {
      this.removeTownUI();
      this.options.onEnterDungeon();
    });
    return btn;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private removeTownUI(): void {
    document.getElementById("town-ui")?.remove();
  }

  override dispose(): void {
    this.removeTownUI();
    super.dispose();
  }
}
