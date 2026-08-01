import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { GameEventType, CustomerState } from '../core/Types';
import { CustomerManager } from '../ai/CustomerAI';

export enum TutorialStep {
  WELCOME_CLICK_CHAIR = 0,
  MINIGAME_GUIDANCE = 1,
  COLLECT_CASH_DESK = 2,
  EARN_FOR_HIRE_CANSU = 3,
  OPEN_EQUIPMENT_MENU_CANSU = 4,
  HIRE_CANSU = 5,
  EARN_FOR_SECOND_STATION = 6,
  BUY_SECOND_STATION = 7,
  EARN_FOR_SOFA_2 = 8,
  BUY_SOFA_2 = 9,
  EARN_FOR_RECEPTIONIST = 10,
  OPEN_EQUIPMENT_MENU_PELIN = 11,
  HIRE_RECEPTIONIST = 12,
  EARN_FOR_SOFA_3 = 13,
  BUY_SOFA_3 = 14,
  EARN_FOR_MARKETING = 15,
  OPEN_UPGRADES_MARKETING = 16,
  BUY_MARKETING = 17,
  COMPLETED = 99
}

export class TutorialManager {
  private static instance: TutorialManager;
  private stateStore: StateStore;
  private eventBus: EventBus;

  public currentStep: TutorialStep = TutorialStep.WELCOME_CLICK_CHAIR;
  public isDismissed: boolean = false;
  private overlayElement!: HTMLElement;
  private bannerText!: HTMLElement;
  private spotlightRing!: HTMLElement;

  private constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();

