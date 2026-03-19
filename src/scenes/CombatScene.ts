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
import { CombatManager } from "../combat/CombatManager";
import { SKILLS } from "../data/skills";
import { ITEMS } from "../data/items";
import { isHero } from "../types/GameTypes";
import type { Hero, Enemy } from "../types/GameTypes";

/** Options passed to CombatScene by Game. */
export interface CombatSceneOptions {
  /** Live hero array — mutated in place during combat so HP persists. */
  heroes: Hero[];
  /** Enemy group for this encounter (deep-copied inside CombatManager). */
  enemies: Enemy[];
  /** 1-based encounter index, for progress display. */
  encounterNum: number;
  totalEncounters: number;
  /** Shared party consumable inventory — mutated in place when items are used. */
  partyItems: Record<string, number>;
  /** Called when all enemies are defeated; receives the defeated enemy list. */
  onVictory: (defeatedEnemies: Enemy[]) => void;
  /** Called when all heroes are defeated. */
  onDefeat: () => void;
}

/**
 * CombatScene — handles turn-based combat display and input.
 * Visual style: Skyrim/Oblivion Elder Scrolls aesthetic.
 *
 * Layout:
 *   Heroes on the left (negative X), Enemies on the right (positive X).
 *   Bottom HUD: HP/status bars, turn info, skill action slots, combat log.
 *
 * Player interaction flow:
 *   1. Click a skill button  →  if the skill needs a target, enter "target selection" mode
 *   2. Click a target button →  execute the skill and re-render the UI
 *   3. Click "⚗ Items"       →  enter item-selection mode
 *   4. Click an item button  →  if single_ally, enter target-selection mode; else fire immediately
 */
export class CombatScene extends BaseScene {
  private manager!: CombatManager;
  private combatantMeshes: Map<string, ReturnType<typeof MeshBuilder.CreateBox>> = new Map();

  /**
   * When set, the player has chosen a skill and must now pick a target.
   * null = no pending skill (normal skill-selection mode).
   */
  private pendingSkillId: string | null = null;

  /**
   * Item interaction state:
   *   null              → normal mode
   *   "__select__"      → showing item list
   *   "<itemId>"        → item chosen, showing target buttons (for single_ally items)
   */
  private pendingItemId: string | null = null;

  constructor(engine: Engine, private options: CombatSceneOptions) {
    super(engine);
  }

