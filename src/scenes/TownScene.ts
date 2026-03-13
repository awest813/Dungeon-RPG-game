import {
  Color4,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
} from "@babylonjs/core";
import type { Engine } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";

/**
 * TownScene — the hub between dungeon runs.
 * Currently a stub that shows a simple town environment and a button to enter combat.
 */
export class TownScene extends BaseScene {
  constructor(engine: Engine, private onEnterCombat: () => void) {
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

  private showTownUI(): void {
    const div = document.createElement("div");
    div.id = "town-ui";
    div.style.cssText = `
      position: fixed; bottom: 40px; left: 50%;
      transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    `;

    const title = document.createElement("h2");
    title.style.cssText = "color: #c8a96e; font-family: serif; margin: 0; text-shadow: 0 0 8px #c8a96e;";
    title.textContent = "Town";

    const btn = document.createElement("button");
    btn.style.cssText = `
      padding: 10px 30px; background: #3a1e0e; color: #c8a96e;
      border: 2px solid #c8a96e; font-family: serif; font-size: 1.1rem;
      cursor: pointer; border-radius: 4px;
    `;
    btn.textContent = "Enter Dungeon";
    btn.addEventListener("click", () => {
      this.removeTownUI();
      this.onEnterCombat();
    });

    div.appendChild(title);
    div.appendChild(btn);
    document.body.appendChild(div);
  }

  private removeTownUI(): void {
    document.getElementById("town-ui")?.remove();
  }
}
