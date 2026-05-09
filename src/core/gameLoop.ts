export type GameLoopCallbacks = {
  update: (fixedDeltaMs: number) => void;
  render: (alpha: number) => void;
};

export class FixedStepGameLoop {
  private readonly fixedDeltaMs: number;
  private readonly maxAccumulatedMs: number;
  private animationFrameId: number | null = null;
  private previousTimestamp = 0;
  private accumulatedMs = 0;
  private running = false;

  constructor(
    private readonly callbacks: GameLoopCallbacks,
    fixedDeltaMs = 1000 / 60,
  ) {
    this.fixedDeltaMs = fixedDeltaMs;
    this.maxAccumulatedMs = fixedDeltaMs * 5;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.previousTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.running = false;
    this.accumulatedMs = 0;
  }

  private readonly frame = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    const elapsedMs = Math.min(timestamp - this.previousTimestamp, this.maxAccumulatedMs);
    this.previousTimestamp = timestamp;
    this.accumulatedMs += elapsedMs;

    while (this.accumulatedMs >= this.fixedDeltaMs) {
      this.callbacks.update(this.fixedDeltaMs);
      this.accumulatedMs -= this.fixedDeltaMs;
    }

    this.callbacks.render(this.accumulatedMs / this.fixedDeltaMs);
    this.animationFrameId = requestAnimationFrame(this.frame);
  };
}