  init(): void {
    // ── deep dungeon black ─────────────────────────────────────────
    this.scene.clearColor = new Color4(0.018, 0.016, 0.028, 1);

    // Camera — slightly higher and further back for a dramatic look
    const camera = new FreeCamera("combatCam", new Vector3(0, 7, -13), this.scene);
    camera.setTarget(new Vector3(0, 1.5, 0));

    // Cool dim ambient
    const ambient = new HemisphericLight("combatAmb", new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.18;
    ambient.diffuse   = new Color3(0.3, 0.28, 0.35);
    ambient.groundColor = new Color3(0.06, 0.05, 0.08);

    // Torchlight from the sides
    const leftTorch = new PointLight("torchL", new Vector3(-6, 3, 0), this.scene);
    leftTorch.diffuse    = new Color3(1.0, 0.55, 0.1);
    leftTorch.intensity  = 1.6;
    leftTorch.range      = 12;

    const rightTorch = new PointLight("torchR", new Vector3(6, 3, 0), this.scene);
    rightTorch.diffuse   = new Color3(1.0, 0.50, 0.08);
    rightTorch.intensity = 1.6;
    rightTorch.range     = 12;

    // Flickering effect on the torches
    let t = 0;
    this.scene.registerBeforeRender(() => {
      t += 0.08;
      const flicker = 1.5 + Math.sin(t * 3.7) * 0.12 + Math.sin(t * 7.1) * 0.06;
      leftTorch.intensity  = flicker;
      rightTorch.intensity = flicker * 0.95;
    });

    // ── Stone dungeon floor ────────────────────────────────────────
    const floorMat = new StandardMaterial("floorMat", this.scene);
    floorMat.diffuseColor  = new Color3(0.14, 0.13, 0.16);
    floorMat.specularColor = new Color3(0.04, 0.04, 0.05);
    const floor = MeshBuilder.CreateGround("floor", { width: 18, height: 10 }, this.scene);
    floor.material = floorMat;

    // Back wall
    const wallMat = new StandardMaterial("wallMat", this.scene);
    wallMat.diffuseColor  = new Color3(0.18, 0.17, 0.20);
    wallMat.specularColor = new Color3(0.02, 0.02, 0.02);
    const wall = MeshBuilder.CreatePlane("wall", { width: 18, height: 8 }, this.scene);
    wall.position.set(0, 4, 5);
    wall.material = wallMat;

    // Stone pillars
    const pillarMat = new StandardMaterial("pillarMat", this.scene);
    pillarMat.diffuseColor = new Color3(0.22, 0.21, 0.25);
    for (const x of [-7, 7]) {
      const pillar = MeshBuilder.CreateCylinder(`pillar_${x}`, { height: 7, diameter: 0.55, tessellation: 8 }, this.scene);
      pillar.position.set(x, 3.5, 4);
      pillar.material = pillarMat;
    }

    // Set up combat
    this.manager = new CombatManager(this.options.heroes, this.options.enemies, this.options.partyItems);
    this.manager.start();

    this.spawnCombatants();
    this.renderUI();
    this.updateMeshVisibility();
  }

  // ─── 3D Representation ────────────────────────────────────────────────────

  private spawnCombatants(): void {
    const heroes  = this.manager.getHeroes();
    const enemies = this.manager.getEnemies();

    // Hero meshes — blue steel tint, slightly taller
    heroes.forEach((h, i) => {
      const mat = new StandardMaterial(`mat_${h.id}`, this.scene);
      mat.diffuseColor  = new Color3(0.2, 0.38, 0.65);
      mat.specularColor = new Color3(0.5, 0.6, 0.8);
      mat.specularPower = 32;
      const box = MeshBuilder.CreateBox(h.id, { height: 2.0, width: 0.9, depth: 0.6 }, this.scene);
      // Dynamic centering: keep heroes well left of center, spaced evenly
      const spacing = 2.0;
      const startX = -((heroes.length - 1) * spacing) / 2 - 2.5;
      box.position.set(startX + i * spacing, 1.0, 0);
      box.material = mat;
      this.combatantMeshes.set(h.id, box);
    });

    // Enemy meshes — blood red, slightly menacing
    enemies.forEach((e, i) => {
      const mat = new StandardMaterial(`mat_${e.id}`, this.scene);
      mat.diffuseColor  = new Color3(0.65, 0.12, 0.12);
      mat.specularColor = new Color3(0.6, 0.2, 0.2);
      mat.specularPower = 16;
      const box = MeshBuilder.CreateBox(e.id, { height: 2.0, width: 0.9, depth: 0.6 }, this.scene);
      box.position.set(3 + i * 2.2, 1.0, 0);
      box.material = mat;
      this.combatantMeshes.set(e.id, box);
    });
  }

  private updateMeshVisibility(): void {
    const living = new Set(this.manager.getLivingCombatants().map((c) => c.id));
    this.combatantMeshes.forEach((mesh, id) => {
      mesh.setEnabled(living.has(id));
    });
  }

  // ─── HTML UI ──────────────────────────────────────────────────────────────

  private renderUI(): void {
    document.getElementById("combat-ui")?.remove();

    const ui = document.createElement("div");
    ui.id = "combat-ui";
    ui.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0;
      background: rgba(6, 6, 10, 0.96);
      border-top: 1px solid #4e4e5e;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.7);
      font-family: var(--font-body, 'Cinzel', Georgia, serif);
      color: #d8ceb8;
      padding: 10px 14px 10px;
      display: flex; flex-direction: column; gap: 7px;
    `;

    const state = this.manager.getBattleState();

    if (state !== "ongoing") {
      ui.appendChild(this.buildEndUI(state));
      document.body.appendChild(ui);
      return;
    }

    ui.appendChild(this.buildStatusBar());
    ui.appendChild(this.buildDivider());
    ui.appendChild(this.buildActorRow());
    ui.appendChild(this.buildActionRow());
    ui.appendChild(this.buildLog());

    document.body.appendChild(ui);
  }

  // ─── Combatant status bars ────────────────────────────────────────────────

  private buildStatusBar(): HTMLElement {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:10px; flex-wrap:wrap; align-items:stretch;";

    const heroes  = this.manager.getHeroes();
    const enemies = this.manager.getEnemies();

    // Heroes side
    const heroGroup = document.createElement("div");
    heroGroup.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; flex:1;";
    heroes.forEach((h) => heroGroup.appendChild(this.buildCombatantCard(h, "hero")));
    row.appendChild(heroGroup);

    // Encounter progress
    const enc = document.createElement("div");
    enc.style.cssText = `
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      padding: 2px 10px; border-left: 1px solid #2e2e3e; border-right: 1px solid #2e2e3e;
      font-size:0.62rem; color:#5a5a6a; letter-spacing:1px; text-transform:uppercase; white-space:nowrap;
    `;
    enc.innerHTML = `
      <span style="color:#4e4e5e; font-size:0.55rem;">Encounter</span>
      <span style="color:#8a8a9a; font-size:0.8rem; font-weight:600;">${this.options.encounterNum}/${this.options.totalEncounters}</span>
    `;
    row.appendChild(enc);

    // Enemies side
    const enemyGroup = document.createElement("div");
    enemyGroup.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; flex:1; justify-content:flex-end;";
    enemies.forEach((e) => enemyGroup.appendChild(this.buildCombatantCard(e, "enemy")));
    row.appendChild(enemyGroup);

    return row;
  }

  private buildCombatantCard(c: Hero | Enemy, side: "hero" | "enemy"): HTMLElement {
    const alive  = c.stats.hp > 0;
    const hpPct  = alive ? Math.max(0, Math.round((c.stats.hp / c.stats.maxHp) * 100)) : 0;
    const isH    = isHero(c);
    const nameColor = alive ? (side === "hero" ? "#aec8e8" : "#e89090") : "#404050";

    const card = document.createElement("div");
    card.style.cssText = `
      display: flex; flex-direction: column; gap: 2px;
      min-width: 90px; max-width: 130px;
    `;

    // Name + statuses
    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex; align-items:center; gap:4px; flex-wrap:wrap;";
    const nameEl = document.createElement("span");
    nameEl.style.cssText = `font-size:0.72rem; color:${nameColor}; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`;
    nameEl.textContent = c.name;
    nameRow.appendChild(nameEl);

    if (alive) {
      c.statusEffects.forEach((s) => {
        const badge = document.createElement("span");
        badge.style.cssText = "font-size:0.55rem; color:#c89a3e; background:#1e1808; border:1px solid #5a4a1e; padding:1px 3px; border-radius:1px; white-space:nowrap;";
        badge.title = `${s.name} (${s.duration}t)`;
        badge.textContent = s.name.slice(0, 3).toUpperCase();
        nameRow.appendChild(badge);
      });
    }
    card.appendChild(nameRow);

    // HP bar — colour shifts from dark red → orange-red → bright red as HP drops
    const HP_COLOR_HIGH = "#8a2020";   // > 50 % HP  (matches --es-hp)
    const HP_COLOR_MED  = "#b03020";   // 26–50 % HP
    const HP_COLOR_LOW  = "#d04030";   // ≤ 25 % HP  (matches --es-hp-bright)
    const hpWrap = document.createElement("div");
    hpWrap.style.cssText = "width:100%; height:6px; background:#1a1a22; border:1px solid #2e2e3e; overflow:hidden; border-radius:1px;";
    hpWrap.title = `HP ${c.stats.hp}/${c.stats.maxHp}`;
    const hpFill = document.createElement("div");
    const hpColor = hpPct > 50 ? HP_COLOR_HIGH : hpPct > 25 ? HP_COLOR_MED : HP_COLOR_LOW;
    hpFill.style.cssText = `height:100%; width:${hpPct}%; background:${hpColor}; transition:width 0.3s;`;
    hpWrap.appendChild(hpFill);
    card.appendChild(hpWrap);

    // HP text
    const hpText = document.createElement("div");
    hpText.style.cssText = `font-size:0.58rem; color:${alive ? "#6a6a7a" : "#404050"}; letter-spacing:0.5px;`;
    hpText.textContent = alive ? `${c.stats.hp} / ${c.stats.maxHp}` : "Fallen";
    card.appendChild(hpText);

    // XP bar for heroes
    if (isH && alive) {
      const hero = c as Hero;
      const xpNeed = hero.level * 50;
      const xpPct  = Math.min(100, Math.round((hero.xp / xpNeed) * 100));
      const xpWrap = document.createElement("div");
      xpWrap.style.cssText = "width:100%; height:3px; background:#1a1a22; border:1px solid #2e2e3e; overflow:hidden; border-radius:1px;";
      xpWrap.title = `XP ${hero.xp}/${xpNeed}`;
      const xpFill = document.createElement("div");
      xpFill.style.cssText = `height:100%; width:${xpPct}%; background:#2a5a9a; transition:width 0.3s;`;
      xpWrap.appendChild(xpFill);
      card.appendChild(xpWrap);
    }

    return card;
  }

