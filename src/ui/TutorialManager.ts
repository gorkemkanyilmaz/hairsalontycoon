import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { GameEventType, CustomerState } from '../core/Types';
import { CustomerManager } from '../ai/CustomerAI';

export enum TutorialStep {
  WELCOME_CLICK_CHAIR = 0,
  MINIGAME_GUIDANCE = 1,
  COLLECT_CASH_DESK = 2,
  EARN_FOR_SECOND_STATION = 3,
  BUY_SECOND_STATION = 4,
  EARN_FOR_HIRE_CANSU = 5,
  OPEN_EQUIPMENT_MENU_CANSU = 6,
  HIRE_CANSU = 7,
  EARN_FOR_TRAIN_CANSU = 8,
  OPEN_EQUIPMENT_MENU_TRAIN = 9,
  TRAIN_CANSU = 10,
  EARN_FOR_RECEPTIONIST = 11,
  OPEN_EQUIPMENT_MENU_PELIN = 12,
  HIRE_RECEPTIONIST = 13,
  EARN_FOR_SHAMPOO_DEPOT = 14,
  OPEN_PRODUCTS_MENU = 15,
  BUY_SHAMPOO_STOCK = 16,
  EARN_FOR_SOFA = 17,
  BUY_SOFA = 18,
  EARN_FOR_EXPANSION = 19,
  OPEN_UPGRADES_EXPANSION = 20,
  BUY_EXPANSION = 21,
  EARN_FOR_NISANTASI_BRANCH = 22,
  OPEN_FRANCHISE_MENU = 23,
  OPEN_NISANTASI_BRANCH = 24,
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

