import { Game } from "./Game";

const canvas = document.querySelector("#babylon-canvas") as unknown as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas #babylon-canvas not found.");

const game = new Game(canvas);
game.start();
game.run();
