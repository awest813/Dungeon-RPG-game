import { Color4, HemisphericLight, MeshBuilder, Vector3 } from "@babylonjs/core";
import type { Engine } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";

/**
 * BootScene — the first scene shown.
 * Displays a simple 3D loading indicator and triggers the transition to TownScene.
 */
export class BootScene extends BaseScene {
  constructor(engine: Engine, private onDone: () => void) {
    super(engine);
  }

  init(): void {
    this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1);

    // Minimal lighting
    new HemisphericLight("bootLight", new Vector3(0, 1, 0), this.scene);

    // A simple sphere as a placeholder logo/spinner
    const logo = MeshBuilder.CreateSphere("logo", { diameter: 1 }, this.scene);
    logo.position.y = 1;

    // Rotate the sphere as a visual "loading" indicator
    this.scene.registerBeforeRender(() => {
      logo.rotation.y += 0.02;
    });

    // Show a simple HTML overlay for boot text
    this.showBootUI();

    // Auto-transition to TownScene after 2 seconds
    setTimeout(() => {
      this.removeBootUI();
      this.onDone();
    }, 2000);
  }

  private showBootUI(): void {
    const div = document.createElement("div");
    div.id = "boot-overlay";
    div.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -60%);
      color: #c8a96e; font-family: serif; font-size: 2rem;
      text-align: center; pointer-events: none;
      text-shadow: 0 0 12px #c8a96e;
    `;
    div.textContent = "Dungeon RPG";
    document.body.appendChild(div);
  }

  private removeBootUI(): void {
    document.getElementById("boot-overlay")?.remove();
  }
}
