import {
  Color4,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";
import type { Engine } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import { CombatManager } from "../combat/CombatManager";
import { SKILLS } from "../data/skills";
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
  /** Called when all enemies are defeated; receives the defeated enemy list. */
  onVictory: (defeatedEnemies: Enemy[]) => void;
  /** Called when all heroes are defeated. */
  onDefeat: () => void;
}

/**
 * CombatScene — handles turn-based combat display and input.
 *
 * Layout:
 *   Heroes on the left (negative X), Enemies on the right (positive X).
 *   A simple HTML panel shows HP, turn info, skill buttons, and the combat log.
 *
 * Player interaction flow:
 *   1. Click a skill button  →  if the skill needs a target, enter "target selection" mode
 *   2. Click a target button →  execute the skill and re-render the UI
 */
export class CombatScene extends BaseScene {
  private manager!: CombatManager;
  private combatantMeshes: Map<string, ReturnType<typeof MeshBuilder.CreateBox>> = new Map();

  /**
   * When set, the player has chosen a skill and must now pick a target.
   * null = no pending skill (normal skill-selection mode).
   */
  private pendingSkillId: string | null = null;

  constructor(engine: Engine, private options: CombatSceneOptions) {
    super(engine);
  }

  init(): void {
    this.scene.clearColor = new Color4(0.05, 0.04, 0.08, 1);

    // Camera
    const camera = new FreeCamera("combatCam", new Vector3(0, 8, -14), this.scene);
    camera.setTarget(Vector3.Zero());

    // Lighting
    const light = new HemisphericLight("combatLight", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.9;

    // Ground
    MeshBuilder.CreateGround("ground", { width: 16, height: 8 }, this.scene);

    // Set up combat — heroes are used by reference, enemies are deep-copied inside CombatManager
    this.manager = new CombatManager(this.options.heroes, this.options.enemies);
    this.manager.start();

    this.spawnCombatants();
    this.renderUI();
    this.updateMeshVisibility();
  }

  // ─── 3D Representation ────────────────────────────────────────────────────

  private spawnCombatants(): void {
    const heroes = this.manager.getHeroes();
    const enemies = this.manager.getEnemies();

    heroes.forEach((h, i) => {
      const mat = new StandardMaterial(`mat_${h.id}`, this.scene);
      mat.diffuseColor = new Color3(0.2, 0.5, 0.9);
      const box = MeshBuilder.CreateBox(h.id, { height: 1.8, width: 1, depth: 1 }, this.scene);
      box.position.set(-4 + i * 2, 0.9, 0);
      box.material = mat;
      this.combatantMeshes.set(h.id, box);
    });

    enemies.forEach((e, i) => {
      const mat = new StandardMaterial(`mat_${e.id}`, this.scene);
      mat.diffuseColor = new Color3(0.8, 0.2, 0.2);
      const box = MeshBuilder.CreateBox(e.id, { height: 1.8, width: 1, depth: 1 }, this.scene);
      box.position.set(3 + i * 2, 0.9, 0);
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
      background: rgba(10,6,20,0.92); color: #c8a96e;
      font-family: serif; padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px;
      border-top: 2px solid #c8a96e;
    `;

    const state = this.manager.getBattleState();

    if (state !== "ongoing") {
      ui.appendChild(this.buildEndUI(state));
      document.body.appendChild(ui);
      return;
    }

    // Status bar (HP + active status effects)
    ui.appendChild(this.buildStatusBar());
    // Current actor display
    ui.appendChild(this.buildActorRow());
    // Skill buttons OR target selection buttons
    ui.appendChild(this.buildActionRow());
    // Combat log
    ui.appendChild(this.buildLog());

    document.body.appendChild(ui);
  }

  // ─── Status bar ───────────────────────────────────────────────────────────

  private buildStatusBar(): HTMLElement {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:24px; font-size:0.85rem; flex-wrap:wrap;";

    const heroes = this.manager.getHeroes();
    const enemies = this.manager.getEnemies();

    const heroSpans = heroes.map((h) => {
      const alive = h.stats.hp > 0;
      const statuses = h.statusEffects
        .map((s) => `<span style="color:#f0c060" title="${s.name} (${s.duration}t)">[${s.name.slice(0, 3)}]</span>`)
        .join("");
      return `<span style="color:${alive ? "#8ab4f8" : "#555"}">${h.name}: ${h.stats.hp}/${h.stats.maxHp} ${statuses}</span>`;
    });

    const enemySpans = enemies.map((e) => {
      const alive = e.stats.hp > 0;
      const statuses = e.statusEffects
        .map((s) => `<span style="color:#f0a030" title="${s.name} (${s.duration}t)">[${s.name.slice(0, 3)}]</span>`)
        .join("");
      return `<span style="color:${alive ? "#f88" : "#555"}">${e.name}: ${e.stats.hp}/${e.stats.maxHp} ${statuses}</span>`;
    });

    // Encounter progress indicator
    const enc = `<span style="color:#888; font-size:0.8rem">Encounter ${this.options.encounterNum}/${this.options.totalEncounters}</span>`;

    row.innerHTML = `
      <span>Heroes — ${heroSpans.join(" &nbsp;|&nbsp; ")}</span>
      <span>Enemies — ${enemySpans.join(" &nbsp;|&nbsp; ")}</span>
      ${enc}
    `;
    return row;
  }

  // ─── Actor row ────────────────────────────────────────────────────────────

  private buildActorRow(): HTMLElement {
    const actor = this.manager.getCurrentActor();
    const div = document.createElement("div");
    div.style.cssText = "font-size:1rem; font-weight:bold;";

    if (this.pendingSkillId) {
      const skill = SKILLS[this.pendingSkillId];
      div.textContent = `${actor?.name ?? "?"} — Choose a target for ${skill?.name ?? this.pendingSkillId}:`;
    } else {
      div.textContent = actor
        ? `Turn: ${actor.name} (Round ${this.manager.getRound()})`
        : "Waiting…";
    }
    return div;
  }

  // ─── Action row: skill buttons or target selection ────────────────────────

  private buildActionRow(): HTMLElement {
    const actor = this.manager.getCurrentActor();
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center;";

    if (!actor || !isHero(actor)) {
      // Enemy turn — auto-resolve button
      const autoBtn = this.createButton("Enemy acting…", "#555", () => {
        const out = this.manager.executeEnemyTurn();
        if (out) {
          this.updateMeshVisibility();
          this.renderUI();
        }
      });
      row.appendChild(autoBtn);
      return row;
    }

    // ── Target selection mode ────────────────────────────────────────────────
    if (this.pendingSkillId) {
      const skill = SKILLS[this.pendingSkillId];

      if (skill?.targetType === "single_enemy") {
        const livingEnemies = this.manager.getEnemies().filter((e) => e.stats.hp > 0);
        livingEnemies.forEach((e) => {
          const btn = this.createButton(e.name, "#3a0e0e", () => {
            this.manager.executeAction(this.pendingSkillId!, e.id);
            this.pendingSkillId = null;
            this.updateMeshVisibility();
            this.renderUI();
          });
          row.appendChild(btn);
        });
      } else if (skill?.targetType === "single_ally") {
        const livingAllies = this.manager.getHeroes().filter((h) => h.stats.hp > 0 && h.id !== actor.id);
        livingAllies.forEach((h) => {
          const btn = this.createButton(h.name, "#0e1e3a", () => {
            this.manager.executeAction(this.pendingSkillId!, h.id);
            this.pendingSkillId = null;
            this.updateMeshVisibility();
            this.renderUI();
          });
          row.appendChild(btn);
        });
      }

      // Cancel button
      const cancelBtn = this.createButton("✕ Cancel", "#2a2a2a", () => {
        this.pendingSkillId = null;
        this.renderUI();
      });
      row.appendChild(cancelBtn);
      return row;
    }

    // ── Skill selection mode ─────────────────────────────────────────────────
    const livingEnemies = this.manager.getEnemies().filter((e) => e.stats.hp > 0);
    const livingAllies = this.manager.getHeroes().filter((h) => h.stats.hp > 0 && h.id !== actor.id);

    for (const skillId of actor.skillIds) {
      const skill = SKILLS[skillId];
      const cd = this.manager.getSkillCooldown(actor.id, skillId);
      const onCooldown = cd > 0;

      const label = onCooldown
        ? `${skill?.name ?? skillId} (${cd}t)`
        : (skill?.name ?? skillId);

      const btn = this.createButton(label, onCooldown ? "#222" : "#3a1e0e", () => {
        if (!skill || onCooldown) return;

        if (skill.targetType === "self") {
          // No target selection needed — use immediately
          this.manager.executeAction(skillId, actor.id);
          this.updateMeshVisibility();
          this.renderUI();
        } else if (
          (skill.targetType === "single_enemy" && livingEnemies.length === 1) ||
          (skill.targetType === "single_ally" && livingAllies.length === 1)
        ) {
          // Only one valid target — auto-select it
          const targetId =
            skill.targetType === "single_enemy" ? livingEnemies[0].id : livingAllies[0].id;
          this.manager.executeAction(skillId, targetId);
          this.updateMeshVisibility();
          this.renderUI();
        } else {
          // Multiple targets — enter target selection mode
          this.pendingSkillId = skillId;
          this.renderUI();
        }
      });

      if (onCooldown) {
        btn.style.color = "#666";
        btn.style.cursor = "not-allowed";
        btn.title = `On cooldown: ${cd} turn${cd !== 1 ? "s" : ""} remaining`;
      } else if (skill) {
        btn.title = skill.description;
      }

      row.appendChild(btn);
    }
    return row;
  }

  // ─── Combat log ───────────────────────────────────────────────────────────

  private buildLog(): HTMLElement {
    const log = this.manager.getLog();
    const div = document.createElement("div");
    div.style.cssText = `
      font-size: 0.78rem; color: #aaa; max-height: 60px;
      overflow-y: auto; border-top: 1px solid #333; padding-top: 4px;
    `;
    div.innerHTML = log
      .slice(-6)
      .map((l) => `<div>${l}</div>`)
      .join("");
    return div;
  }

  // ─── End screen ───────────────────────────────────────────────────────────

  private buildEndUI(state: "victory" | "defeat"): HTMLElement {
    const div = document.createElement("div");
    div.style.cssText = "text-align:center; padding: 12px 0;";

    if (state === "victory") {
      const xpEarned = this.manager.getEnemies().length * 20;
      const goldEarned = this.manager.getEnemies().length * 10;
      const isLast = this.options.encounterNum >= this.options.totalEncounters;
      div.innerHTML = `
        <div style="font-size:1.4rem; color:#ffd700">⚔ Victory! ⚔</div>
        <div style="font-size:0.9rem; color:#aaa; margin-top:4px">
          Encounter ${this.options.encounterNum}/${this.options.totalEncounters}
        </div>
        <div style="font-size:0.85rem; color:#c8a96e; margin-top:4px">
          +${xpEarned} XP &nbsp;|&nbsp; +${goldEarned} Gold
        </div>
        ${isLast ? '<div style="font-size:0.85rem; color:#ffd700; margin-top:4px">Dungeon cleared!</div>' : ""}
      `;

      const btnLabel = isLast ? "Return to Town" : "Next Encounter";
      const btn = this.createButton(btnLabel, "#1a0a00", () => {
        document.getElementById("combat-ui")?.remove();
        this.options.onVictory(this.manager.getEnemies());
      });
      div.appendChild(btn);
    } else {
      div.innerHTML = `<div style="font-size:1.4rem; color:#c0392b">💀 Defeat 💀</div>`;
      const btn = this.createButton("Return to Town", "#1a0a00", () => {
        document.getElementById("combat-ui")?.remove();
        this.options.onDefeat();
      });
      div.appendChild(btn);
    }

    return div;
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  private createButton(label: string, bg: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding: 6px 16px; background: ${bg}; color: #c8a96e;
      border: 1px solid #c8a96e; font-family: serif; font-size: 0.95rem;
      cursor: pointer; border-radius: 3px;
    `;
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  override dispose(): void {
    document.getElementById("combat-ui")?.remove();
    super.dispose();
  }
}