  // ─── Actor row ────────────────────────────────────────────────────────────

  private buildActorRow(): HTMLElement {
    const actor = this.manager.getCurrentActor();
    const div = document.createElement("div");
    div.style.cssText = "display:flex; flex-direction:column; gap:3px;";

    // Current actor line
    const actorLine = document.createElement("div");
    actorLine.style.cssText = "font-size:0.8rem; color:#8a8a9a; letter-spacing:0.5px;";

    if (this.pendingItemId && this.pendingItemId !== "__select__") {
      const item = ITEMS[this.pendingItemId];
      actorLine.innerHTML = `<span style="color:#d4a840;">▶</span> <span style="color:#d8ceb8;">${actor?.name ?? "?"}</span> — choose a target for <span style="color:#c8963a;">⚗ ${item?.name ?? this.pendingItemId}</span>`;
    } else if (this.pendingSkillId) {
      const skill = SKILLS[this.pendingSkillId];
      actorLine.innerHTML = `<span style="color:#d4a840;">▶</span> <span style="color:#d8ceb8;">${actor?.name ?? "?"}</span> — choose a target for <span style="color:#d4a840;">${skill?.name ?? this.pendingSkillId}</span>`;
    } else {
      actorLine.innerHTML = actor
        ? `<span style="color:#d4a840;">▶</span> <span style="color:#d8ceb8;">${actor.name}</span> — Round <span style="color:#d8ceb8;">${this.manager.getRound()}</span>`
        : `<span style="color:#6a6a7a;">Waiting…</span>`;
    }
    div.appendChild(actorLine);

    // Turn order preview — next up to 3 upcoming actors
    const upcoming = this.manager.getUpcomingActors(3);
    if (upcoming.length > 0) {
      const preview = document.createElement("div");
      preview.style.cssText = "font-size:0.62rem; color:#4a4a5a; letter-spacing:0.5px;";
      const parts = upcoming.map((c) => {
        const color = isHero(c) ? "#5a80a8" : "#7a3838";
        return `<span style="color:${color};">${c.name}</span>`;
      });
      preview.innerHTML = `<span style="color:#3a3a4a;">Next:</span> ${parts.join(" <span style='color:#3a3a4a;'>→</span> ")}`;
      div.appendChild(preview);
    }

    return div;
  }

