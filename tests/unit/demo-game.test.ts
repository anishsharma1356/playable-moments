import { expect, it } from "vitest";
import { ShortcutGame } from "../../docs/demo/shortcut-game.js";

function run(game: ShortcutGame, until = () => false) {
  for (let i = 0; i < 2400 && game.phase === "running" && !until(); i++)
    game.step(1 / 120);
}
it("keeps the question and selected route paused until the creator starts", () => {
  const game = new ShortcutGame();
  game.step(10);
  game.choose("A");
  game.step(10);
  expect([game.phase, game.elapsed, game.x]).toEqual(["ready", 0, 160]);
});
it("finishes the continuous safe route without jumping and freezes its result", () => {
  const game = new ShortcutGame();
  game.choose("B");
  game.start();
  expect(game.jump()).toBe(false);
  run(game);
  expect(game.phase).toBe("finished");
  expect(game.elapsed).toBeGreaterThan(8);
  const time = game.elapsed;
  game.choose("A");
  game.start();
  game.step(1);
  expect([game.route, game.elapsed]).toEqual(["B", time]);
});
it("lands a correctly timed shortcut jump, faster than the safe route", () => {
  const game = new ShortcutGame();
  game.choose("A");
  game.start();
  run(game, () => game.x >= 500);
  expect(game.jump()).toBe(true);
  expect(game.jump()).toBe(false);
  run(game);
  expect(game.phase).toBe("finished");
  expect(game.elapsed).toBeLessThan(6);
});
it.each([false, true])(
  "a missing or early jump actually falls (early=%s)",
  (early) => {
    const game = new ShortcutGame();
    game.choose("A");
    game.start();
    if (early) game.jump();
    run(game);
    expect(game.phase).toBe("fell");
    expect(game.jump()).toBe(false);
  },
);
it("pause preserves position/time and cannot accept a jump until resume", () => {
  const game = new ShortcutGame();
  game.choose("A");
  game.start();
  run(game, () => game.x >= 400);
  game.pause();
  const before = [game.x, game.y, game.elapsed];
  game.step(999);
  expect(game.jump()).toBe(false);
  expect([game.x, game.y, game.elapsed]).toEqual(before);
  game.start();
  run(game, () => game.x >= 500);
  game.jump();
  run(game);
  expect(game.phase).toBe("finished");
});
