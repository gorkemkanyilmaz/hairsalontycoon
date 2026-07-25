// Simple, strongly-typed pub/sub event bus
type EventCallback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    this.listeners.set(
      event,
      callbacks.filter((cb) => cb !== callback)
    );
  }

  public emit(event: string, ...args: any[]): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    for (const callback of callbacks) {
      callback(...args);
    }
  }
}
