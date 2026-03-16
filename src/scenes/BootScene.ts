import {
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { Engine } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";

/** How long the boot/title screen is shown before transitioning to TownScene (ms). */
const BOOT_SCREEN_DURATION_MS = 2800;

/**
 * BootScene — the first scene shown.
 * Styled after the Elder Scrolls title-screen aesthetic:
 *   – Near-black background with a faint blue tint
 *   – Rotating dragon-claw diamond as the "loading" indicator
 *   – Torchlight point light with warm amber colour
 *   – Cinzel-font title card with decorative dividers
 */
export class BootScene extends BaseScene {
  constructor(engine: Engine, private onDone: () => void) {
    super(engine);
  }

  init(): void {
    // ── deep dungeon darkness ──────────────────────────────────────
    this.scene.clearColor = new Color4(0.027, 0.027, 0.047, 1);

    // Dim ambient fill so the scene isn't pitch black
    const ambient = new HemisphericLight("bootAmb", new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.15;
    ambient.diffuse = new Color3(0.5, 0.45, 0.35);

    // Warm torchlight from below the emblem
    const torch = new PointLight("bootTorch", new Vector3(0, -1, -3), this.scene);
    torch.diffuse = new Color3(1.0, 0.55, 0.1);
    torch.intensity = 2.5;
    torch.range = 12;

    // ── rotating diamond emblem ────────────────────────────────────
    const emblem = MeshBuilder.CreatePolyhedron(
      "emblem",
      { type: 1, size: 0.65 },   // type 1 = octahedron — dragon-claw shape
      this.scene
    );
    emblem.position.y = 1;

    const mat = new StandardMaterial("emblemMat", this.scene);
    mat.diffuseColor  = new Color3(0.55, 0.45, 0.2);
    mat.emissiveColor = new Color3(0.18, 0.12, 0.04);
    mat.specularColor = new Color3(1.0, 0.8, 0.4);
    mat.specularPower = 64;
    emblem.material = mat;

    // Slow dual-axis rotation
    this.scene.registerBeforeRender(() => {
      emblem.rotation.y += 0.018;
      emblem.rotation.z += 0.006;
    });

    this.showBootUI();

    setTimeout(() => {
      this.removeBootUI();
      this.onDone();
    }, BOOT_SCREEN_DURATION_MS);
  }

  private showBootUI(): void {
    const wrap = document.createElement("div");
    wrap.id = "boot-overlay";
    wrap.style.cssText = `
      position: fixed; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      pointer-events: none;
      font-family: var(--font-body, 'Cinzel', Georgia, serif);
    `;

    // Decorative top rule
    wrap.appendChild(this.makeRule());

    // Main title
    const title = document.createElement("div");
    title.style.cssText = `
      font-family: var(--font-title, 'Cinzel Decorative', Georgia, serif);
      font-size: clamp(2rem, 5vw, 3.4rem);
      font-weight: 700;
      color: #d4a840;
      letter-spacing: 6px;
      text-transform: uppercase;
      text-shadow: 0 0 20px rgba(212,168,64,0.7), 0 0 60px rgba(212,168,64,0.25);
      margin: 10px 0 6px;
    `;
    title.textContent = "Dungeon RPG";
    wrap.appendChild(title);

    // Subtitle
    const sub = document.createElement("div");
    sub.style.cssText = `
      font-size: 0.7rem;
      color: #7a7a8a;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 10px;
    `;
    sub.textContent = "An Elder's Tale";
    wrap.appendChild(sub);

    // Decorative bottom rule
    wrap.appendChild(this.makeRule());

    // Loading hint
    const hint = document.createElement("div");
    hint.style.cssText = `
      font-size: 0.6rem;
      color: #4e4e5e;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-top: 22px;
    `;
    hint.textContent = "Loading…";
    wrap.appendChild(hint);

    document.body.appendChild(wrap);
  }

  /** A thin decorative horizontal rule with a centred diamond glyph. */
  private makeRule(): HTMLElement {
    const rule = document.createElement("div");
    rule.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      width: clamp(220px, 40vw, 420px);
      color: #4e4e5e; font-size: 0.6rem;
    `;
    const line = () => {
      const l = document.createElement("div");
      l.style.cssText = "flex:1; height:1px; background: linear-gradient(90deg,transparent,#5a5a6a,transparent);";
      return l;
    };
    const gem = document.createElement("span");
    gem.style.cssText = "color:#7a6a3a; font-size:0.7rem;";
    gem.textContent = "◆";
    rule.appendChild(line());
    rule.appendChild(gem);
    rule.appendChild(line());
    return rule;
  }

  private removeBootUI(): void {
    document.getElementById("boot-overlay")?.remove();
  }
}
