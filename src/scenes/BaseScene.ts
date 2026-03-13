import { Scene, Engine } from "@babylonjs/core";

/**
 * Base class for all game scenes.
 * Each scene owns its Babylon Scene object and is responsible
 * for setup and teardown.
 */
export abstract class BaseScene {
  protected scene: Scene;

  constructor(protected engine: Engine) {
    this.scene = new Scene(engine);
  }

  /** Called once to set up the scene. */
  abstract init(): Promise<void> | void;

  /** Called when switching away from this scene. */
  dispose(): void {
    this.scene.dispose();
  }

  getBabylonScene(): Scene {
    return this.scene;
  }
}
