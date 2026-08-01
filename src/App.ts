import { StateStore } from './core/StateStore';
import { TimeManager } from './core/TimeManager';
import { EventBus } from './core/EventBus';
import { GameEventType, CustomerState } from './core/Types';
import { IsometricRenderer } from './render/IsometricRenderer';
import { HUD } from './ui/HUD';
import { UIManager } from './ui/UIManager';
import { CustomerManager, ICustomerNPC } from './ai/CustomerAI';
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
    const col = activeBranchIdx % 3;
    const row = Math.floor(activeBranchIdx / 3);
    const branchOffsetX = col * 30;
    const branchOffsetY = row * 28;
    // Multi-branch construction hit test (allows clicking construction banner for ANY branch on the map without switching first!)
    const branches = this.stateStore.getState().branches || [];
    for (let bIdx = 0; bIdx < branches.length; bIdx++) {
      const bData = branches[bIdx];
      if (bData && bData.constructionEndsTimestamp && Date.now() < bData.constructionEndsTimestamp) {
        const bCol = bIdx % 3;
        const bRow = Math.floor(bIdx / 3);
        const bOffX = bCol * 30;
        const bOffY = bRow * 28;

        let isBannerClicked = false;
        if (screenX !== undefined && screenY !== undefined) {
          const cp = this.renderer.gridToScreen(12 + bOffX, 8 + bOffY);
          const bw = 560 * this.renderer.zoomLevel;
          const bh = 210 * this.renderer.zoomLevel;
          if (
            screenX >= cp.x - bw / 2 &&
            screenX <= cp.x + bw / 2 &&
            screenY >= cp.y - bh / 2 - 40 * this.renderer.zoomLevel &&
            screenY <= cp.y + bh / 2 + 40 * this.renderer.zoomLevel
          ) {
            isBannerClicked = true;
          }
        }
        if (!isBannerClicked) {
          if (Math.hypot(gridPos.x - (12 + bOffX), gridPos.y - (8 + bOffY)) <= 12.0) {
            isBannerClicked = true;
          }
        }

        if (isBannerClicked) {
          this.stateStore.speedUpBranchConstructionWithDiamonds(bIdx);
          return;
        }

        // If click was inside this construction branch's floor grid (0..24, 0..18)
        const lx = gridPos.x - bOffX;
        const ly = gridPos.y - bOffY;
        if (lx >= 0 && lx < 24 && ly >= 0 && ly < 18) {
          const remainingSec = Math.max(1, Math.ceil((bData.constructionEndsTimestamp - Date.now()) / 1000));
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          this.showToast(`🚧 ${bData.salonName} İnşaatı Devam Ediyor! (${mins}:${secs.toString().padStart(2, '0')})`);
          return; // Block salon interaction for this construction branch
        }
      }
    }

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
        seatedCust.posX = 7 + branchOffsetX;
        seatedCust.posY = 4 + branchOffsetY;
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
    // 1. ÖNCE: Kilitli mobilya & "Salonu Büyüt" tıklaması (Öncelikli)
    // ─────────────────────────────────────────────────────────────
    if (this.handleLockedFurnitureClick(gridPos, screenX, screenY)) return;

    // ─────────────────────────────────────────────────────────────
    // 2. ÖNCE: Oturan müşteri — Müşteri görseli veya istasyon/ayna/duvar tıklaması
    // ─────────────────────────────────────────────────────────────
    const seatedCustomers = customers.filter((c) => c.state === CustomerState.SEATED);
    for (const seatedCustomer of seatedCustomers) {
      let hitSeated = false;

      if (screenX !== undefined && screenY !== undefined && this.renderer) {
        const rect = this.renderer.getCanvasBoundingClientRect();
        const clickX = screenX - rect.left;
        const clickY = screenY - rect.top;

        // 1) Doğrudan müşteri beden/kafa/balon tıklaması
        const hitCustomer = this.renderer.getCustomerAtScreenPoint(screenX, screenY);
        if (hitCustomer && hitCustomer.id === seatedCustomer.id) {
          hitSeated = true;
        }

        // 2) Müşterinin oturduğu istasyonun aynası, rozeti veya üst duvarı tıklaması
        if (!hitSeated) {
          const chairIndex = seatedCustomer.assignedChairIndex ?? 0;
          const stationGx = (chairIndex === 1 ? 12 : (chairIndex === 2 ? 17 : 7)) + branchOffsetX;
          const stationGy = 3 + branchOffsetY;
          const cp = this.renderer.gridToScreen(stationGx, stationGy);
          const z = this.renderer.zoomLevel;

          const centerX = cp.x;
          const centerY = cp.y - 135 * z;
          const halfW = Math.max(40, 56 * z);
          const halfH = Math.max(95, 145 * z);

          if (Math.abs(clickX - centerX) <= halfW && Math.abs(clickY - centerY) <= halfH) {
            hitSeated = true;
          }
        }
      } else {
        const chairX = (seatedCustomer.assignedChairIndex === 1 ? 12 : (seatedCustomer.assignedChairIndex === 2 ? 17 : 7)) + branchOffsetX;
        const chairY = 4 + branchOffsetY;
        if (Math.hypot(gridPos.x - chairX, gridPos.y - chairY) <= 1.2) {
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
    // 3. SONRA: Kasadaki veya kasaya yürüyen müşteriler — Ödeme tahsili
    // ─────────────────────────────────────────────────────────────
    const payingCustomers = customers.filter((c) => (c.state === CustomerState.PAYING || (c.earnedAmount || 0) > 0) && (c.earnedAmount || 0) > 0);
    if (payingCustomers.length > 0) {
      let collectedCustomer: ICustomerNPC | null = null;

      if (screenX !== undefined && screenY !== undefined && this.renderer) {
        const hitCustomer = this.renderer.getCustomerAtScreenPoint(screenX, screenY);
        if (hitCustomer && (hitCustomer.earnedAmount || 0) > 0) {
          collectedCustomer = hitCustomer;
        }

        // VEYA doğrudan Kasa Masasına tıklanırsa, ilk ödemeyi tahsil et
        if (!collectedCustomer) {
          const rect = this.renderer.getCanvasBoundingClientRect();
          const clickX = screenX - rect.left;
          const clickY = screenY - rect.top;
          const deskGx = 18 + branchOffsetX;
          const deskGy = 9 + branchOffsetY;
          const cp = this.renderer.gridToScreen(deskGx, deskGy);
          const z = this.renderer.zoomLevel;

          const centerX = cp.x;
          const centerY = cp.y - 20 * z;
          const halfW = Math.max(30, 45 * z);
          const halfH = Math.max(30, 45 * z);

          if (Math.abs(clickX - centerX) <= halfW && Math.abs(clickY - centerY) <= halfH) {
            collectedCustomer = payingCustomers[0];
          }
        }
      } else {
        const distToDesk = Math.hypot(gridPos.x - (18 + branchOffsetX), gridPos.y - (9 + branchOffsetY));
        if (distToDesk <= 1.8) {
          collectedCustomer = payingCustomers[0];
        }
      }

      if (collectedCustomer) {
        const earned = collectedCustomer.earnedAmount;
        this.customerManager.collectPayment(collectedCustomer);
        this.soundEngine.playCashRegisterSound();
        this.showToast(`💵 +₺${earned} Tahsil Edildi!`);
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Eğitimdeki çalışan/istasyon tıklaması
    // ─────────────────────────────────────────────────────────────
    const employees = this.stateStore.getState().employees;

    const stationTiles = [
      { x: 7 + branchOffsetX, y: 3 + branchOffsetY, chairIdx: 0 },
      { x: 12 + branchOffsetX, y: 3 + branchOffsetY, chairIdx: 1 },
      { x: 17 + branchOffsetX, y: 3 + branchOffsetY, chairIdx: 2 }
    ];

    for (const st of stationTiles) {
      if (Math.hypot(gridPos.x - st.x, gridPos.y - st.y) <= 2.2 || Math.hypot(gridPos.x - st.x, gridPos.y - (st.y + 1)) <= 2.2) {
        const empInTraining = employees.find(
          (e) => (e.branchIndex || 0) === activeBranchIdx &&
          e.assignedChairIndex === st.chairIdx &&
          e.trainingEndsTimestamp && Date.now() < e.trainingEndsTimestamp
        );
        if (empInTraining) {
          this.uiManager.openEmployeeTrainingModal(empInTraining);
          return;
        }
      }
    }

    const empInTrainingClicked = employees.find(
      (e) => (e.branchIndex || 0) === activeBranchIdx &&
      Math.hypot(gridPos.x - e.posX, gridPos.y - e.posY) <= 2.2 &&
      e.trainingEndsTimestamp && Date.now() < e.trainingEndsTimestamp
    );
    if (empInTrainingClicked) {
      this.uiManager.openEmployeeTrainingModal(empInTrainingClicked);
      return;
    }
  }

  private handleLockedFurnitureClick(gridPos: { x: number; y: number }, screenX?: number, screenY?: number): boolean {
    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    const col = activeBranchIdx % 3;
    const row = Math.floor(activeBranchIdx / 3);
    const branchOffsetX = col * 30;
    const branchOffsetY = row * 28;
    const branch = this.stateStore.getActiveBranch();
    const sofasCount = branch.waitingSofasCount || 1;
    const stationsCount = branch.barberStationsCount || 1;

    // Locked waiting sofa tiles: (3,14) idx0 always active; (8,14) idx1; (13,14) idx2
    const sofaTiles = [
      { x: 3 + branchOffsetX, y: 14 + branchOffsetY },
      { x: 8 + branchOffsetX, y: 14 + branchOffsetY },
      { x: 13 + branchOffsetX, y: 14 + branchOffsetY }
    ];
    for (let i = 0; i < sofaTiles.length; i++) {
      if (i < sofasCount) continue; // already unlocked
      const t = sofaTiles[i];
      if (Math.hypot(gridPos.x - t.x, gridPos.y - t.y) <= 1.8) {
        this.uiManager.openBuyFurnitureModal('sofa', i);
        return true;
      }
    }

    // Convert screen coordinates to canvas-relative coordinates
    let clickX: number | undefined;
    let clickY: number | undefined;
    if (screenX !== undefined && screenY !== undefined && this.renderer) {
      const rect = this.renderer.getCanvasBoundingClientRect();
      clickX = screenX - rect.left;
      clickY = screenY - rect.top;
    }

    // Locked 2nd barber station tiles: mirror at (12, 3), chair at (12, 4)
    if (stationsCount < 2) {
      let hitStation2 = false;
      const targetGx = 12 + branchOffsetX;
      const targetGy = 3 + branchOffsetY;
      const cp2 = this.renderer.gridToScreen(targetGx, targetGy);
      const z = this.renderer.zoomLevel;
      // Visual bounding box covering mirror sprite, badge, and full wall top area
      const centerX = cp2.x;
      const centerY = cp2.y - 135 * z;
      const halfW = Math.max(40, 56 * z);
      const halfH = Math.max(95, 145 * z);

      if (clickX !== undefined && clickY !== undefined) {
        if (Math.abs(clickX - centerX) <= halfW && Math.abs(clickY - centerY) <= halfH) {
          hitStation2 = true;
        }
      } else {
        if (Math.abs(gridPos.x - targetGx) <= 0.8 && Math.abs(gridPos.y - targetGy) <= 0.8) {
          hitStation2 = true;
        }
      }

      if (hitStation2) {
        this.uiManager.openBuyFurnitureModal('station', 1);
        return true;
      }
    }

    // Locked 3rd barber station tiles: mirror at (17, 3), chair at (17, 4) ("Salonu Büyüt" / 3. İstasyon)
    if (stationsCount < 3) {
      let hitStation3 = false;
      const targetGx = 17 + branchOffsetX;
      const targetGy = 3 + branchOffsetY;
      const cp3 = this.renderer.gridToScreen(targetGx, targetGy);
      const z = this.renderer.zoomLevel;
      // Visual bounding box covering mirror sprite, badge, and full wall top area
      const centerX = cp3.x;
      const centerY = cp3.y - 135 * z;
      const halfW = Math.max(40, 56 * z);
      const halfH = Math.max(95, 145 * z);

      if (clickX !== undefined && clickY !== undefined) {
        if (Math.abs(clickX - centerX) <= halfW && Math.abs(clickY - centerY) <= halfH) {
          hitStation3 = true;
        }
      } else {
        if (Math.abs(gridPos.x - targetGx) <= 0.8 && Math.abs(gridPos.y - targetGy) <= 0.8) {
          hitStation3 = true;
        }
      }

      if (hitStation3) {
        this.uiManager.openBuyFurnitureModal('station', 2);
        return true;
      }
    }

    // Branch under construction speedup click check
    if (branch.constructionEndsTimestamp && Date.now() < branch.constructionEndsTimestamp) {
      if (Math.hypot(gridPos.x - (12 + branchOffsetX), gridPos.y - (7 + branchOffsetY)) <= 3.5) {
        this.stateStore.speedUpBranchConstructionWithDiamonds(activeBranchIdx);
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
