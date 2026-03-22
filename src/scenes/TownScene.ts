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
import type { EquipSlotType } from "../types/GameTypes";
import type { Equipment } from "../types/GameTypes";
import { ITEMS, ITEM_ORDER } from "../data/items";
import { EQUIPMENT, ARMORY_ORDER } from "../data/equipment";

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
  /**
   * Purchase one unit of a consumable item. Returns the new gold total on
   * success, or -1 if the party cannot afford it.
   */
  onBuyItem: (itemId: string) => number;
  /**
   * Purchase an equipment piece from the Armory. Adds to equipStash.
   * Returns new gold on success, -1 on failure.
   */
  onBuyEquipment: (equipId: string) => number;
  /**
   * Equip a stash item (by index) onto a hero.
   * Returns new gold on success, -1 on failure.
   */
  onEquipItem: (stashIndex: number, heroId: string) => number;
  /**
   * Unequip an item slot from a hero, sending it back to stash.
   * Returns new gold on success, -1 on failure.
   */
  onUnequipItem: (slot: EquipSlotType, heroId: string) => number;
  /** Current party consumable inventory — read for the inventory display. */
  partyItems: Record<string, number>;
  /** Unequipped equipment available to assign to heroes. */
  equipStash: Equipment[];
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
  /**
   * When not null, the player has selected a stash item to equip and is now
   * choosing which hero should receive it.
   */
  private pendingEquipIndex: number | null = null;

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
      min-width: 380px; max-width: 560px; width: 90vw;
      max-height: 85vh; overflow-y: auto;
      background: rgba(8,8,14,0.96);
      border: 1px solid #4e4e5e;
      box-shadow: inset 0 0 0 1px rgba(78,78,94,0.3), 0 0 40px rgba(0,0,0,0.9);
      padding: 22px 26px 20px;
    `;

    card.appendChild(this.buildTitleRow());
    card.appendChild(this.buildDivider("◆"));
    card.appendChild(this.buildPartyPanel());
    card.appendChild(this.buildInventoryPanel());
    card.appendChild(this.buildDivider("◆"));
    card.appendChild(this.buildGoldRow());
    card.appendChild(this.buildShopPanel());
    card.appendChild(this.buildApothecaryPanel());
    card.appendChild(this.buildArmoryPanel());
    card.appendChild(this.buildEquipStashPanel());
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

    const outer = document.createElement("div");
    outer.style.cssText = "padding: 6px 0; border-bottom: 1px solid #1e1e28;";

    const row = document.createElement("div");
    row.style.cssText = `
      display: grid;
      grid-template-columns: 1fr auto;
      column-gap: 14px;
      align-items: center;
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
    left.appendChild(this.makeBar(hpPct, "es-bar-hp", `HP ${hero.stats.hp}/${hero.stats.maxHp}`, `${hero.name} Health`, hero.stats.hp, hero.stats.maxHp));
    // XP bar
    left.appendChild(this.makeBar(xpPct, "es-bar-xp", `XP ${hero.xp}/${xpNeed}`, `${hero.name} Experience`, hero.xp, xpNeed));

    row.appendChild(left);

    // Right: stats
    const right = document.createElement("div");
    right.style.cssText = "text-align:right; font-size:0.72rem; color:#7a7a8a; white-space:nowrap;";
    right.innerHTML = `
      <div>ATK <span style="color:#d8ceb8">${hero.stats.attack}</span></div>
      <div>DEF <span style="color:#d8ceb8">${hero.stats.defense}</span></div>
      <div>SPD <span style="color:#d8ceb8">${hero.stats.speed}</span></div>
    `;
    row.appendChild(right);
    outer.appendChild(row);

    // Equipment slots row
    const slots: EquipSlotType[] = ["weapon", "armour", "accessory"];
    const slotIcons: Record<EquipSlotType, string> = { weapon: "⚔", armour: "🛡", accessory: "💎" };
    const equipRow = document.createElement("div");
    equipRow.style.cssText = "display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;";

    for (const slot of slots) {
      const equipId = hero.equipment[slot];
      const equip   = equipId ? EQUIPMENT[equipId] : null;
      const chip    = document.createElement("div");
      chip.style.cssText = `
        display:flex; align-items:center; gap:3px;
        background:${equip ? "#0e0e1a" : "#08080e"};
        border:1px solid ${equip ? "#5a4a2e" : "#2a2a38"};
        border-radius:2px; padding:2px 7px; font-size:0.65rem;
        color:${equip ? "#c8a84a" : "#3a3a4a"};
        cursor:${equip ? "pointer" : "default"};
        transition: border-color 0.12s;
      `;
      chip.title = equip
        ? `${equip.name} — ${equip.description}\nClick to unequip`
        : `${slot} — empty`;
      chip.innerHTML = `${slotIcons[slot]} <span>${equip ? equip.name : `—`}</span>`;

      if (equip) {
        chip.addEventListener("mouseenter", () => { chip.style.borderColor = "#8b1a1a"; });
        chip.addEventListener("mouseleave", () => { chip.style.borderColor = "#5a4a2e"; });
        chip.addEventListener("click", () => {
          this.options.onUnequipItem(slot, hero.id);
          this.removeTownUI();
          this.pendingEquipIndex = null;
          this.showTownUI();
        });
      }

      equipRow.appendChild(chip);
    }

    outer.appendChild(equipRow);
    return outer;
  }

  /** Creates an HP/XP bar element with a tooltip and ARIA progressbar attributes. */
  private makeBar(pct: number, cls: string, title: string, ariaLabel: string, valueNow: number, valueMax: number): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "es-bar-wrap";
    wrap.title = title;
    wrap.setAttribute("role", "progressbar");
    wrap.setAttribute("aria-label", ariaLabel);
    wrap.setAttribute("aria-valuenow", valueNow.toString());
    wrap.setAttribute("aria-valuemin", "0");
    wrap.setAttribute("aria-valuemax", valueMax.toString());

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
      const canAfford = this.options.getGold() >= upg.cost;
      const btn = document.createElement("button");
      btn.className = "es-btn";
      if (!canAfford) {
        btn.setAttribute("aria-disabled", "true");
      }
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
        if (btn.getAttribute("aria-disabled") === "true") return;
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

  // ─── Party inventory ──────────────────────────────────────────────────────

  private buildInventoryPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px;";
    heading.textContent = "Inventory";
    wrap.appendChild(heading);

    const partyItems = this.options.partyItems;
    const ownedIds = Object.keys(partyItems).filter((id) => (partyItems[id] ?? 0) > 0);

    if (ownedIds.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "font-size:0.72rem; color:#3a3a4a; font-style:italic;";
      empty.textContent = "No items carried.";
      wrap.appendChild(empty);
    } else {
      const grid = document.createElement("div");
      grid.style.cssText = "display:flex; flex-wrap:wrap; gap:6px;";

      for (const itemId of ownedIds) {
        const item = ITEMS[itemId];
        if (!item) continue;
        const qty = partyItems[itemId];

        const chip = document.createElement("div");
        chip.style.cssText = `
          display:flex; align-items:center; gap:5px;
          background:#0e0e14; border:1px solid #3a3a4e; border-radius:2px;
          padding:4px 8px; font-size:0.72rem; color:#c8a84a;
        `;
        chip.title = item.description;
        chip.innerHTML = `<span style="color:#d8ceb8;">${item.name}</span> <span style="color:#c8963a;">×${qty}</span>`;
        grid.appendChild(chip);
      }

      wrap.appendChild(grid);
    }

    return wrap;
  }

  // ─── Apothecary (consumable item shop) ────────────────────────────────────

  private buildApothecaryPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; margin-top:10px;";
    heading.textContent = "Apothecary — Supplies";
    wrap.appendChild(heading);

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns: 1fr 1fr; gap:6px;";

    for (const itemId of ITEM_ORDER) {
      const item = ITEMS[itemId];
      if (!item) continue;
      const canAfford = this.options.getGold() >= item.cost;

      const btn = document.createElement("button");
      if (!canAfford) {
        btn.setAttribute("aria-disabled", "true");
      }
      btn.style.cssText = `
        font-family: var(--font-body, 'Cinzel', Georgia, serif);
        display:flex; flex-direction:column; align-items:flex-start; gap:2px;
        padding:8px 10px; font-size:0.72rem; letter-spacing:0.4px;
        color:${canAfford ? "#d8ceb8" : "#4a4a5a"};
        background:linear-gradient(180deg,#14120a,#0a0904);
        border:1px solid ${canAfford ? "#5a4a1e" : "#2a2a1e"};
        cursor:${canAfford ? "pointer" : "not-allowed"};
        border-radius:2px; text-align:left;
        transition: border-color 0.12s, color 0.12s;
      `;
      btn.title = item.description;
      btn.innerHTML = `
        <span style="font-weight:600; color:${canAfford ? "#c8a84a" : "#4a4a2a"};">${item.name}</span>
        <span style="color:${canAfford ? "#f0c060" : "#4a4a2a"};">◈ ${item.cost}</span>
        <span style="font-size:0.62rem; color:${canAfford ? "#6a6a7a" : "#3a3a3a"}; white-space:normal; line-height:1.3;">${item.description}</span>
      `;

      btn.addEventListener("mouseenter", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        btn.style.borderColor = "#6a5a2a";
        btn.style.color = "#e8d8b0";
      });
      btn.addEventListener("mouseleave", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        btn.style.borderColor = "#4a3a1e";
        btn.style.color = "#d8ceb8";
      });
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const newGold = this.options.onBuyItem(itemId);
        if (newGold < 0) {
          btn.style.borderColor = "#8b1a1a";
          setTimeout(() => { btn.style.borderColor = "#4a3a1e"; }, 700);
          return;
        }
        this.removeTownUI();
        this.showTownUI();
      });

      grid.appendChild(btn);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  // ─── Armory (equipment shop) ──────────────────────────────────────────────

  private buildArmoryPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; margin-top:10px;";
    heading.textContent = "Armory — Equipment";
    wrap.appendChild(heading);

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns: 1fr 1fr; gap:6px;";

    const rarityColors: Record<string, string> = {
      common: "#c8a84a",
      uncommon: "#7eb8d4",
      rare: "#c060e8",
    };

    for (const equipId of ARMORY_ORDER) {
      const equip = EQUIPMENT[equipId];
      if (!equip) continue;
      const canAfford = this.options.getGold() >= equip.cost;
      const col = rarityColors[equip.rarity] ?? "#c8a84a";

      const btn = document.createElement("button");
      if (!canAfford) {
        btn.setAttribute("aria-disabled", "true");
      }
      btn.style.cssText = `
        font-family: var(--font-body, 'Cinzel', Georgia, serif);
        display:flex; flex-direction:column; align-items:flex-start; gap:2px;
        padding:8px 10px; font-size:0.72rem; letter-spacing:0.4px;
        color:${canAfford ? "#d8ceb8" : "#4a4a5a"};
        background:linear-gradient(180deg,#0e0e1a,#08080e);
        border:1px solid ${canAfford ? "#3a3a5e" : "#2a2a3e"};
        cursor:${canAfford ? "pointer" : "not-allowed"};
        border-radius:2px; text-align:left;
        transition: border-color 0.12s, color 0.12s;
      `;
      btn.title = equip.description;
      const slotLabel = { weapon: "⚔", armour: "🛡", accessory: "💎" }[equip.slot];
      btn.innerHTML = `
        <span style="font-weight:600; color:${canAfford ? col : "#4a4a2a"};">${slotLabel} ${equip.name}</span>
        <span style="color:${canAfford ? "#f0c060" : "#4a4a2a"};">◈ ${equip.cost}</span>
        <span style="font-size:0.62rem; color:${canAfford ? "#6a6a7a" : "#3a3a3a"}; white-space:normal; line-height:1.3;">${equip.description}</span>
      `;

      btn.addEventListener("mouseenter", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        btn.style.borderColor = "#7878a8";
        btn.style.color = "#f0e8d0";
      });
      btn.addEventListener("mouseleave", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        btn.style.borderColor = "#3a3a5e";
        btn.style.color = "#d8ceb8";
      });
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const newGold = this.options.onBuyEquipment(equipId);
        if (newGold < 0) {
          btn.style.borderColor = "#8b1a1a";
          setTimeout(() => { btn.style.borderColor = "#3a3a5e"; }, 700);
          return;
        }
        this.removeTownUI();
        this.showTownUI();
      });

      grid.appendChild(btn);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  // ─── Equipment stash panel ────────────────────────────────────────────────

  private buildEquipStashPanel(): HTMLElement {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.style.cssText = "font-size:0.65rem; color:#6a6a7a; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px; margin-top:10px;";
    heading.textContent = "Equipment Stash";
    wrap.appendChild(heading);

    const stash = this.options.equipStash;

    if (stash.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "font-size:0.72rem; color:#3a3a4a; font-style:italic;";
      empty.textContent = "No equipment in stash.";
      wrap.appendChild(empty);
      return wrap;
    }

    const rarityColors: Record<string, string> = {
      common: "#c8a84a",
      uncommon: "#7eb8d4",
      rare: "#c060e8",
    };

    // Show "select hero" prompt if player has chosen a stash item
    if (this.pendingEquipIndex !== null) {
      const equip = stash[this.pendingEquipIndex];
      if (equip) {
        const prompt = document.createElement("div");
        prompt.style.cssText = "font-size:0.75rem; color:#d8ceb8; margin-bottom:6px;";
        prompt.textContent = `Equip ${equip.name} on:`;
        wrap.appendChild(prompt);

        const heroGrid = document.createElement("div");
        heroGrid.style.cssText = "display:flex; gap:6px; flex-wrap:wrap;";

        for (const hero of this.options.heroes) {
          const btn = document.createElement("button");
          btn.style.cssText = `
            font-family: var(--font-body, 'Cinzel', Georgia, serif);
            padding:6px 12px; font-size:0.72rem; color:#aec8e8;
            background:linear-gradient(180deg,#0e1420,#080e18);
            border:1px solid #3a5a7e; border-radius:2px; cursor:pointer;
            transition: border-color 0.12s;
          `;
          btn.textContent = hero.name;
          btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#78aad0"; });
          btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#3a5a7e"; });
          btn.addEventListener("click", () => {
            this.options.onEquipItem(this.pendingEquipIndex!, hero.id);
            this.pendingEquipIndex = null;
            this.removeTownUI();
            this.showTownUI();
          });
          heroGrid.appendChild(btn);
        }

        const cancel = document.createElement("button");
        cancel.style.cssText = `
          font-family: var(--font-body, 'Cinzel', Georgia, serif);
          padding:6px 12px; font-size:0.72rem; color:#7a7a8a;
          background:#08080e; border:1px solid #3a3a4e; border-radius:2px; cursor:pointer;
        `;
        cancel.textContent = "Cancel";
        cancel.addEventListener("click", () => {
          this.pendingEquipIndex = null;
          this.removeTownUI();
          this.showTownUI();
        });
        heroGrid.appendChild(cancel);

        wrap.appendChild(heroGrid);
        return wrap;
      }
    }

    // Normal stash list
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex; flex-wrap:wrap; gap:6px;";

    stash.forEach((equip, index) => {
      const col = rarityColors[equip.rarity] ?? "#c8a84a";
      const slotLabel = { weapon: "⚔", armour: "🛡", accessory: "💎" }[equip.slot];
      const chip = document.createElement("div");
      chip.style.cssText = `
        display:flex; align-items:center; gap:5px;
        background:#0e0e1a; border:1px solid #3a3a5e; border-radius:2px;
        padding:4px 9px; font-size:0.72rem; color:${col};
        cursor:pointer; transition: border-color 0.12s;
      `;
      chip.title = `${equip.description}\nClick to equip on a hero`;
      chip.innerHTML = `${slotLabel} <span style="color:#d8ceb8;">${equip.name}</span>`;
      chip.addEventListener("mouseenter", () => { chip.style.borderColor = "#7878a8"; });
      chip.addEventListener("mouseleave", () => { chip.style.borderColor = "#3a3a5e"; });
      chip.addEventListener("click", () => {
        this.pendingEquipIndex = index;
        this.removeTownUI();
        this.showTownUI();
      });
      grid.appendChild(chip);
    });

    wrap.appendChild(grid);
    return wrap;
  }

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