  // ─── Action row: skill buttons or target selection ────────────────────────

  private buildActionRow(): HTMLElement {
    const actor = this.manager.getCurrentActor();
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:6px; flex-wrap:wrap; align-items:center;";

    if (!actor || !isHero(actor)) {
      const autoBtn = this.makeBtn("Enemy acting…", "muted", () => {
        const out = this.manager.executeEnemyTurn();
        if (out) {
          this.updateMeshVisibility();
          this.renderUI();
        }
      });
      row.appendChild(autoBtn);
      return row;
    }

    // Stunned hero
    if (actor.statusEffects.some((s) => s.flags?.includes("stunned"))) {
      const stunBtn = this.makeBtn(`${actor.name} is Stunned — Skip Turn`, "muted", () => {
        this.manager.processStunIfNeeded();
        this.updateMeshVisibility();
        this.renderUI();
      });
      stunBtn.style.color = "#c89a3e";
      stunBtn.style.borderColor = "#6a5a1e";
      row.appendChild(stunBtn);
      return row;
    }

    // ── Item target selection mode ────────────────────────────────────────
    if (this.pendingItemId && this.pendingItemId !== "__select__") {
      const item = ITEMS[this.pendingItemId];
      // single_ally items: show all living heroes as targets
      this.manager.getHeroes().filter((h) => h.stats.hp > 0).forEach((h) => {
        row.appendChild(this.makeBtn(h.name, "ally", () => {
          this.manager.useItem(this.pendingItemId!, h.id);
          this.pendingItemId = null;
          this.updateMeshVisibility();
          this.renderUI();
        }));
      });
      row.appendChild(this.makeBtn("✕  Cancel", "muted", () => {
        this.pendingItemId = null;
        this.renderUI();
      }));
      if (item) {
        const hint = document.createElement("span");
        hint.style.cssText = "font-size:0.65rem; color:#6a6a7a; margin-left:4px;";
        hint.textContent = item.description;
        row.appendChild(hint);
      }
      return row;
    }

    // ── Item selection mode ───────────────────────────────────────────────
    if (this.pendingItemId === "__select__") {
      const partyItems = this.options.partyItems;
      const hasItems = Object.keys(partyItems).length > 0;

      if (!hasItems) {
        const empty = document.createElement("span");
        empty.style.cssText = "font-size:0.72rem; color:#4a4a5a; margin-right:6px;";
        empty.textContent = "No items in inventory.";
        row.appendChild(empty);
      } else {
        for (const [itemId, qty] of Object.entries(partyItems)) {
          if (qty <= 0) continue;
          const item = ITEMS[itemId];
          if (!item) continue;
          const btn = this.makeBtn(`${item.name} ×${qty}`, "normal", () => {
            if (item.targetType === "all_enemies") {
              this.manager.useItem(itemId, "all_enemies");
              this.pendingItemId = null;
              this.updateMeshVisibility();
              this.renderUI();
            } else if (item.targetType === "self") {
              this.manager.useItem(itemId, actor.id);
              this.pendingItemId = null;
              this.updateMeshVisibility();
              this.renderUI();
            } else {
              // single_ally — enter target selection
              this.pendingItemId = itemId;
              this.renderUI();
            }
          });
          btn.style.borderColor = "#6a4a1e";
          btn.style.color = "#c89a3e";
          btn.title = item.description;
          row.appendChild(btn);
        }
      }
      row.appendChild(this.makeBtn("✕  Cancel", "muted", () => {
        this.pendingItemId = null;
        this.renderUI();
      }));
      return row;
    }

    // ── Skill target selection mode ───────────────────────────────────────
    if (this.pendingSkillId) {
      const skill = SKILLS[this.pendingSkillId];

      if (skill?.targetType === "single_enemy") {
        this.manager.getEnemies().filter((e) => e.stats.hp > 0).forEach((e) => {
          row.appendChild(this.makeBtn(e.name, "enemy", () => {
            this.manager.executeAction(this.pendingSkillId!, e.id);
            this.pendingSkillId = null;
            this.updateMeshVisibility();
            this.renderUI();
          }));
        });
      } else if (skill?.targetType === "single_ally") {
        this.manager.getHeroes().filter((h) => h.stats.hp > 0 && h.id !== actor.id).forEach((h) => {
          row.appendChild(this.makeBtn(h.name, "ally", () => {
            this.manager.executeAction(this.pendingSkillId!, h.id);
            this.pendingSkillId = null;
            this.updateMeshVisibility();
            this.renderUI();
          }));
        });
      }

      // Cancel
      row.appendChild(this.makeBtn("✕  Cancel", "muted", () => {
        this.pendingSkillId = null;
        this.renderUI();
      }));
      return row;
    }

    // ── Skill selection mode ──────────────────────────────────────────────
    const livingEnemies = this.manager.getEnemies().filter((e) => e.stats.hp > 0);
    const livingAllies  = this.manager.getHeroes().filter((h) => h.stats.hp > 0 && h.id !== actor.id);

    for (const skillId of actor.skillIds) {
      const skill = SKILLS[skillId];
      const cd    = this.manager.getSkillCooldown(actor.id, skillId);
      const onCd  = cd > 0;

      const label = onCd ? `${skill?.name ?? skillId}  (${cd}t)` : (skill?.name ?? skillId);
      const btn   = this.makeBtn(label, onCd ? "disabled" : "normal", () => {
        if (!skill || onCd) return;

        if (skill.targetType === "self") {
          this.manager.executeAction(skillId, actor.id);
          this.updateMeshVisibility();
          this.renderUI();
        } else if (skill.targetType === "all_enemies" || skill.targetType === "all_allies") {
          this.manager.executeAction(skillId, "aoe");
          this.updateMeshVisibility();
          this.renderUI();
        } else if (
          (skill.targetType === "single_enemy" && livingEnemies.length === 1) ||
          (skill.targetType === "single_ally"  && livingAllies.length === 1)
        ) {
          const targetId =
            skill.targetType === "single_enemy" ? livingEnemies[0].id : livingAllies[0].id;
          this.manager.executeAction(skillId, targetId);
          this.updateMeshVisibility();
          this.renderUI();
        } else {
          this.pendingSkillId = skillId;
          this.renderUI();
        }
      });

      if (onCd) {
        btn.title = `On cooldown: ${cd} turn${cd !== 1 ? "s" : ""} remaining`;
      } else if (skill) {
        btn.title = skill.description;
      }

      row.appendChild(btn);
    }

    // ── Items button (shown when party has items) ─────────────────────────
    const partyItems = this.options.partyItems;
    const totalItems = Object.values(partyItems).reduce((sum, q) => sum + q, 0);
    if (totalItems > 0) {
      const itemsBtn = this.makeBtn(`⚗ Items (${totalItems})`, "muted", () => {
        this.pendingSkillId = null;
        this.pendingItemId = "__select__";
        this.renderUI();
      });
      itemsBtn.style.borderColor = "#6a4a1e";
      itemsBtn.style.color = "#c89a3e";
      row.appendChild(itemsBtn);
    }

    return row;
  }

