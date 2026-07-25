import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { GameEventType, IGameState } from '../core/Types';

export class HUD {
  private stateStore: StateStore;
  private eventBus: EventBus;

  // DOM Elements
  private cashLabel: HTMLElement | null = null;
  private diamondLabel: HTMLElement | null = null;
  private repLabel: HTMLElement | null = null;
  private levelLabel: HTMLElement | null = null;
  private xpFill: HTMLElement | null = null;
  private salonNameLabel: HTMLElement | null = null;
  private activeTaskLabel: HTMLElement | null = null;

  constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();

    this.bindDOMElements();
    this.registerEvents();
    this.updateAll(this.stateStore.getState());
  }

  private bindDOMElements(): void {
    this.cashLabel = document.getElementById('cash-value');
    this.diamondLabel = document.getElementById('diamond-value');
    this.repLabel = document.getElementById('rep-value');
    this.levelLabel = document.getElementById('level-value');
    this.xpFill = document.getElementById('xp-fill');
    this.salonNameLabel = document.getElementById('salon-name-label');
    this.activeTaskLabel = document.getElementById('active-task-label');
  }

  private registerEvents(): void {
    this.eventBus.on(GameEventType.STATE_CHANGED, (state: IGameState) => {
      this.updateAll(state);
    });

    this.eventBus.on(GameEventType.CASH_CHANGED, (cash: number) => {
      if (this.cashLabel) this.cashLabel.textContent = `₺${this.formatNumber(cash)}`;
    });

    this.eventBus.on(GameEventType.DIAMONDS_CHANGED, (diamonds: number) => {
      if (this.diamondLabel) this.diamondLabel.textContent = `${this.formatNumber(diamonds)}`;
    });
  }

  public updateAll(state: IGameState): void {
    const activeBranch = this.stateStore.getActiveBranch();
    if (this.cashLabel) this.cashLabel.textContent = `₺${this.formatNumber(state.cash)}`;
    if (this.diamondLabel) this.diamondLabel.textContent = `${this.formatNumber(state.diamonds)}`;
    if (this.repLabel) this.repLabel.textContent = `${state.reputation.toFixed(1)} / 5.0`;
    if (this.levelLabel) this.levelLabel.textContent = `Lv.${state.playerLevel}`;
    if (this.salonNameLabel) this.salonNameLabel.textContent = activeBranch.salonName;
    if (this.activeTaskLabel) this.activeTaskLabel.textContent = `Görev: ${state.activeTask}`;

    if (this.xpFill) {
      const xpPercent = Math.min(100, Math.floor((state.playerXP / state.nextLevelXP) * 100));
      this.xpFill.style.width = `${xpPercent}%`;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString('tr-TR');
  }
}
