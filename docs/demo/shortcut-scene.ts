import { ShortcutGame, type Route } from "./shortcut-game.js";

function element<T extends HTMLElement = HTMLElement>(id: string) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing scene element: ${id}`);
  return found as T;
}
const button = (id: string) => element<HTMLButtonElement>(id);
let game = new ShortcutGame();
let audio: AudioContext | undefined;
let sound = false;
let lastFrame = 0;
let lastPhase = "";
let lastRoute: Route | null = null;
const dialog = element<HTMLDialogElement>("confirm-reset");
const runner = document.getElementById("runner")!;

function tone(frequency: number, duration = 0.18, delay = 0) {
  if (!sound || !audio || audio.state !== "running") return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  oscillator.frequency.value = frequency;
  // Match the +10 dB OBS playback check confirmed audible by the creator.
  // That check peaked at -8.5 dBFS, retaining headroom below clipping.
  gain.gain.setValueAtTime(0.38, start);
  gain.gain.exponentialRampToValueAtTime(0.00316, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
const labels = {
  waiting: [
    "Paused for chat.",
    "Take the shortcut, or play it safe? The creator decides after voting locks.",
    "WAITING FOR A CHOICE",
  ],
  ready: [
    "Route selected. Ready when you are.",
    "Start the run when your recording is ready.",
    "READY TO RUN",
  ],
  running: ["Go for it.", "", "RUN IN PROGRESS"],
  paused: [
    "Run paused.",
    "Return to the scene and press Resume. Your run time is paused too.",
    "PAUSED",
  ],
  finished: ["Made it to the finish!", "", "RUN COMPLETE"],
  fell: [
    "The jump didn't land.",
    "The creator took the shortcut and fell into the gap.",
    "RUN ENDED",
  ],
};
function render() {
  runner.setAttribute(
    "transform",
    `translate(${game.x.toFixed(2)} ${game.y.toFixed(2)})`,
  );
  element("timer").textContent = game.elapsed.toFixed(2).padStart(5, "0");
  const changed = lastPhase !== game.phase || lastRoute !== game.route;
  if (!changed) return;
  const oldPhase = lastPhase;
  lastPhase = game.phase;
  lastRoute = game.route;
  element("capture").dataset.phase = game.phase;
  const [heading, description, tag] = labels[game.phase];
  const routeName = game.route === "A" ? "Risky shortcut" : "Safe route";
  let detail = description;
  if (game.phase === "running")
    detail =
      game.route === "A"
        ? "One jump. Press Space near the edge."
        : "Taking the long way round. Keep your eyes on the finish.";
  if (game.phase === "ready") detail = `${routeName}. ${description}`;
  if (game.phase === "finished")
    detail = `${routeName} · ${game.elapsed.toFixed(2)} seconds. This is the actual result of this run.`;
  element("status").textContent = heading;
  element("instruction").textContent = detail;
  element("phase").textContent = tag;
  element("announcement").textContent = `${heading} ${detail}`;
  for (const route of ["A", "B"] as const) {
    button(`route-${route.toLowerCase()}`).disabled = ![
      "waiting",
      "ready",
    ].includes(game.phase);
    button(`route-${route.toLowerCase()}`).setAttribute(
      "aria-pressed",
      String(game.route === route),
    );
  }
  button("start").disabled = !["ready", "paused"].includes(game.phase);
  button("start").textContent =
    game.phase === "paused" ? "Resume run" : "Start run";
  button("jump").disabled =
    game.phase !== "running" || game.route !== "A" || game.jumped;
  button("pause").disabled = game.phase !== "running";
  if (oldPhase === "running" && game.phase === "finished") {
    tone(660, 0.22);
    tone(880, 0.35, 0.25);
  }
  if (oldPhase === "running" && game.phase === "fell") tone(180, 0.4);
}
function start() {
  game.start();
  lastFrame = performance.now();
  render();
  if (game.phase === "running" && game.route === "A")
    button("jump").focus({ preventScroll: true });
}
function jump() {
  if (game.jump()) {
    tone(440, 0.1);
    button("jump").disabled = true;
  }
}
for (const route of ["A", "B"] as const)
  button(`route-${route.toLowerCase()}`).onclick = () => {
    game.choose(route);
    render();
  };
button("start").onclick = start;
button("jump").onclick = jump;
button("pause").onclick = () => {
  game.pause();
  render();
};
button("reset").onclick = () => {
  game.pause();
  render();
  dialog.showModal();
};
button("keep-run").onclick = () => dialog.close();
button("do-reset").onclick = () => {
  game = new ShortcutGame();
  lastFrame = 0;
  dialog.close();
  render();
  button("route-a").focus();
};
button("sound").onclick = async () => {
  try {
    audio ??= new AudioContext();
    await audio.resume();
    sound = !sound;
    button("sound").textContent = sound ? "Sound on" : "Sound off";
    button("sound").setAttribute("aria-pressed", String(sound));
    if (sound) tone(523, 0.2);
  } catch {
    element("announcement").textContent =
      "Audio is unavailable. The game and all result text still work.";
  }
};
document.addEventListener("keydown", (event) => {
  if (
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    dialog.open
  )
    return;
  if (
    event.code === "Space" &&
    game.phase === "running" &&
    game.route === "A"
  ) {
    event.preventDefault();
    jump();
  }
  if (event.key.toLowerCase() === "p" && game.phase === "running") {
    game.pause();
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.pause();
    render();
  }
  lastFrame = 0;
});
function frame(now: number) {
  if (lastFrame && !document.hidden) {
    const delta = (now - lastFrame) / 1000;
    // Pause visibly on large stalls instead of skipping physics or silently changing the run.
    if (delta > 0.25) game.pause();
    else game.step(delta);
  }
  lastFrame = now;
  render();
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