  // ─── Combat log ───────────────────────────────────────────────────────────

  private buildLog(): HTMLElement {
    const log = this.manager.getLog();
    const div = document.createElement("div");
    div.style.cssText = `
      font-size: 0.68rem;
      color: #5a5a6a;
      max-height: 52px;
      overflow-y: auto;
      border-top: 1px solid #1e1e28;
      padding-top: 5px;
      line-height: 1.5;
    `;
    div.innerHTML = log
      .slice(-6)
      .map((l, i) => {
        const opacity = 0.45 + (i / 6) * 0.55;
        return `<div style="opacity:${opacity.toFixed(2)}">${l}</div>`;
      })
      .join("");
    return div;
  }

  // ─── End screen ───────────────────────────────────────────────────────────

  private buildEndUI(state: "victory" | "defeat"): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText = "text-align:center; padding: 14px 0; display:flex; flex-direction:column; align-items:center; gap:10px;";

    if (state === "victory") {
      const xpEarned   = this.manager.getEnemies().length * 20;
      const goldEarned = this.manager.getEnemies().length * 10;
      const isLast = this.options.encounterNum >= this.options.totalEncounters;

      div.innerHTML = `
        <div style="font-family:var(--font-title,'Cinzel Decorative',Georgia,serif); font-size:1.6rem; color:#d4a840; text-shadow:0 0 20px rgba(212,168,64,0.6); letter-spacing:4px;">⚔  Victory  ⚔</div>
        <div style="font-size:0.72rem; color:#6a6a7a; letter-spacing:1px;">Encounter ${this.options.encounterNum} of ${this.options.totalEncounters}</div>
        <div style="font-size:0.82rem; color:#d8ceb8;">
          <span style="color:#d4a840;">◈ +${goldEarned} Gold</span>
          &nbsp;·&nbsp;
          <span style="color:#4a8adf;">+${xpEarned} XP</span>
        </div>
        ${isLast ? '<div style="font-size:0.75rem; color:#d4a840; letter-spacing:2px; text-transform:uppercase;">Dungeon Cleared</div>' : ""}
      `;

      const btnLabel = isLast ? "Return to Town" : "Next Encounter";
      const btn = this.makeBtn(btnLabel, "primary", () => {
        document.getElementById("combat-ui")?.remove();
        this.options.onVictory(this.manager.getEnemies());
      });
      div.appendChild(btn);
    } else {
      div.innerHTML = `
        <div style="font-family:var(--font-title,'Cinzel Decorative',Georgia,serif); font-size:1.6rem; color:#8b1a1a; text-shadow:0 0 20px rgba(139,26,26,0.6); letter-spacing:4px;">💀  Defeat  💀</div>
        <div style="font-size:0.72rem; color:#6a6a7a; letter-spacing:1px;">The party has fallen.</div>
      `;
      const btn = this.makeBtn("Return to Town", "danger", () => {
        document.getElementById("combat-ui")?.remove();
        this.options.onDefeat();
      });
      div.appendChild(btn);
    }