    this.checkSavedTutorialStep();
    this.createTutorialDOM();
    this.setupListeners();
  }

  public static getInstance(): TutorialManager {
    if (!TutorialManager.instance) {
      TutorialManager.instance = new TutorialManager();
    }
    return TutorialManager.instance;
  }

  private checkSavedTutorialStep(): void {
    const savedStep = localStorage.getItem('luxe_salon_tutorial_step');
    if (savedStep !== null) {
      this.currentStep = parseInt(savedStep, 10);
    } else {
      this.currentStep = TutorialStep.WELCOME_CLICK_CHAIR;
    }
  }

  public saveTutorialStep(step: TutorialStep): void {
    this.currentStep = step;
    this.isDismissed = false;
    localStorage.setItem('luxe_salon_tutorial_step', step.toString());
  }

  public resetTutorial(): void {
    localStorage.removeItem('luxe_salon_tutorial_step');
    this.currentStep = TutorialStep.WELCOME_CLICK_CHAIR;
    this.isDismissed = false;
    this.saveTutorialStep(TutorialStep.WELCOME_CLICK_CHAIR);
  }

  private createTutorialDOM(): void {
    let overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-overlay';
      overlay.className = this.currentStep === TutorialStep.COMPLETED ? 'hidden' : '';
      overlay.style.cssText = 'position: relative; z-index: 999999 !important;';
      overlay.innerHTML = `
        <div class="tutorial-banner-box" id="tutorial-banner" style="z-index: 999999 !important;">
          <div style="display: flex; align-items: center; gap: 12px; text-align: left; width: 100%;">
            <div class="quest-checkbox-icon" id="quest-checkbox-icon">[ ]</div>
            <div style="flex: 1;">
              <h4 id="tutorial-title" style="margin: 0 0 2px 0; color: #fbbf24; font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">🎯 GÜNCEL GÖREV</h4>
              <p id="tutorial-text" style="margin: 0; font-size: 13px; color: #ffffff; line-height: 1.3; font-weight: 700;"></p>
            </div>
            <button id="btn-tutorial-dismiss" class="btn-tutorial-dismiss">KAPAT ✕</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    let showToggleBtn = document.getElementById('btn-show-quest-toggle');
    if (!showToggleBtn) {
      showToggleBtn = document.createElement('button');
      showToggleBtn.id = 'btn-show-quest-toggle';
      showToggleBtn.className = 'btn-show-quest-toggle hidden';
      showToggleBtn.innerHTML = '🎯 Görevi Göster';
      document.body.appendChild(showToggleBtn);

      showToggleBtn.addEventListener('click', () => {
        this.isDismissed = false;
        showToggleBtn?.classList.add('hidden');
        this.updateTutorialUI();
      });
    }

    document.getElementById('btn-tutorial-dismiss')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDismissed = true;
      this.overlayElement.classList.add('hidden');
      document.getElementById('btn-show-quest-toggle')?.classList.remove('hidden');
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
    });

    let spotlight = document.getElementById('tutorial-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.id = 'tutorial-spotlight';
      spotlight.className = 'tutorial-spotlight-ring';
      spotlight.style.cssText = 'position: fixed; display: none; z-index: 999999 !important; pointer-events: auto !important; cursor: pointer;';
      document.body.appendChild(spotlight);

      spotlight.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.handleSpotlightClick();
      });
    }

    this.overlayElement = overlay;
    this.bannerText = document.getElementById('tutorial-text')!;
    this.spotlightRing = spotlight;

    this.updateTutorialUI();
  }

  public handleSpotlightClick(): void {
    const custMgr = CustomerManager.getInstance();
    const customers = custMgr.getCustomers();

    switch (this.currentStep) {
      case TutorialStep.WELCOME_CLICK_CHAIR: {
        const seatedCust = customers.find((c: any) => c.state === CustomerState.SEATED || c.state === CustomerState.ENTERING);
        if (seatedCust) {
          seatedCust.state = CustomerState.SEATED;
          seatedCust.posX = 7;
          seatedCust.posY = 4;
          if ((window as any).haircutMinigameInstance) {
            (window as any).haircutMinigameInstance.startMinigame(seatedCust);
          }
          this.saveTutorialStep(TutorialStep.MINIGAME_GUIDANCE);
          this.updateTutorialUI();
        }
        break;
      }

      case TutorialStep.COLLECT_CASH_DESK: {
        const payingCust = customers.find((c: any) => c.state === CustomerState.PAYING || c.earnedAmount > 0);
        if (payingCust) {
          custMgr.collectPayment(payingCust);
          const currentCash = this.stateStore.getState().cash;
          if (currentCash >= 2000) {
            this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_CANSU);
          } else {
            this.saveTutorialStep(TutorialStep.EARN_FOR_HIRE_CANSU);
          }
          this.updateTutorialUI();
        }
        break;
      }

      case TutorialStep.OPEN_EQUIPMENT_MENU_CANSU:
      case TutorialStep.OPEN_EQUIPMENT_MENU_PELIN: {
        document.getElementById('btn-employees')?.click();
        if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU) {
          this.saveTutorialStep(TutorialStep.HIRE_CANSU);
        } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_PELIN) {
          this.saveTutorialStep(TutorialStep.HIRE_RECEPTIONIST);
        }
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.HIRE_CANSU: {
        const btnHire = document.getElementById('btn-hire-stylist-1');
        if (btnHire) btnHire.click();
        break;
      }

      case TutorialStep.BUY_SECOND_STATION: {
        this.stateStore.buyBarberStation();
        this.saveTutorialStep(TutorialStep.EARN_FOR_SOFA_2);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.BUY_SOFA_2: {
        this.stateStore.buyWaitingSofa();
        const cash = this.stateStore.getState().cash;
        if (cash >= 2500) {
          this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_PELIN);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_RECEPTIONIST);
        }
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.HIRE_RECEPTIONIST: {
        const btnRecep = document.getElementById('btn-hire-receptionist');
        if (btnRecep) btnRecep.click();
        break;
      }

      case TutorialStep.BUY_SOFA_3: {
        this.stateStore.buyWaitingSofa();
        const cash = this.stateStore.getState().cash;
        if (cash >= 250) {
          this.saveTutorialStep(TutorialStep.OPEN_UPGRADES_MARKETING);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_MARKETING);
        }
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.OPEN_UPGRADES_MARKETING: {
        document.getElementById('btn-upgrades')?.click();
        this.saveTutorialStep(TutorialStep.BUY_MARKETING);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.BUY_MARKETING: {
        if (this.stateStore.purchaseUpgrade('marketing_boost')) {
          this.finishTutorial();
        }
        break;
      }
    }
  }

  private setupListeners(): void {
    this.eventBus.on(GameEventType.CUSTOMER_SEATED, () => {
      if (this.currentStep === TutorialStep.WELCOME_CLICK_CHAIR) {
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.HAIRCUT_COMPLETED, () => {
      if (this.currentStep === TutorialStep.MINIGAME_GUIDANCE) {
        this.saveTutorialStep(TutorialStep.COLLECT_CASH_DESK);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.CASH_CHANGED, (cash: number) => {
      this.checkCashPrerequisites(cash);
      this.updateTutorialUI();
    });

    this.eventBus.on(GameEventType.EMPLOYEE_HIRED, (emp: any) => {
      if (this.currentStep === TutorialStep.HIRE_CANSU && (emp.role === 'JUNIOR_STYLIST' || emp.name?.includes('Cansu'))) {
        const currentCash = this.stateStore.getState().cash;
        if (currentCash >= 2000) {
          this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_SECOND_STATION);
        }
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.HIRE_RECEPTIONIST && emp.role === 'RECEPTIONIST') {
        const currentCash = this.stateStore.getState().cash;
        if (currentCash >= 2500) {
          this.saveTutorialStep(TutorialStep.BUY_SOFA_3);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_SOFA_3);
        }
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.UPGRADE_PURCHASED, (upg: any) => {
      if ((this.currentStep === TutorialStep.BUY_MARKETING || this.currentStep === TutorialStep.OPEN_UPGRADES_MARKETING) && upg.id === 'marketing_boost') {
        this.finishTutorial();
      }
    });

    this.eventBus.on(GameEventType.STATE_CHANGED, () => {
      const activeBranch = this.stateStore.getActiveBranch();
      const cash = this.stateStore.getState().cash;

      this.checkCashPrerequisites(cash);

      if (this.currentStep === TutorialStep.BUY_SECOND_STATION && (activeBranch.barberStationsCount || 1) >= 2) {
        if (cash >= 800) {
          this.saveTutorialStep(TutorialStep.BUY_SOFA_2);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_SOFA_2);
        }
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.BUY_SOFA_2 && (activeBranch.waitingSofasCount || 1) >= 2) {
        if (cash >= 2500) {
          this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_PELIN);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_RECEPTIONIST);
        }
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.BUY_SOFA_3 && (activeBranch.waitingSofasCount || 1) >= 3) {
        if (cash >= 250) {
          this.saveTutorialStep(TutorialStep.OPEN_UPGRADES_MARKETING);
        } else {
          this.saveTutorialStep(TutorialStep.EARN_FOR_MARKETING);
        }
        this.updateTutorialUI();
      }
    });

    // Bind HUD menu click events directly to advance steps!
    document.getElementById('btn-employees')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU) {
        this.saveTutorialStep(TutorialStep.HIRE_CANSU);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_PELIN) {
        this.saveTutorialStep(TutorialStep.HIRE_RECEPTIONIST);
        this.updateTutorialUI();
      }
    });

    document.getElementById('btn-upgrades')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_UPGRADES_MARKETING) {
        this.saveTutorialStep(TutorialStep.BUY_MARKETING);
        this.updateTutorialUI();
      }
    });
  }

  private checkCashPrerequisites(cash: number): void {
    if (this.currentStep === TutorialStep.COLLECT_CASH_DESK && cash > 0) {
      if (cash >= 2000) {
        this.isDismissed = false;
        this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_CANSU);
      } else {
        this.saveTutorialStep(TutorialStep.EARN_FOR_HIRE_CANSU);
      }
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_HIRE_CANSU && cash >= 2000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_CANSU);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SECOND_STATION && cash >= 2000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SOFA_2 && cash >= 800) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.BUY_SOFA_2);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_RECEPTIONIST && cash >= 2500) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_PELIN);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SOFA_3 && cash >= 2500) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.BUY_SOFA_3);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_MARKETING && cash >= 250) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_UPGRADES_MARKETING);
      this.updateTutorialUI();
    }
  }

  public updateTutorialUI(renderer?: any): void {
    const showToggleBtn = document.getElementById('btn-show-quest-toggle');

    if (this.currentStep === TutorialStep.COMPLETED) {
      this.overlayElement.classList.add('hidden');
      if (showToggleBtn) showToggleBtn.style.display = 'none';
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    if (this.isDismissed) {
      this.overlayElement.classList.add('hidden');
      if (showToggleBtn) {
        showToggleBtn.style.display = 'block';
        showToggleBtn.classList.remove('hidden');
      }
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    this.overlayElement.classList.remove('hidden');
    if (showToggleBtn) {
      showToggleBtn.style.display = 'none';
      showToggleBtn.classList.add('hidden');
    }

    const customers = CustomerManager.getInstance().getCustomers();
    const seatedCust = customers.find((c: any) => c.state === CustomerState.SEATED);
    const currentCash = this.stateStore.getState().cash;

    const btnDismiss = document.getElementById('btn-tutorial-dismiss');
    if (btnDismiss) {
      if (this.currentStep === TutorialStep.WELCOME_CLICK_CHAIR || this.currentStep === TutorialStep.MINIGAME_GUIDANCE) {
        btnDismiss.style.display = 'none';
      } else {
        btnDismiss.style.display = 'inline-block';
      }
    }

    if (this.currentStep === TutorialStep.MINIGAME_GUIDANCE) {
      this.overlayElement.classList.add('top-position');
    } else {
      this.overlayElement.classList.remove('top-position');
    }

    const checkboxEl = document.getElementById('quest-checkbox-icon');
    const bannerBoxEl = document.getElementById('tutorial-banner');

    let isReady = false;
    let questText = '';

    switch (this.currentStep) {
      case TutorialStep.WELCOME_CLICK_CHAIR:
        questText = seatedCust
          ? '✨ Müşterin 1. Koltuğa Oturdu! Parlayan Müşteriye tıklayarak saç yapımını başlat!'
          : '⏳ ADIM 1: 1. Koltuğa Oturan Müşteriye Tıkla';
        isReady = !!seatedCust;
        break;

      case TutorialStep.MINIGAME_GUIDANCE:
        questText = '✂️ Saç Rengini ve Stilini Eşleştirip "SAÇI ŞEKİLLENDİR VE BİTİR" Butonuna Tıkla!';
        isReady = true;
        break;

      case TutorialStep.COLLECT_CASH_DESK:
        questText = '💵 Kasadaki Müşteriye Tıklayarak Ödemeyi Tahsil Et!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_HIRE_CANSU:
        const c3 = Math.min(currentCash, 2000);
        questText = `🎯 1. Kuaför (Cansu A.) İçin ₺2,000 Biriktir (₺${c3} / ₺2,000)`;
        isReady = currentCash >= 2000;
        break;

      case TutorialStep.OPEN_EQUIPMENT_MENU_CANSU:
        questText = '👩‍🎨 ₺2,000 Birikti! "Ekip" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.HIRE_CANSU:
        questText = '👩‍🎨 "Cansu A. ₺2,000 İşe Al" Butonuna Tıklayarak İlk Kuaförünü Al!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_SECOND_STATION:
        const c6 = Math.min(currentCash, 2000);
        questText = `🎯 2. Kuaför Standı İçin ₺2,000 Biriktir (₺${c6} / ₺2,000)`;
        isReady = currentCash >= 2000;
        break;

      case TutorialStep.BUY_SECOND_STATION:
        questText = '✂️ ₺2,000 Birikti! Haritadaki Kilitli 2. Standı Satın Al (₺2,000)';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_SOFA_2:
        const c8 = Math.min(currentCash, 800);
        questText = `🛋️ 2. Bekleme Koltuğu İçin ₺800 Biriktir (₺${c8} / ₺800)`;
        isReady = currentCash >= 800;
        break;

      case TutorialStep.BUY_SOFA_2:
        questText = '🛋️ ₺800 Birikti! Haritadaki Kilitli 2. Bekleme Koltuğunu Satın Al (₺800)';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_RECEPTIONIST:
        const c10 = Math.min(currentCash, 2500);
        questText = `🎯 Pelin K. (Kasiyer) İçin ₺2,500 Biriktir (₺${c10} / ₺2,500)`;
        isReady = currentCash >= 2500;
        break;

      case TutorialStep.OPEN_EQUIPMENT_MENU_PELIN:
        questText = '👩‍💼 ₺2,500 Birikti! "Ekip" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.HIRE_RECEPTIONIST:
        questText = '👩‍💼 "Pelin K. ₺2,500 İşe Al" Butonuna Tıklayarak Otomatik Kasiyeri Al!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_SOFA_3:
        const c13 = Math.min(currentCash, 2500);
        questText = `🛋️ 3. Bekleme Koltuğu İçin ₺2,500 Biriktir (₺${c13} / ₺2,500)`;
        isReady = currentCash >= 2500;
        break;

      case TutorialStep.BUY_SOFA_3:
        questText = '🛋️ ₺2,500 Birikti! Haritadaki Kilitli 3. Bekleme Koltuğunu Satın Al (₺2,500)';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_MARKETING:
        const c15 = Math.min(currentCash, 250);
        questText = `📢 Sosyal Medya Reklamı İçin ₺250 Biriktir (₺${c15} / ₺250)`;
        isReady = currentCash >= 250;
        break;

      case TutorialStep.OPEN_UPGRADES_MARKETING:
        questText = '📢 ₺250 Birikti! "Geliştir" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.BUY_MARKETING:
        questText = '📱 "Sosyal Medya Reklamları (₺250)" Alarak Müşteri Akışını Artır!';
        isReady = true;
        break;

      default:
        questText = '🎉 Tebrikler! Tüm Başlangıç Görevlerini Tamamladınız!';
        isReady = true;
        break;
    }

    this.bannerText.textContent = questText;

    if (checkboxEl) {
      if (isReady) {
        checkboxEl.textContent = '[✓]';
        checkboxEl.classList.add('completed');
      } else {
        checkboxEl.textContent = '[ ]';
        checkboxEl.classList.remove('completed');
      }
    }

    if (bannerBoxEl) {
      if (isReady) {
        bannerBoxEl.classList.add('pulsing-ready');
      } else {
        bannerBoxEl.classList.remove('pulsing-ready');
      }
    }

    this.positionSpotlightForStep(renderer);
  }

  public positionSpotlightForStep(renderer?: any): void {
    if (this.currentStep === TutorialStep.COMPLETED || !this.spotlightRing || this.isDismissed) {
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    // Hide spotlight ring during EARN/gameplay steps so controls are completely unobscured
    const isEarnStep =
      this.currentStep === TutorialStep.MINIGAME_GUIDANCE ||
      this.currentStep === TutorialStep.EARN_FOR_HIRE_CANSU ||
      this.currentStep === TutorialStep.EARN_FOR_SECOND_STATION ||
      this.currentStep === TutorialStep.EARN_FOR_SOFA_2 ||
      this.currentStep === TutorialStep.EARN_FOR_RECEPTIONIST ||
      this.currentStep === TutorialStep.EARN_FOR_SOFA_3 ||
      this.currentStep === TutorialStep.EARN_FOR_MARKETING;

    if (isEarnStep) {
      this.spotlightRing.style.display = 'none';
      return;
    }

    const canvas = document.querySelector('#canvas-container canvas') as HTMLCanvasElement;
    const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const customers = CustomerManager.getInstance().getCustomers();

    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    const branchOffset = activeBranchIdx * 30;

    if (this.currentStep === TutorialStep.WELCOME_CLICK_CHAIR) {
      const seatedCust = customers.find((c: any) => c.state === CustomerState.SEATED);
      if (!seatedCust || !renderer) {
        this.spotlightRing.style.display = 'none';
        return;
      }
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(7 + branchOffset, 4);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.COLLECT_CASH_DESK && renderer) {
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(18 + branchOffset, 9);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.BUY_SECOND_STATION && renderer) {
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(12 + branchOffset, 3);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.BUY_SOFA_2 && renderer) {
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(8 + branchOffset, 14);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.BUY_SOFA_3 && renderer) {
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(13 + branchOffset, 14);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (
      this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU ||
      this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_PELIN
    ) {
      this.highlightElementById('btn-employees');
    } else if (this.currentStep === TutorialStep.HIRE_CANSU) {
      this.highlightElementById('btn-hire-stylist-1');
    } else if (this.currentStep === TutorialStep.HIRE_RECEPTIONIST) {
      this.highlightElementById('btn-hire-receptionist');
    } else if (this.currentStep === TutorialStep.OPEN_UPGRADES_MARKETING) {
      this.highlightElementById('btn-upgrades');
    } else if (this.currentStep === TutorialStep.BUY_MARKETING) {
      this.highlightElementByQuery('[data-id="marketing_boost"]');
    } else {
      this.spotlightRing.style.display = 'none';
    }
  }

  private highlightElementById(id: string): void {
    const btn = document.getElementById(id);
    if (btn) {
      this.spotlightRing.style.display = 'block';
      const rect = btn.getBoundingClientRect();
      this.spotlightRing.style.left = `${rect.left - 6}px`;
      this.spotlightRing.style.top = `${rect.top - 6}px`;
      this.spotlightRing.style.width = `${rect.width + 12}px`;
      this.spotlightRing.style.height = `${rect.height + 12}px`;
    } else {
      this.spotlightRing.style.display = 'none';
    }
  }

  private highlightElementByQuery(query: string): void {
    const btn = document.querySelector(query);
    if (btn) {
      this.spotlightRing.style.display = 'block';
      const rect = btn.getBoundingClientRect();
      this.spotlightRing.style.left = `${rect.left - 6}px`;
      this.spotlightRing.style.top = `${rect.top - 6}px`;
      this.spotlightRing.style.width = `${rect.width + 12}px`;
      this.spotlightRing.style.height = `${rect.height + 12}px`;
    } else {
      this.spotlightRing.style.display = 'none';
    }
  }

  public finishTutorial(): void {
    this.saveTutorialStep(TutorialStep.COMPLETED);
    this.overlayElement.classList.add('hidden');
    if (this.spotlightRing) this.spotlightRing.style.display = 'none';

    this.stateStore.addCash(500);
    this.stateStore.addDiamonds(25);

    this.eventBus.emit(
      GameEventType.NOTIFICATION_TRIGGERED,
      `🎉 TEBRİKLER! Tüm Başlangıç Görevlerini Başarıyla Tamamladın! +₺500 Bonus & 25 💎 Elmas Kazandın!`
    );
  }
}
