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
import { TutorialManager, TutorialStep } from './ui/TutorialManager';

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
  private tutorialManager!: TutorialManager;

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

    // 2. Initialize HUD, UI Managers, Minigame & Tutorial Manager
    this.hud = new HUD();
    this.uiManager = new UIManager();
    this.haircutMinigame = new HaircutMinigame();
    this.tutorialManager = TutorialManager.getInstance();

    this.createToastDOM();

    // 3. Low Stock Alert Glow Listener
    this.eventBus.on(GameEventType.STATE_CHANGED, (state) => {
      const stockBtn = document.getElementById('btn-products');
      if (stockBtn) {
        if (state.retailProductsStock <= 10) {
          stockBtn.classList.add('low-stock-alert');
        } else {
          stockBtn.classList.remove('low-stock-alert');
        }
      }
    });

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
    const tutStep = this.tutorialManager.currentStep;
    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    const branchOffset = activeBranchIdx * 30;

    // ─────────────────────────────────────────────────────────────
    // STEP 0: Tutorial — ilk koltuk tıklaması (her yere tıkla geçsin)
    // ─────────────────────────────────────────────────────────────
    if (tutStep === TutorialStep.WELCOME_CLICK_CHAIR) {
      const seatedCust = customers.find((c) =>
        c.state === CustomerState.SEATED ||
        c.state === CustomerState.ENTERING ||
        c.state === CustomerState.WAITING_IN_QUEUE
      );
      if (seatedCust) {
        seatedCust.state = CustomerState.SEATED;
        seatedCust.posX = 7 + branchOffset;
        seatedCust.posY = 4;
        this.soundEngine.playScissorsCutSound();
        this.haircutMinigame.startMinigame(seatedCust);
        this.tutorialManager.saveTutorialStep(TutorialStep.MINIGAME_GUIDANCE);
        this.tutorialManager.updateTutorialUI();
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Tutorial — kasadan ödeme al
    // ─────────────────────────────────────────────────────────────
    if (tutStep === TutorialStep.COLLECT_CASH_DESK) {
      const payingCust = customers.find((c) => c.state === CustomerState.PAYING || c.earnedAmount > 0);
      if (payingCust) {
        this.customerManager.collectPayment(payingCust);
        this.soundEngine.playCashRegisterSound();
        this.showToast(`💵 +₺${payingCust.earnedAmount > 0 ? payingCust.earnedAmount : 150} Tahsil Edildi!`);
        this.tutorialManager.saveTutorialStep(TutorialStep.EARN_FOR_SECOND_STATION);
        this.tutorialManager.updateTutorialUI();
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ÖNCE: Oturan müşteri — Screen bazlı & Grid bazlı hit test
    // ─────────────────────────────────────────────────────────────
    const seatedCustomer = customers.find((c) => c.state === CustomerState.SEATED);
    if (seatedCustomer) {
      let hitSeated = false;

      // Screen bazlı (daha hassas)
      if (screenX !== undefined && screenY !== undefined) {
        const hitCustomer = this.renderer.getCustomerAtScreenPoint(screenX, screenY);
        if (hitCustomer && hitCustomer.state === CustomerState.SEATED) {
          hitSeated = true;
        }
      }

      // Grid bazlı fallback (geniş 3.5 karo yarıçapı)
      if (!hitSeated) {
        const chairX = (seatedCustomer.assignedChairIndex === 1 ? 12 : (seatedCustomer.assignedChairIndex === 2 ? 17 : 7)) + branchOffset;
        const distToChair = Math.hypot(gridPos.x - chairX, gridPos.y - 4);
        const distToCust = Math.hypot(gridPos.x - seatedCustomer.posX, gridPos.y - seatedCustomer.posY);
        if (distToChair <= 3.5 || distToCust <= 3.5) {
          hitSeated = true;
        }
      }

      if (hitSeated) {
        this.soundEngine.playScissorsCutSound();
        this.haircutMinigame.startMinigame(seatedCustomer);
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SONRA: Kasadaki müşteri — ödeme al
    // ─────────────────────────────────────────────────────────────
    const payingCustomer = customers.find((c) => c.state === CustomerState.PAYING);
    if (payingCustomer) {
      let hitPaying = false;

      if (screenX !== undefined && screenY !== undefined) {
        const hitCustomer = this.renderer.getCustomerAtScreenPoint(screenX, screenY);
        if (hitCustomer && hitCustomer.state === CustomerState.PAYING) {
          hitPaying = true;
        }
      }

      if (!hitPaying) {
        const distToDesk = Math.hypot(gridPos.x - (18 + branchOffset), gridPos.y - 9);
        const distToCust = Math.hypot(gridPos.x - payingCustomer.posX, gridPos.y - payingCustomer.posY);
        if (distToDesk <= 3.0 || distToCust <= 3.0) {
          hitPaying = true;
        }
      }

      if (hitPaying) {
        this.customerManager.collectPayment(payingCustomer);
        this.soundEngine.playCashRegisterSound();
        this.showToast(`💵 +₺${payingCustomer.earnedAmount} Tahsil Edildi!`);
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EN SON: Kilitli mobilya tıklaması
    // ─────────────────────────────────────────────────────────────
    if (this.handleLockedFurnitureClick(gridPos)) return;
  }

  private handleLockedFurnitureClick(gridPos: { x: number; y: number }): boolean {
    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    const branchOffset = activeBranchIdx * 30;
    const branch = this.stateStore.getActiveBranch();
    const sofasCount = branch.waitingSofasCount || 1;
    const stationsCount = branch.barberStationsCount || 1;

    // Locked waiting sofa tiles: (3,14) idx0 always active; (8,14) idx1; (13,14) idx2
    const sofaTiles = [
      { x: 3 + branchOffset, y: 14 },
      { x: 8 + branchOffset, y: 14 },
      { x: 13 + branchOffset, y: 14 }
    ];
    for (let i = 0; i < sofaTiles.length; i++) {
      if (i < sofasCount) continue; // already unlocked
      const t = sofaTiles[i];
      if (Math.hypot(gridPos.x - t.x, gridPos.y - t.y) <= 1.8) {
        this.uiManager.openBuyFurnitureModal('sofa', i);
        return true;
      }
    }

    // Locked 2nd barber station tiles: (12,3) mirror + (12,4) chair
    if (stationsCount < 2) {
      if (Math.hypot(gridPos.x - (12 + branchOffset), gridPos.y - 3) <= 1.8 || Math.hypot(gridPos.x - (12 + branchOffset), gridPos.y - 4) <= 1.8) {
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
