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
        <div class="tutorial-spotlight-ring" id="tutorial-spotlight" style="display: none;"></div>
        <div class="tutorial-banner-box" id="tutorial-banner">
          <div style="font-size: 28px; margin-bottom: 4px;">✨</div>
          <h4 id="tutorial-title" style="margin: 0 0 6px 0; color: #fbbf24; font-size: 16px; font-weight: 800;">EĞİTİCİ REHBER</h4>
          <p id="tutorial-text" style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.4;"></p>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    this.overlayElement = overlay;
    this.bannerText = document.getElementById('tutorial-text')!;
    this.spotlightRing = document.getElementById('tutorial-spotlight')!;

    this.updateTutorialUI();
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

  public updateTutorialUI(): void {
    if (this.currentStep === TutorialStep.COMPLETED) {
      this.overlayElement.classList.add('hidden');
      return;
    }

    this.overlayElement.classList.remove('hidden');

    switch (this.currentStep) {
      case TutorialStep.WELCOME_CLICK_CHAIR:
        this.bannerText.textContent = '✨ LUXE BEAUTY SALONA HOŞ GELDİN! Müşterin 1. Koltuğa oturdu. Koltuktaki müşteriye tıklayarak saç tasarımı minigamesini başlat!';
        break;

      case TutorialStep.MINIGAME_GUIDANCE:
        this.bannerText.textContent = '✂️ Müşteri Saç İstekleri! Müşterinin istediği Saç Rengini, Kesimini ve Modelini eşleştirip "TAMAMLAMAK" butonuna tıkla!';
        break;

      case TutorialStep.COLLECT_CASH_DESK:
        this.bannerText.textContent = '💵 Harika bir saç oldu! Müşteri ödeme yapmak için kasaya geçti. Kasa bankosuna tıklayarak ödemeyi al!';
        break;

      case TutorialStep.OPEN_EQUIPMENT_MENU:
        this.bannerText.textContent = '👩‍🎨 Harika Kazanç! Şimdi işleri otomatikleştirelim. Ekip menüsünü aç ve Cansu A.\'yı 1. Kuaför olarak işe al!';
        break;

      case TutorialStep.HIRE_CANSU:
        this.bannerText.textContent = '👩‍🎨 "Cansu A. ₺600 İşe Al" butonuna tıklayarak ilk kuaförünü kadrona ekle!';
        break;

      case TutorialStep.TRAIN_EMPLOYEE:
        this.bannerText.textContent = '🎓 Cansu A. işe başladı! Seviyesini yükseltip hızlandırmak için "Seviye 2\'ye Eğit" butonuna tıkla!';
        break;

      case TutorialStep.BUY_SECOND_STATION:
        this.bannerText.textContent = '✂️ Salonunu Büyüt! Haritadaki kilitli 2. Kuaför Standına tıklayarak 2. İstasyonu satın al!';
        break;
    }
  }

  public finishTutorial(): void {
    this.saveTutorialStep(TutorialStep.COMPLETED);
    this.overlayElement.classList.add('hidden');

    this.stateStore.addCash(500);
    this.stateStore.addDiamonds(10);

    this.eventBus.emit(
      GameEventType.NOTIFICATION_TRIGGERED,
      `🎉 TEBRİKLER! Eğitimi Başarıyla Tamamladın! ₺500 Hoşgeldin Bonusu + 10 💎 Elmas Kazandın!`
    );
  }
}
