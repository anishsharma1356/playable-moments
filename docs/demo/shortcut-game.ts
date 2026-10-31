// Original capture-scene physics. No Twitch, vote, or replay state lives here.
export type Route = "A" | "B";
export type Phase =
  "waiting" | "ready" | "running" | "paused" | "finished" | "fell";
export const course = {
  start: 160,
  finish: 1040,
  ground: 230,
  gapStart: 520,
  gapEnd: 675,
  speed: 190,
  gravity: 1225,
  jumpSpeed: 600,
};
const safePoints = [
  [160, 230],
  [260, 360],
  [940, 360],
  [1040, 230],
];
export class ShortcutGame {
  phase: Phase = "waiting";
  route: Route | null = null;
  x = course.start;
  y = course.ground;
  velocityY = 0;
  elapsed = 0;
  safeDistance = 0;
  grounded = true;
  jumped = false;

  choose(route: Route) {
    if (this.phase !== "waiting" && this.phase !== "ready") return;
    this.route = route;
    this.phase = "ready";
  }
  start() {
    if (this.phase === "ready" || this.phase === "paused")
      this.phase = "running";
  }
  pause() {
    if (this.phase === "running") this.phase = "paused";
  }
  jump() {
    if (
      this.phase !== "running" ||
      this.route !== "A" ||
      !this.grounded ||
      this.jumped
    )
      return false;
    this.velocityY = -course.jumpSpeed;
    this.grounded = false;
    this.jumped = true;
    return true;
  }
  // Bound each physical step, including calls from test tools or a slow display.
  step(seconds: number) {
    if (this.phase !== "running" || !Number.isFinite(seconds) || seconds <= 0)
      return;
    let remaining = Math.min(seconds, 0.1);
    while (remaining > 0 && this.phase === "running") {
      const dt = Math.min(remaining, 1 / 120);
      this.advance(dt);
      remaining -= dt;
    }
  }
  private advance(dt: number) {
    this.elapsed += dt;
    if (this.route === "B") {
      this.safeDistance += 115 * dt;
      let distance = this.safeDistance;
      for (let i = 0; i < safePoints.length - 1; i++) {
        const [x1, y1] = safePoints[i];
        const [x2, y2] = safePoints[i + 1];
        const length = Math.hypot(x2 - x1, y2 - y1);
        if (distance <= length) {
          this.x = x1 + ((x2 - x1) * distance) / length;
          this.y = y1 + ((y2 - y1) * distance) / length;
          return;
        }
        distance -= length;
      }
      this.x = course.finish;
      this.y = course.ground;
      this.phase = "finished";
      return;
    }
    const oldY = this.y;
    this.x += course.speed * dt;
    const overPlatform = this.x <= course.gapStart || this.x >= course.gapEnd;
    if (!this.grounded || !overPlatform) {
      this.grounded = false;
      this.velocityY += course.gravity * dt;
      this.y += this.velocityY * dt;
      // Landing requires crossing the top from above. A late jump cannot snap out of a fall.
      if (
        overPlatform &&
        oldY <= course.ground &&
        this.y >= course.ground &&
        this.velocityY >= 0
      ) {
        this.y = course.ground;
        this.velocityY = 0;
        this.grounded = true;
      }
    }
    if (this.y > course.ground + 100) this.phase = "fell";
    else if (this.x >= course.finish && this.grounded) {
      this.x = course.finish;
      this.phase = "finished";
    }
  }
}
