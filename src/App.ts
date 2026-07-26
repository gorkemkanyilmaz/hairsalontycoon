import { StateStore } from './core/StateStore';
import { TimeManager } from './core/TimeManager';
import { EventBus } from './core/EventBus';
import { GameEventType, CustomerState } from './core/Types';
import { IsometricRenderer } from './render/IsometricRenderer';
import { HUD } from './ui/HUD';
import { UIManager } from './ui/UIManager';
import { CustomerManager } from './ai/CustomerAI';
import { EmployeeManager } from './ai/EmployeeAI';
import { HaircutMinigame } from './ui/HaircutMinigame';
import { SoundEngine } from './audio/SoundEngine';
import { OfflineEarningsManager } from './core/OfflineEarnings';

export class App {
  private stateStore: StateStore;
  private timeManager: TimeManager;
  private eventBus: EventBus;
  private customerManager: CustomerManager;
  private soundEngine: SoundEngine;
  private renderer!: IsometricRenderer;
  private hud!: HUD;
  private uiManager!: UIManager;
  private haircutMinigame!: HaircutMinigame;

  private toastElement!: HTMLElement;

  constructor() {
    this.stateStore = StateStore.getInstance();
    this.timeManager = TimeManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.customerManager = CustomerManager.getInstance();
    this.soundEngine = SoundEngine.getInstance();
  }

  public init(): void {
    console.log('💇‍♀️ Luxe Women Beauty Salon Engine Initializing...');

    // 1. Initialize Isometric Canvas Renderer
    this.renderer = new IsometricRenderer('canvas-container');

    // 2. Initialize HUD, UI Managers & Minigame
    this.hud = new HUD();
    this.uiManager = new UIManager();
    this.haircutMinigame = new HaircutMinigame();

    this.createToastDOM();

    // 3. Register Audio Sound Effect Event Handlers
    this.registerAudioEvents();

    // 4. Check Offline Idle Earnings
    OfflineEarningsManager.getInstance().checkOfflineEarnings(this.uiManager);

    // 5. Bind Camera & Canvas Click Events
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.renderer.zoomIn();
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.renderer.zoomOut();
    });

    document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
      this.renderer.centerCamera();
    });

    this.eventBus.on('CANVAS_CLICKED', (gridPos: { x: number; y: number }, screenX?: number, screenY?: number) => {
      this.handleCanvasClick(gridPos, screenX, screenY);
    });

    // Notification Listener
    this.eventBus.on(GameEventType.NOTIFICATION_TRIGGERED, (message: string) => {
      this.showToast(message);
    });

    // 6. Start Game Ticker Loop
    this.timeManager.addTickListener((deltaSec) => {
      this.customerManager.update(deltaSec);
      EmployeeManager.getInstance().update(deltaSec);
      this.renderer.render();
    });
    this.timeManager.start();

    // Start Ambient BGM on first user interaction
    window.addEventListener('click', () => this.soundEngine.startBGM(), { once: true });

    console.log('🚀 Luxe Women Beauty Salon Engine Ready!');
  }

  private registerAudioEvents(): void {
    this.eventBus.on(GameEventType.HAIRCUT_COMPLETED, () => {
      this.soundEngine.playScissorsCutSound();
    });

    this.eventBus.on(GameEventType.CASH_CHANGED, () => {
      this.soundEngine.playCashRegisterSound();
    });

    this.eventBus.on(GameEventType.LEVEL_UP, () => {
      this.soundEngine.playLevelUpSound();
    });

    this.eventBus.on(GameEventType.CUSTOMER_SPAWNED, () => {
      this.soundEngine.playCustomerPopSound();
    });
  }

  private handleCanvasClick(gridPos: { x: number; y: number }, screenX?: number, screenY?: number): void {
    const customers = this.customerManager.getCustomers();

    // 0. Purchasable (locked) salon furniture — check before customer interactions
    if (this.handleLockedFurnitureClick(gridPos)) return;

    // 1. Direct Screen Point Hit Testing
    if (screenX !== undefined && screenY !== undefined) {
      const hitCustomer = this.renderer.getCustomerAtScreenPoint(screenX, screenY);
      if (hitCustomer) {
        if (hitCustomer.state === CustomerState.SEATED) {
          this.soundEngine.playScissorsCutSound();
          this.haircutMinigame.startMinigame(hitCustomer);
          return;
        } else if (hitCustomer.state === CustomerState.PAYING) {
          this.customerManager.collectPayment(hitCustomer);
          this.soundEngine.playCashRegisterSound();
          this.showToast(`💵 +₺${hitCustomer.earnedAmount} Tahsil Edildi!`);
          return;
        }
      }
    }

    // 2. Fallback Grid Area Hit Testing (Tight 1.5 radius for precision!)
    const seatedCustomer = customers.find((c) => c.state === CustomerState.SEATED);
    if (seatedCustomer) {
      const chairX = seatedCustomer.assignedChairIndex === 1 ? 8 : 5;
      const chairY = 3;
      const distToChair = Math.hypot(gridPos.x - chairX, gridPos.y - chairY);
      const distToCust = Math.hypot(gridPos.x - seatedCustomer.posX, gridPos.y - seatedCustomer.posY);
      if (distToChair <= 1.5 || distToCust <= 1.5) {
        this.soundEngine.playScissorsCutSound();
        this.haircutMinigame.startMinigame(seatedCustomer);
        return;
      }
    }

    const payingCustomer = customers.find((c) => c.state === CustomerState.PAYING);
    if (payingCustomer) {
      const distToDesk = Math.hypot(gridPos.x - 12, gridPos.y - 6);
      if (distToDesk <= 2.0) {
        this.customerManager.collectPayment(payingCustomer);
        this.soundEngine.playCashRegisterSound();
        this.showToast(`💵 +₺${payingCustomer.earnedAmount} Tahsil Edildi!`);
        return;
      }
    }
  }

  private handleLockedFurnitureClick(gridPos: { x: number; y: number }): boolean {
    const branch = this.stateStore.getActiveBranch();
    const sofasCount = branch.waitingSofasCount || 1;
    const stationsCount = branch.barberStationsCount || 1;

    // Locked waiting sofa tiles: (2,9) idx0 always active; (5,9) idx1; (8,9) idx2
    const sofaTiles = [{ x: 2, y: 9 }, { x: 5, y: 9 }, { x: 8, y: 9 }];
    for (let i = 0; i < sofaTiles.length; i++) {
      if (i < sofasCount) continue; // already unlocked
      const t = sofaTiles[i];
      if (Math.hypot(gridPos.x - t.x, gridPos.y - t.y) <= 1.8) {
        this.uiManager.openBuyFurnitureModal('sofa', i);
        return true;
      }
    }

    // Locked 2nd barber station tiles: (8,2) mirror + (8,3) chair
    if (stationsCount < 2) {
      if (Math.hypot(gridPos.x - 8, gridPos.y - 2) <= 2.5 || Math.hypot(gridPos.x - 8, gridPos.y - 3) <= 2.5) {
        this.uiManager.openBuyFurnitureModal('station', 1);
        return true;
      }
    }

    return false;
  }

  private createToastDOM(): void {
    this.toastElement = document.createElement('div');
    this.toastElement.className = 'hud-toast hidden';
    document.body.appendChild(this.toastElement);
  }

  private showToast(message: string): void {
    if (!this.toastElement) return;
    this.toastElement.textContent = message;
    this.toastElement.classList.remove('hidden');
    this.toastElement.classList.add('show');

    setTimeout(() => {
      this.toastElement.classList.remove('show');
      this.toastElement.classList.add('hidden');
    }, 2800);
  }
}
