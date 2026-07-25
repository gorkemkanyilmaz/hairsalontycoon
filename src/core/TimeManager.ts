// High-precision Time Manager & Game Ticker Loop

type TickCallback = (deltaTimeSec: number, totalTimeSec: number) => void;

export class TimeManager {
  private static instance: TimeManager;
  private isRunning: boolean = false;
  private lastFrameTimestamp: number = 0;
  private totalElapsedSec: number = 0;
  private tickCallbacks: TickCallback[] = [];

  private constructor() {}

  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTimestamp = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  public stop(): void {
    this.isRunning = false;
  }

  public addTickListener(callback: TickCallback): void {
    this.tickCallbacks.push(callback);
  }

  public removeTickListener(callback: TickCallback): void {
    this.tickCallbacks = this.tickCallbacks.filter((cb) => cb !== callback);
  }

  private loop(currentTimestamp: number): void {
    if (!this.isRunning) return;

    // Delta time in seconds
    let deltaSec = (currentTimestamp - this.lastFrameTimestamp) / 1000.0;
    this.lastFrameTimestamp = currentTimestamp;

    // Clamp delta to prevent huge jumps on tab switch/lag (max 1/10th of a second per frame)
    if (deltaSec > 0.1) deltaSec = 0.1;

    this.totalElapsedSec += deltaSec;

    for (const callback of this.tickCallbacks) {
      callback(deltaSec, this.totalElapsedSec);
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  public calculateOfflineTime(lastSavedTimestamp: number): number {
    const now = Date.now();
    const offlineMs = Math.max(0, now - lastSavedTimestamp);
    return offlineMs / 1000.0; // Seconds offline
  }
}