  private createTutorialDOM(): void {
    let overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tutorial-overlay';
      overlay.className = this.currentStep === TutorialStep.COMPLETED ? 'hidden' : '';
      overlay.innerHTML = `
        <div class="tutorial-banner-box" id="tutorial-banner">
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

    document.getElementById('btn-tutorial-dismiss')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isDismissed = true;
      this.overlayElement.classList.add('hidden');
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
    });

    let spotlight = document.getElementById('tutorial-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.id = 'tutorial-spotlight';
      spotlight.className = 'tutorial-spotlight-ring';
      spotlight.style.cssText = 'position: fixed; display: none; z-index: 400; pointer-events: auto !important; cursor: pointer;';
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
          seatedCust.posX = 5;
          seatedCust.posY = 3;
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
          this.saveTutorialStep(TutorialStep.EARN_FOR_SECOND_STATION);
          this.updateTutorialUI();
        }
        break;
      }

      case TutorialStep.BUY_SECOND_STATION: {
        this.stateStore.buyBarberStation();
        this.saveTutorialStep(TutorialStep.EARN_FOR_HIRE_CANSU);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.OPEN_EQUIPMENT_MENU_CANSU:
      case TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN:
      case TutorialStep.OPEN_EQUIPMENT_MENU_PELIN: {
        document.getElementById('btn-employees')?.click();
        if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU) {
          this.saveTutorialStep(TutorialStep.HIRE_CANSU);
        } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN) {
          this.saveTutorialStep(TutorialStep.TRAIN_CANSU);
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

      case TutorialStep.TRAIN_CANSU: {
        const btnLvl = document.querySelector('[id^="btn-lvl-"]') as HTMLElement;
        if (btnLvl) btnLvl.click();
        break;
      }

      case TutorialStep.HIRE_RECEPTIONIST: {
        const btnRecep = document.getElementById('btn-hire-receptionist');
        if (btnRecep) btnRecep.click();
        break;
      }

      case TutorialStep.OPEN_PRODUCTS_MENU: {
        document.getElementById('btn-products')?.click();
        this.saveTutorialStep(TutorialStep.BUY_SHAMPOO_STOCK);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.BUY_SHAMPOO_STOCK: {
        const btn50 = document.getElementById('btn-restock-50');
        if (btn50) btn50.click();
        break;
      }

      case TutorialStep.BUY_SOFA: {
        this.stateStore.buyWaitingSofa();
        this.saveTutorialStep(TutorialStep.EARN_FOR_EXPANSION);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.OPEN_UPGRADES_EXPANSION: {
        document.getElementById('btn-upgrades')?.click();
        this.saveTutorialStep(TutorialStep.BUY_EXPANSION);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.BUY_EXPANSION: {
        this.stateStore.purchaseUpgrade('salon_expansion');
        this.saveTutorialStep(TutorialStep.EARN_FOR_NISANTASI_BRANCH);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.OPEN_FRANCHISE_MENU: {
        document.getElementById('btn-marketing')?.click();
        this.saveTutorialStep(TutorialStep.OPEN_NISANTASI_BRANCH);
        this.updateTutorialUI();
        break;
      }

      case TutorialStep.OPEN_NISANTASI_BRANCH: {
        const btnFranchise = document.getElementById('btn-open-franchise');
        if (btnFranchise) btnFranchise.click();
        else this.stateStore.openNewFranchiseBranch();
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

    this.eventBus.on(GameEventType.CASH_CHANGED, (cash: number) => {
      this.checkCashPrerequisites(cash);
    });

    this.eventBus.on(GameEventType.EMPLOYEE_HIRED, (emp: any) => {
      if (this.currentStep === TutorialStep.HIRE_CANSU && emp.role === 'JUNIOR_STYLIST') {
        this.saveTutorialStep(TutorialStep.EARN_FOR_TRAIN_CANSU);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.HIRE_RECEPTIONIST && emp.role === 'RECEPTIONIST') {
        this.saveTutorialStep(TutorialStep.EARN_FOR_SHAMPOO_DEPOT);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.EMPLOYEE_LEVEL_UP, () => {
      if (this.currentStep === TutorialStep.TRAIN_CANSU) {
        this.saveTutorialStep(TutorialStep.EARN_FOR_RECEPTIONIST);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.STOCK_CHANGED, (stock: number) => {
      if (this.currentStep === TutorialStep.BUY_SHAMPOO_STOCK && stock >= 50) {
        this.saveTutorialStep(TutorialStep.EARN_FOR_SOFA);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.UPGRADE_PURCHASED, (upg: any) => {
      if (this.currentStep === TutorialStep.BUY_EXPANSION && upg.id === 'salon_expansion') {
        this.saveTutorialStep(TutorialStep.EARN_FOR_NISANTASI_BRANCH);
        this.updateTutorialUI();
      }
    });

    this.eventBus.on(GameEventType.FRANCHISE_OPENED, () => {
      if (this.currentStep === TutorialStep.OPEN_NISANTASI_BRANCH || this.currentStep === TutorialStep.OPEN_FRANCHISE_MENU) {
        this.finishTutorial();
      }
    });

    this.eventBus.on(GameEventType.STATE_CHANGED, () => {
      const activeBranch = this.stateStore.getActiveBranch();
      const cash = this.stateStore.getState().cash;

      this.checkCashPrerequisites(cash);

      if (this.currentStep === TutorialStep.BUY_SECOND_STATION && (activeBranch.barberStationsCount || 1) >= 2) {
        this.saveTutorialStep(TutorialStep.EARN_FOR_HIRE_CANSU);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.BUY_SOFA && (activeBranch.waitingSofasCount || 1) >= 2) {
        this.saveTutorialStep(TutorialStep.EARN_FOR_EXPANSION);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.OPEN_NISANTASI_BRANCH && this.stateStore.getState().branches.length >= 2) {
        this.finishTutorial();
      }
    });

    // Also bind HUD menu click events directly to advance steps!
    document.getElementById('btn-employees')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU) {
        this.saveTutorialStep(TutorialStep.HIRE_CANSU);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN) {
        this.saveTutorialStep(TutorialStep.TRAIN_CANSU);
        this.updateTutorialUI();
      } else if (this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_PELIN) {
        this.saveTutorialStep(TutorialStep.HIRE_RECEPTIONIST);
        this.updateTutorialUI();
      }
    });

    document.getElementById('btn-products')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_PRODUCTS_MENU) {
        this.saveTutorialStep(TutorialStep.BUY_SHAMPOO_STOCK);
        this.updateTutorialUI();
      }
    });

    document.getElementById('btn-upgrades')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_UPGRADES_EXPANSION) {
        this.saveTutorialStep(TutorialStep.BUY_EXPANSION);
        this.updateTutorialUI();
      }
    });

    document.getElementById('btn-marketing')?.addEventListener('click', () => {
      if (this.currentStep === TutorialStep.OPEN_FRANCHISE_MENU) {
        this.saveTutorialStep(TutorialStep.OPEN_NISANTASI_BRANCH);
        this.updateTutorialUI();
      }
    });
  }

  private checkCashPrerequisites(cash: number): void {
    if (this.currentStep === TutorialStep.COLLECT_CASH_DESK && cash > 0) {
      if (cash >= 2000) {
        this.isDismissed = false;
        this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
      } else {
        this.saveTutorialStep(TutorialStep.EARN_FOR_SECOND_STATION);
      }
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SECOND_STATION && cash >= 2000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.BUY_SECOND_STATION);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_HIRE_CANSU && cash >= 2000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_CANSU);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_TRAIN_CANSU && cash >= 250) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_RECEPTIONIST && cash >= 2500) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_EQUIPMENT_MENU_PELIN);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SHAMPOO_DEPOT && cash >= 150) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_PRODUCTS_MENU);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_SOFA && cash >= 800) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.BUY_SOFA);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_EXPANSION && cash >= 8000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_UPGRADES_EXPANSION);
      this.updateTutorialUI();
    } else if (this.currentStep === TutorialStep.EARN_FOR_NISANTASI_BRANCH && cash >= 10000) {
      this.isDismissed = false;
      this.saveTutorialStep(TutorialStep.OPEN_FRANCHISE_MENU);
      this.updateTutorialUI();
    }
  }

  public updateTutorialUI(renderer?: any): void {
    if (this.currentStep === TutorialStep.COMPLETED || this.isDismissed) {
      this.overlayElement.classList.add('hidden');
      if (this.spotlightRing) this.spotlightRing.style.display = 'none';
      return;
    }

    this.overlayElement.classList.remove('hidden');

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

      case TutorialStep.EARN_FOR_SECOND_STATION:
        const c3 = Math.min(currentCash, 2000);
        questText = `🎯 2. Kuaför Standı İçin ₺2,000 Biriktir (₺${c3} / ₺2,000)`;
        isReady = currentCash >= 2000;
        break;

      case TutorialStep.BUY_SECOND_STATION:
        questText = '✂️ ₺2,000 Birikti! Haritadaki Kilitli 2. Standı Satın Al (₺2,000)';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_HIRE_CANSU:
        const c5 = Math.min(currentCash, 2000);
        questText = `🎯 Cansu A. (1. Kuaför) İçin ₺2,000 Biriktir (₺${c5} / ₺2,000)`;
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

      case TutorialStep.EARN_FOR_TRAIN_CANSU:
        const c8 = Math.min(currentCash, 250);
        questText = `🎯 Cansu A. Seviye 2 Eğitimi İçin ₺250 Biriktir (₺${c8} / ₺250)`;
        isReady = currentCash >= 250;
        break;

      case TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN:
        questText = '🎓 ₺250 Birikti! "Ekip" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.TRAIN_CANSU:
        questText = '🎓 "Seviye 2\'ye Eğit (₺250)" Butonuna Tıklayarak Cansu\'yu Eğit!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_RECEPTIONIST:
        const c11 = Math.min(currentCash, 2500);
        questText = `🎯 Pelin K. (Kasiyer) İçin ₺2,500 Biriktir (₺${c11} / ₺2,500)`;
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

      case TutorialStep.EARN_FOR_SHAMPOO_DEPOT:
        const c14 = Math.min(currentCash, 150);
        questText = `📦 Depo Şampuan Stok Siparişi İçin ₺150 Biriktir (₺${c14} / ₺150)`;
        isReady = currentCash >= 150;
        break;

      case TutorialStep.OPEN_PRODUCTS_MENU:
        questText = '📦 ₺150 Birikti! "Stok" Butonuna Tıklayarak Depo Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.BUY_SHAMPOO_STOCK:
        questText = '📦 "+50 Stok Sipariş Et (₺150)" Butonuna Tıklayarak Depoyu Doldur!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_SOFA:
        const c17 = Math.min(currentCash, 800);
        questText = `🛋️ 2. Bekleme Koltuğu İçin ₺800 Biriktir (₺${c17} / ₺800)`;
        isReady = currentCash >= 800;
        break;

      case TutorialStep.BUY_SOFA:
        questText = '🛋️ ₺800 Birikti! Haritadaki Kilitli Bekleme Koltuğunu Satın Al (₺800)';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_EXPANSION:
        const c19 = Math.min(currentCash, 8000);
        questText = `📐 Salon Alanı Büyütme İçin ₺8,000 Biriktir (₺${c19} / ₺8,000)`;
        isReady = currentCash >= 8000;
        break;

      case TutorialStep.OPEN_UPGRADES_EXPANSION:
        questText = '📐 ₺8,000 Birikti! "Geliştir" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.BUY_EXPANSION:
        questText = '📐 "Salon Alanı Büyütme (₺8,000)" Alarak 3. Kuaför Standını Aç!';
        isReady = true;
        break;

      case TutorialStep.EARN_FOR_NISANTASI_BRANCH:
        const c22 = Math.min(currentCash, 10000);
        questText = `🏰 2. Nişantaşı Şubesi İçin ₺10,000 Biriktir (₺${c22} / ₺10,000)`;
        isReady = currentCash >= 10000;
        break;

      case TutorialStep.OPEN_FRANCHISE_MENU:
        questText = '🏰 ₺10,000 Birikti! "Şubeler" Butonuna Tıklayarak Menüyü Aç!';
        isReady = true;
        break;

      case TutorialStep.OPEN_NISANTASI_BRANCH:
        questText = '🏰 Nişantaşı 2. Lüks Şubeyi Kur (₺10,000)';
        isReady = true;
        break;

      default:
        questText = '🎉 Tebrikler! Tüm Salon Görevlerini Tamamladınız!';
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
      this.currentStep === TutorialStep.EARN_FOR_SECOND_STATION ||
      this.currentStep === TutorialStep.EARN_FOR_HIRE_CANSU ||
      this.currentStep === TutorialStep.EARN_FOR_TRAIN_CANSU ||
      this.currentStep === TutorialStep.EARN_FOR_RECEPTIONIST ||
      this.currentStep === TutorialStep.EARN_FOR_SHAMPOO_DEPOT ||
      this.currentStep === TutorialStep.EARN_FOR_SOFA ||
      this.currentStep === TutorialStep.EARN_FOR_EXPANSION ||
      this.currentStep === TutorialStep.EARN_FOR_NISANTASI_BRANCH;

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
    } else if (this.currentStep === TutorialStep.BUY_SOFA && renderer) {
      this.spotlightRing.style.display = 'block';
      const p = renderer.gridToScreen(8 + branchOffset, 14);
      const screenX = canvasRect.left + p.x;
      const screenY = canvasRect.top + p.y;
      this.spotlightRing.style.left = `${screenX - 45}px`;
      this.spotlightRing.style.top = `${screenY - 65}px`;
      this.spotlightRing.style.width = `90px`;
      this.spotlightRing.style.height = `90px`;
    } else if (
      this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_CANSU ||
      this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_TRAIN ||
      this.currentStep === TutorialStep.OPEN_EQUIPMENT_MENU_PELIN
    ) {
      this.highlightElementById('btn-employees');
    } else if (this.currentStep === TutorialStep.HIRE_CANSU) {
      this.highlightElementById('btn-hire-stylist-1');
    } else if (this.currentStep === TutorialStep.TRAIN_CANSU) {
      this.highlightElementByQuery('[id^="btn-lvl-"]');
    } else if (this.currentStep === TutorialStep.HIRE_RECEPTIONIST) {
      this.highlightElementById('btn-hire-receptionist');
    } else if (this.currentStep === TutorialStep.OPEN_PRODUCTS_MENU) {
      this.highlightElementById('btn-products');
    } else if (this.currentStep === TutorialStep.BUY_SHAMPOO_STOCK) {
      this.highlightElementById('btn-restock-50');
    } else if (this.currentStep === TutorialStep.OPEN_UPGRADES_EXPANSION) {
      this.highlightElementById('btn-upgrades');
    } else if (this.currentStep === TutorialStep.BUY_EXPANSION) {
      this.highlightElementByQuery('[data-id="salon_expansion"]');
    } else if (this.currentStep === TutorialStep.OPEN_FRANCHISE_MENU) {
      this.highlightElementById('btn-marketing');
    } else if (this.currentStep === TutorialStep.OPEN_NISANTASI_BRANCH) {
      this.highlightElementById('btn-open-franchise');
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
      `🎉 TEBRİKLER! Tüm Eğitimi Başarıyla Tamamladın! 🏰 2. Nişantaşı Lüks Şubesi Açıldı! +₺500 Bonus & 25 💎 Elmas Kazandın!`
    );
  }
}
