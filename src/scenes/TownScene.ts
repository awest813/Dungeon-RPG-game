import {
  Color3,
  Color4,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  StandardMaterial,
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
 * Visual style: Skyrim/Oblivion Elder Scrolls aesthetic.
 *
 * Shows:
 *   - Party stats (HP bars, level, XP bars) for each hero.
 *   - Current gold and an upgrade shop (Blacksmith / Inn / Alchemist).
 *   - An "Enter Dungeon" button to start the next run.
 */
export class TownScene extends BaseScene {
  constructor(engine: Engine, private options: TownSceneOptions) {
    super(engine);
  }

  init(): void {
    // ── deep twilight sky ──────────────────────────────────────────
    this.scene.clearColor = new Color4(0.055, 0.048, 0.072, 1);

    // Camera
    const camera = new FreeCamera("townCam", new Vector3(0, 5, -10), this.scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.engine.getRenderingCanvas()!, true);

    // Cool ambient sky-fill
    const sky = new HemisphericLight("townSky", new Vector3(0, 1, 0), this.scene);
    sky.intensity = 0.25;
    sky.diffuse  = new Color3(0.3, 0.3, 0.45);
    sky.groundColor = new Color3(0.1, 0.08, 0.06);

    // Warm torchlight from each "building"
    for (let i = -2; i <= 2; i++) {
      const tl = new PointLight(`torch_${i}`, new Vector3(i * 3, 2.5, 3.2), this.scene);
      tl.diffuse    = new Color3(1.0, 0.55, 0.1);
      tl.intensity  = 0.9;
      tl.range      = 6;
    }

    // ── Stone ground ───────────────────────────────────────────────
    const groundMat = new StandardMaterial("groundMat", this.scene);
    groundMat.diffuseColor = new Color3(0.18, 0.17, 0.20);
    groundMat.specularColor = new Color3(0.08, 0.08, 0.08);
    const ground = MeshBuilder.CreateGround("ground", { width: 24, height: 24 }, this.scene);
    ground.material = groundMat;

    // ── Buildings (stone-coloured boxes) ──────────────────────────
    const wallMat = new StandardMaterial("wallMat", this.scene);
    wallMat.diffuseColor = new Color3(0.28, 0.26, 0.30);
    wallMat.specularColor = new Color3(0.05, 0.05, 0.05);

    for (let i = -2; i <= 2; i++) {
      const h = 2 + Math.abs(i) * 0.4;
      const box = MeshBuilder.CreateBox(`building_${i}`, { height: h, width: 1.6, depth: 1.6 }, this.scene);
      box.position.set(i * 3, h / 2, 4.5);
      box.material = wallMat;
    }

    // ── Flagpole + banner ─────────────────────────────────────────
    const poleMat = new StandardMaterial("poleMat", this.scene);
    poleMat.diffuseColor = new Color3(0.55, 0.50, 0.38);
    const pole = MeshBuilder.CreateCylinder("pole", { height: 5, diameter: 0.08 }, this.scene);
    pole.position.set(0, 2.5, 1.5);
    pole.material = poleMat;

    const bannerMat = new StandardMaterial("bannerMat", this.scene);
    bannerMat.diffuseColor  = new Color3(0.55, 0.15, 0.08);
    bannerMat.emissiveColor = new Color3(0.1, 0.02, 0.01);
    const banner = MeshBuilder.CreatePlane("banner", { width: 0.6, height: 1.0 }, this.scene);
    banner.position.set(0.35, 4.3, 1.5);
    banner.material = bannerMat;

    this.showTownUI();
  }

  // ─── Town UI ──────────────────────────────────────────────────────────────

  private showTownUI(): void {
    const overlay = document.createElement("div");
    overlay.id = "town-ui";
    overlay.style.cssText = `
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.48);
      pointer-events: none;
      font-family: var(--font-body, 'Cinzel', Georgia, serif);
    `;

    // ── Card ──────────────────────────────────────────────────────
    const card = document.createElement("div");
    card.style.cssText = `
      pointer-events: auto;
      display: flex; flex-direction: column; align-items: stretch; gap: 12px;
      min-width: 380px; max-width: 480px; width: 90vw;
      background: rgba(8,8,14,0.96);
      border: 1px solid #4e4e5e;
      box-shadow: inset 0 0 0 1px rgba(78,78,94,0.3), 0 0 40px rgba(0,0,0,0.9);
      padding: 22px 26px 20px;
    `;

    card.appendChild(this.buildTitleRow());
    card.appendChild(this.buildDivider("◆"));
    card.appendChild(this.buildPartyPanel());
    card.appendChild(this.buildDivider("◆"));
    card.appendChild(this.buildGoldRow());
    card.appendChild(this.buildShopPanel());
    card.appendChild(this.buildDivider("◆"));
    card.appendChild(this.buildEnterDungeonBtn());

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ─── Title row ────────────────────────────────────────────────────────────

  private buildTitleRow(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:4px;";

    const title = document.createElement("h2");
    title.style.cssText = `
      margin: 0;
      font-family: var(--font-title, 'Cinzel Decorative', Georgia, serif);
      font-size: 1.55rem;
      font-weight: 700;
      color: #d4a840;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 14px rgba(212,168,64,0.5);
    `;
    title.textContent = "Town";
    wrap.appendChild(title);

    if ((this.options.dungeonDepth ?? 0) > 0) {
      const depth = document.createElement("div");
      depth.style.cssText = "font-size:0.65rem; color:#6a6a7a; letter-spacing:3px; text-transform:uppercase;";
      depth.textContent = `Dungeon Depth: ${this.options.dungeonDepth}`;
      wrap.appendChild(depth);
    }

    return wrap;
  }

  // ─── Party stats ──────────────────────────────────────────────────────────

  private buildPartyPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.className = "es-heading";
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;";
    heading.textContent = "Party";
    wrap.appendChild(heading);

    for (const hero of this.options.heroes) {
      wrap.appendChild(this.buildHeroRow(hero));
    }

    return wrap;
  }

  private buildHeroRow(hero: Hero): HTMLElement {
    const alive  = hero.stats.hp > 0;
    const hpPct  = Math.max(0, Math.round((hero.stats.hp / hero.stats.maxHp) * 100));
    const xpNeed = hero.level * 50;
    const xpPct  = Math.min(100, Math.round((hero.xp / xpNeed) * 100));

    const row = document.createElement("div");
    row.style.cssText = `
      display: grid;
      grid-template-columns: 1fr auto;
      column-gap: 14px;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #1e1e28;
    `;

    // Left: name + bars
    const left = document.createElement("div");
    left.style.cssText = "display:flex; flex-direction:column; gap:3px; min-width:0;";

    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex; align-items:baseline; gap:8px;";
    nameRow.innerHTML = `
      <span style="font-size:0.88rem; color:${alive ? "#aec8e8" : "#404050"}; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${hero.name}</span>
      <span style="font-size:0.65rem; color:#6a6a7a; letter-spacing:1px;">Lv.${hero.level}</span>
    `;
    left.appendChild(nameRow);

    // HP bar
    left.appendChild(this.makeBar(hpPct, "es-bar-hp", `HP ${hero.stats.hp}/${hero.stats.maxHp}`));
    // XP bar
    left.appendChild(this.makeBar(xpPct, "es-bar-xp", `XP ${hero.xp}/${xpNeed}`));

    row.appendChild(left);

    // Right: stats
    const right = document.createElement("div");
    right.style.cssText = "text-align:right; font-size:0.72rem; color:#7a7a8a; white-space:nowrap;";
    right.innerHTML = `
      <div>ATK <span style="color:#d8ceb8">${hero.stats.attack}</span></div>
      <div>DEF <span style="color:#d8ceb8">${hero.stats.defense}</span></div>
    `;
    row.appendChild(right);

    return row;
  }

  /** Creates an HP/XP bar element with a tooltip. */
  private makeBar(pct: number, cls: string, title: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "es-bar-wrap";
    wrap.title = title;
    const fill = document.createElement("div");
    fill.className = `es-bar-fill ${cls}`;
    fill.style.width = `${pct}%`;
    wrap.appendChild(fill);
    return wrap;
  }

  // ─── Gold display ─────────────────────────────────────────────────────────

  private buildGoldRow(): HTMLElement {
    const div = document.createElement("div");
    div.id = "town-gold-display";
    div.style.cssText = "display:flex; align-items:center; gap:8px; font-size:0.9rem;";
    div.innerHTML = `
      <span style="color:#6a6a7a; font-size:0.65rem; letter-spacing:2px; text-transform:uppercase;">Treasury</span>
      <span style="color:#f0c060; font-weight:600; text-shadow:0 0 8px rgba(240,192,96,0.4);">◈ ${this.options.getGold()} Gold</span>
    `;
    return div;
  }

  // ─── Upgrade shop ─────────────────────────────────────────────────────────

  private buildShopPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;";
    heading.textContent = "Services";
    wrap.appendChild(heading);

    const upgrades: Array<{
      type: "blacksmith" | "inn" | "alchemist";
      label: string;
      cost: number;
      icon: string;
      desc: string;
    }> = [
      { type: "blacksmith", label: "Blacksmith", cost: 30, icon: "⚒", desc: "All heroes +3 ATK" },
      { type: "inn",        label: "Inn",        cost: 20, icon: "🕯", desc: "Restore all HP"   },
      { type: "alchemist",  label: "Alchemist",  cost: 25, icon: "⚗", desc: "+10 Max HP, +1 DEF" },
    ];

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:grid; grid-template-columns: repeat(3,1fr); gap:8px;";

    for (const upg of upgrades) {
      const btn = document.createElement("button");
      btn.className = "es-btn";
      btn.style.cssText = `
        font-family: var(--font-body, 'Cinzel', Georgia, serif);
        display: flex; flex-direction: column; align-items: center; gap: 3px;
        padding: 10px 8px; font-size: 0.78rem; letter-spacing: 0.5px;
        color: #d8ceb8;
        background: linear-gradient(180deg, #18181f 0%, #0e0e14 100%);
        border: 1px solid #4e4e5e;
        border-bottom-color: #8a8a9a;
        cursor: pointer; border-radius: 2px;
        transition: border-color 0.15s, color 0.15s;
      `;
      btn.title = upg.desc;
      btn.innerHTML = `
        <span style="font-size:1.1rem; line-height:1">${upg.icon}</span>
        <strong style="font-size:0.78rem;">${upg.label}</strong>
        <span style="color:#f0c060; font-size:0.75rem;">◈ ${upg.cost}</span>
        <span style="font-size:0.68rem; color:#6a6a7a; text-align:center; white-space:nowrap;">${upg.desc}</span>
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "#c8963a";
        btn.style.color = "#f0c060";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "#4e4e5e";
        btn.style.borderBottomColor = "#8a8a9a";
        btn.style.color = "#d8ceb8";
      });
      btn.addEventListener("click", () => {
        const newGold = this.options.onUpgrade(upg.type);
        if (newGold < 0) {
          const orig = btn.style.borderColor;
          btn.style.borderColor = "#8b1a1a";
          setTimeout(() => { btn.style.borderColor = orig; }, 700);
          return;
        }
        this.removeTownUI();
        this.showTownUI();
      });
      btnRow.appendChild(btn);
    }

    wrap.appendChild(btnRow);
    return wrap;
  }

  // ─── Enter dungeon ────────────────────────────────────────────────────────

  private buildEnterDungeonBtn(): HTMLElement {
    const btn = document.createElement("button");
    btn.style.cssText = `
      font-family: var(--font-body, 'Cinzel', Georgia, serif);
      padding: 11px 28px; font-size: 0.95rem; letter-spacing: 1px;
      font-weight: 600; text-transform: uppercase;
      color: #d4a840;
      background: linear-gradient(180deg, #1a1408 0%, #0e0c04 100%);
      border: 1px solid #c8963a; border-bottom: 2px solid #8a6a28;
      cursor: pointer; align-self: center; width: 100%;
      transition: background 0.15s, color 0.15s;
      text-shadow: 0 0 8px rgba(212,168,64,0.4);
    `;
    btn.textContent = "⚔  Enter Dungeon";
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "linear-gradient(180deg, #28200e 0%, #1a1408 100%)";
      btn.style.color = "#f0c060";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "linear-gradient(180deg, #1a1408 0%, #0e0c04 100%)";
      btn.style.color = "#d4a840";
    });
    btn.addEventListener("click", () => {
      this.removeTownUI();
      this.options.onEnterDungeon();
    });
    return btn;
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  /** Thin decorative divider with a centred glyph. */
  private buildDivider(glyph = "◆"): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText = "display:flex; align-items:center; gap:8px; width:100%;";
    const line = () => {
      const l = document.createElement("div");
      l.style.cssText = "flex:1; height:1px; background:linear-gradient(90deg,transparent,#3e3e4e,transparent);";
      return l;
    };
    const gem = document.createElement("span");
    gem.style.cssText = "color:#4e4e5e; font-size:0.55rem;";
    gem.textContent = glyph;
    div.appendChild(line()); div.appendChild(gem); div.appendChild(line());
    return div;
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