    return div;
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private makeBtn(
    label: string,
    variant: "normal" | "primary" | "enemy" | "ally" | "disabled" | "muted" | "danger",
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", onClick);

    const base = `
      font-family: var(--font-body, 'Cinzel', Georgia, serif);
      font-size: 0.8rem; letter-spacing: 0.5px;
      padding: 6px 16px; border-radius: 2px; cursor: pointer;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    `;

    const variants: Record<string, string> = {
      normal:   "color:#d8ceb8; background:linear-gradient(180deg,#18181f,#0e0e14); border:1px solid #4e4e5e; border-bottom-color:#8a8a9a;",
      primary:  "color:#d4a840; background:linear-gradient(180deg,#1a1408,#0e0c04); border:1px solid #c8963a; border-bottom:2px solid #8a6a28; font-weight:600;",
      enemy:    "color:#d07070; background:linear-gradient(180deg,#1a0808,#100404); border:1px solid #6a1e1e;",
      ally:     "color:#70a0d0; background:linear-gradient(180deg,#081018,#040a10); border:1px solid #1e3a6e;",
      disabled: "color:#404050; background:#0c0c12; border:1px solid #2a2a34; cursor:not-allowed;",
      muted:    "color:#5a5a6a; background:#0e0e14; border:1px solid #2e2e3e; cursor:pointer;",
      danger:   "color:#c05050; background:linear-gradient(180deg,#180808,#0e0404); border:1px solid #6a1818; font-weight:600;",
    };

    btn.style.cssText = base + (variants[variant] ?? variants.normal);

    if (variant !== "disabled") {
      btn.addEventListener("mouseenter", () => {
        btn.style.filter = "brightness(1.25)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.filter = "";
      });
    }

    return btn;
  }

  /** Very thin decorative separator. */
  private buildDivider(): HTMLElement {
    const d = document.createElement("div");
    d.style.cssText = "height:1px; background:linear-gradient(90deg,transparent,#3e3e4e,transparent); margin:1px 0;";
    return d;
  }

  override dispose(): void {
    document.getElementById("combat-ui")?.remove();
    super.dispose();
  }
}
