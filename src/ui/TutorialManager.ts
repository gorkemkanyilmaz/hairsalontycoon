import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { GameEventType } from '../core/Types';

export enum TutorialStep {
  WELCOME_CLICK_CHAIR = 0,
  MINIGAME_GUIDANCE = 1,
  COLLECT_CASH_DESK = 2,
  OPEN_EQUIPMENT_MENU = 3,
  HIRE_CANSU = 4,
  TRAIN_EMPLOYEE = 5,
  BUY_SECOND_STATION = 6,
  COMPLETED = 99
}

export class TutorialManager {
  private static instance: TutorialManager;
  private stateStore: StateStore;
  private eventBus: EventBus;

  public currentStep: TutorialStep = TutorialStep.WELCOME_CLICK_CHAIR;
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
    localStorage.setItem('luxe_salon_tutorial_step', step.toString());
  }

  private createTutorialDOM(): void {
    let overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-overlay';
      overlay.className = this.currentStep === TutorialStep.COMPLETED ? 'hidden' : '';
      overlay.innerHTML = `
        <div class="tutorial-banner-box" id="tutorial-banner">
          <div style="font-size: 28px; margin-bottom: 4px;">✨</div>
          <h4 id="tutorial-title" style="margin: 0 0 6px 0; color: #fbbf24; font-size: 16px; font-weight: 800;">EĞİTİCİ REHBER</h4>
          <p id="tutorial-text" style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.4;"></p>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    let spotlight = document.getElementById('tutorial-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.id = 'tutorial-spotlight';
      spotlight.className = 'tutorial-spotlight-ring';
      spotlight.style.cssText = 'position: fixed; display: none; z-index: 99999; pointer-events: auto !important; cursor: pointer;';
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

  public setDependencies(customerManager: any, haircutMinigame: any, uiManager: any): void {
    (this as any).customerManager = customerManager;
    (this as any).haircutMinigame = haircutMinigame;
    (this as any).uiManager = uiManager;
  }

  public handleSpotlightClick(): void {
    const custMgr = (this as any).customerManager || (window as any).customerMgr;
    const minigame = (this as any).haircutMinigame || (window as any).haircutMinigame;
    const uiMgr = (this as any).uiManager || (window as any).uiMgr;
    const customers = custMgr ? custMgr.getCustomers() : [];

    switch (this.currentStep) {
      case TutorialStep.WELCOME_CLICK_CHAIR: {
        const seatedCust = customers.find((c: any) => c.state === 'SEATED' || c.state === 'ENTERING');
        if (seatedCust && minigame) {
          seatedCust.state = 'SEATED';
          seatedCust.posX = 5;
          seatedCust.posY = 3;
          minigame.startMinigame(seatedCust);
          this.saveTutorialStep(TutorialStep.MINIGAME_GUIDANCE);
          this.updateTutorialUI();
        }
        break;
      }

      case TutorialStep.COLLECT_CASH_DESK: {
        const payingCust = customers.find((c: any) => c.state === 'PAYING' || c.earnedAmount > 0);
        if (payingCust && custMgr) {
          custMgr.collectPayment(payingCust);
          this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU);
          this.updateTutorialUI();
        }
        break;
      }

      case TutorialStep.OPEN_EQUIPMENT_MENU: {
        if (uiMgr) {
          uiMgr.openModal('employees');
        } else {
          document.getElementById('btn-employees')?.click();
        }
        this.saveTutorialStep(TutorialStep.HIRE_CANSU);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.HIRE_CANSU: {
        const btnHire = document.getElementById('btn-hire-stylist-1');
        if (btnHire) btnHire.click();
        else this.stateStore.hireEmployee('JUNIOR_STYLIST', 'Cansu A.', 0);
        this.saveTutorialStep(TutorialStep.TRAIN_EMPLOYEE);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.TRAIN_EMPLOYEE: {
        const btnLvl = document.querySelector('[id^="btn-lvl-"]') as HTMLElement;
        if (btnLvl) btnLvl.click();
        this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.BUY_SECOND_STATION: {
        this.stateStore.buyBarberStation();
        this.finishTutorial();
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

    this.eventBus.on(GameEventType.CASH_CHANGED, () => {
      if (this.currentStep === TutorialStep.COLLECT_CASH_DESK) {
        this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.EMPLOYEE_HIRED, () => {
      if (this.currentStep === TutorialStep.HIRE_CANSU || this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU) {
        this.saveTutorialStep(TutorialStep.TRAIN_EMPLOYEE);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.EMPLOYEE_LEVEL_UP, () => {
      if (this.currentStep === TutorialStep.TRAIN_EMPLOYEE) {
        this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.STATE_CHANGED, () => {
      const activeBranch = this.stateStore.getActiveBranch();
      if (this.currentStep === TutorialStep.BUY_SECOND_STATION && (activeBranch.barberStationsCount || 1) >= 2) {
        this.finishTutorial();
      }
    });
  }

  public updateTutorialUI(renderer?: any): void {
    if (this.currentStep === TutorialStep.COMPLETED) {
      this.overlayElement.classList.add('hidden');
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    this.overlayElement.classList.remove('hidden');

    switch (this.currentStep) {
      case TutorialStep.WELCOME_CLICK_CHAIR:
        this.bannerText.textContent = '✨ ADIM 1: LUXE BEAUTY SALONA HOŞ GELDİN! Parlayan altın halkadaki 1. Koltuğa tıklayarak saç yapımını başlat!';
        break;

      case TutorialStep.MINIGAME_GUIDANCE:
        this.bannerText.textContent = '✂️ ADIM 2: Müşterinin istediği Saç Rengini ve Stilini eşleştirip "TAMAMLAMAK" butonuna tıkla!';
        break;

      case TutorialStep.COLLECT_CASH_DESK:
        this.bannerText.textContent = '💵 ADIM 3: Müşteri ödeme yapmak için kasaya geçti. Parlayan halkadaki Kasa Bankosuna tıklayarak parayı al!';
        break;

      case TutorialStep.OPEN_EQUIPMENT_MENU:
        this.bannerText.textContent = '👩‍🎨 ADIM 4: Harika Kazanç! Parlayan halkadaki "Ekip" butonuna tıklayarak personel menüsünü aç!';
        break;

      case TutorialStep.HIRE_CANSU:
        this.bannerText.textContent = '👩‍🎨 ADIM 5: "Cansu A. ₺600 İşe Al" butonuna tıklayarak ilk kuaförünü kadrona kat!';
        break;

      case TutorialStep.TRAIN_EMPLOYEE:
        this.bannerText.textContent = '🎓 ADIM 6: Cansu A. işe başladı! Seviyesini yükseltmek için "Seviye 2\'ye Eğit" butonuna tıkla!';
        break;

      case TutorialStep.BUY_SECOND_STATION:
        this.bannerText.textContent = '✂️ ADIM 7: Salonunu Büyüt! Parlayan halkadaki 2. Kuaför Standına tıklayarak 2. İstasyonu satın al!';
        break;
    }

    this.positionSpotlightForStep(renderer);
  }

  public positionSpotlightForStep(renderer?: any): void {
    if (this.currentStep === TutorialStep.COMPLETED || !this.spotlightRing) {
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    this.spotlightRing.style.display = 'block';

    const canvas = document.querySelector('#canvas-container canvas') as HTMLCanvasElement;
    const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

    if (this.currentStep === TutorialStep.WELCOME_CLICK_CHAIR && renderer) {
      const p = renderer.gridToScreen(5, 3);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.COLLECT_CASH_DESK && renderer) {
      const p = renderer.gridToScreen(12, 6);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU) {
      const btn = document.getElementById('btn-employees');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        this.spotlightRing.style.left = `${rect.left - 6}px`;
        this.spotlightRing.style.top = `${rect.top - 6}px`;
        this.spotlightRing.style.width = `${rect.width + 12}px`;
        this.spotlightRing.style.height = `${rect.height + 12}px`;
      }
    } else if (this.currentStep === TutorialStep.HIRE_CANSU) {
      const btn = document.getElementById('btn-hire-stylist-1');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        this.spotlightRing.style.left = `${rect.left - 6}px`;
        this.spotlightRing.style.top = `${rect.top - 6}px`;
        this.spotlightRing.style.width = `${rect.width + 12}px`;
        this.spotlightRing.style.height = `${rect.height + 12}px`;
      }
    } else if (this.currentStep === TutorialStep.TRAIN_EMPLOYEE) {
      const btn = document.querySelector('[id^="btn-lvl-"]');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        this.spotlightRing.style.left = `${rect.left - 6}px`;
        this.spotlightRing.style.top = `${rect.top - 6}px`;
        this.spotlightRing.style.width = `${rect.width + 12}px`;
        this.spotlightRing.style.height = `${rect.height + 12}px`;
      }
    } else if (this.currentStep === TutorialStep.BUY_SECOND_STATION && renderer) {
      const p = renderer.gridToScreen(8, 2);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    }
  }

  public finishTutorial(): void {
    this.saveTutorialStep(TutorialStep.COMPLETED);
    this.overlayElement.classList.add('hidden');
    if (this.spotlightRing) this.spotlightRing.style.display = 'none';

    this.stateStore.addCash(500);
    this.stateStore.addDiamonds(10);

    this.eventBus.emit(
      GameEventType.NOTIFICATION_TRIGGERED,
      `🎉 TEBRİKLER! Eğitimi Başarıyla Tamamladın! ₺500 Hoşgeldin Bonusu + 10 💎 Elmas Kazandın!`
    );
  }
}
