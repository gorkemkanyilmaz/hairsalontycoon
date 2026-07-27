import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { GameEventType, IUpgradeNode, IGoogleReview } from '../core/Types';

export class UIManager {
  private stateStore: StateStore;
  private eventBus: EventBus;

  private modalOverlay!: HTMLElement;
  private modalTitle!: HTMLElement;
  private modalBody!: HTMLElement;
  private modalCloseBtn!: HTMLElement;

  constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();

    this.bindDOM();
    this.setupListeners();
    this.renderBranchSwitcher();
  }

  private bindDOM(): void {
    this.modalOverlay = document.getElementById('modal-overlay')!;
    this.modalTitle = document.getElementById('modal-title')!;
    this.modalBody = document.getElementById('modal-body')!;
    this.modalCloseBtn = document.getElementById('modal-close-btn')!;
  }

  private setupListeners(): void {
    this.modalCloseBtn?.addEventListener('click', () => this.closeModal());
    this.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    document.getElementById('btn-upgrades')?.addEventListener('click', () => {
      this.openUpgradesModal();
    });

    document.getElementById('btn-employees')?.addEventListener('click', () => {
      this.openEmployeesModal();
    });

    document.getElementById('btn-products')?.addEventListener('click', () => {
      this.openProductsModal();
    });

    document.getElementById('btn-marketing')?.addEventListener('click', () => {
      this.openFranchiseModal();
    });

    document.getElementById('btn-reset-game')?.addEventListener('click', () => {
      if (confirm('⚠️ Oyundaki tüm kayıtlı paranız, şubeleriniz ve ilerlemeniz SIFIRLANACAKTIR!\nEmin misiniz?')) {
        this.stateStore.resetAllProgress();
        window.location.reload();
      }
    });

    document.getElementById('rep-pill')?.addEventListener('click', () => {
      this.openGoogleReviewsModal();
    });

    this.eventBus.on(GameEventType.STATE_CHANGED, () => {
      this.renderBranchSwitcher();
      if (!this.modalOverlay.classList.contains('hidden')) {
        if (this.modalTitle.textContent?.includes('Geliştirmeler')) {
          this.renderUpgradesList();
        } else if (this.modalTitle.textContent?.includes('Çalışan')) {
          this.renderEmployeesList();
        }
      }
    });

    this.eventBus.on(GameEventType.BRANCH_SWITCHED, () => {
      this.renderBranchSwitcher();
    });

    this.initTrainingHudBar();
  }

  public renderBranchSwitcher(): void {
    const state = this.stateStore.getState();
    const branches = state.branches || [];
    if (branches.length <= 1) return;

    let branchNav = document.getElementById('branch-switcher-nav');
    if (!branchNav) {
      branchNav = document.createElement('div');
      branchNav.id = 'branch-switcher-nav';
      branchNav.style.cssText = `
        position: absolute;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        z-index: 100;
        pointer-events: auto !important;
      `;
      document.body.appendChild(branchNav);
    }

    let html = '';
    branches.forEach((b, idx) => {
      const isActive = idx === state.activeBranchIndex;
      const shortName = idx === 0 ? 'Kadıköy #1' : `Nişantaşı #${idx + 1}`;
      html += `
        <button class="top-nav-btn ${isActive ? 'active-branch' : ''}" data-branch="${idx}" style="background: ${isActive ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(30, 20, 48, 0.85)'}; color: ${isActive ? 'black' : 'white'}; font-weight: 800; border: 1px solid #fbbf24; border-radius: 99px; padding: 2px 8px; font-size: 10px; height: 24px; cursor: pointer; white-space: nowrap;">
          🏰 ${shortName} ${isActive ? '🟢' : ''}
        </button>
      `;
    });

    branchNav.innerHTML = html;

    branchNav.querySelectorAll('button[data-branch]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const bIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-branch') || '0', 10);
        this.stateStore.switchActiveBranch(bIdx);
      });
    });
  }

  public openModal(title: string, htmlContent: string): void {
    this.modalTitle.textContent = title;
    this.modalBody.innerHTML = htmlContent;
    this.modalOverlay.classList.remove('hidden');
  }

  public closeModal(): void {
    if (this.employeesTimer) {
      clearInterval(this.employeesTimer);
      this.employeesTimer = null;
    }
    if (this.franchiseTimer) {
      clearInterval(this.franchiseTimer);
      this.franchiseTimer = null;
    }
    this.modalOverlay.classList.add('hidden');
  }

  public openEmployeeTrainingModal(emp: IEmployeeData): void {
    const renderModalContent = () => {
      const state = this.stateStore.getState();
      const isTraining = emp.trainingEndsTimestamp && emp.trainingEndsTimestamp > Date.now();
      if (!isTraining) {
        this.closeModal();
        return;
      }

      const remainingSec = Math.max(1, Math.ceil((emp.trainingEndsTimestamp! - Date.now()) / 1000));
      const diamondsCost = 10;
      const canAffordSpeedup = state.diamonds >= diamondsCost;

      const html = `
        <div style="padding: 18px; color: white; display: flex; flex-direction: column; gap: 16px; text-align: center; font-family: 'Outfit', sans-serif;">
          <div style="font-size: 56px;">🎓</div>
          <h3 style="margin: 0; color: #fbbf24; font-size: 18px; font-weight: 900;">${emp.name} EĞİTİMDE!</h3>
          <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.4;">
            Bu istasyonda çalışan personel <b>Seviye ${emp.level} -> Seviye ${emp.level + 1}</b> eğitimindedir.
            Eğitim tamamlanana kadar bu koltukta hizmet verilemez.
          </p>

          <div style="background: rgba(245, 158, 11, 0.15); border: 2px solid #fbbf24; border-radius: 16px; padding: 14px;">
            <div style="font-size: 12px; color: #fef08a; font-weight: 700; margin-bottom: 4px;">KALAN EĞİTİM SÜRESİ</div>
            <div style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">⏳ ${remainingSec} SANİYE</div>
          </div>

          <button class="btn-upgrade ${canAffordSpeedup ? '' : 'disabled'}" id="btn-speedup-training-modal" style="padding: 14px 20px; font-size: 14px;">
            ${canAffordSpeedup ? `⚡ ${diamondsCost} 💎 ELMAS İLE ANINDA BİTİR` : `Yetersiz Elmas (⚡ ${diamondsCost} 💎)`}
          </button>
        </div>
      `;

      this.modalTitle.textContent = `🎓 ${emp.name} — Eğitim Detayı`;
      this.modalBody.innerHTML = html;
      this.modalOverlay.classList.remove('hidden');

      document.getElementById('btn-speedup-training-modal')?.addEventListener('click', () => {
        if (canAffordSpeedup) {
          if (this.stateStore.deductDiamonds(diamondsCost)) {
            emp.trainingEndsTimestamp = undefined;
            emp.level += 1;
            emp.speedMultiplier = 1.0 + (emp.level - 1) * 0.25;
            this.stateStore.saveState();
            EventBus.getInstance().emit(GameEventType.NOTIFICATION_TRIGGERED, `⚡ ${emp.name} Eğitimi Elmas ile Anında Tamamlandı! (Seviye ${emp.level})`);
            EventBus.getInstance().emit(GameEventType.EMPLOYEE_LEVEL_UP, emp);
            this.closeModal();
          }
        }
      });
    };

    renderModalContent();

    if (this.employeesTimer) clearInterval(this.employeesTimer);
    this.employeesTimer = setInterval(() => {
      if (!this.modalOverlay.classList.contains('hidden')) {
        renderModalContent();
      } else {
        clearInterval(this.employeesTimer);
        this.employeesTimer = null;
      }
    }, 1000);
  }

  public openBuyFurnitureModal(kind: 'sofa' | 'station', slotIndex: number): void {
    const state = this.stateStore.getState();
    const branch = this.stateStore.getActiveBranch();
    const isSofa = kind === 'sofa';
    const cost = isSofa ? 800 : 2000;
    const diamondCost = Math.max(1, Math.ceil(cost / 100));
    const title = isSofa ? '🛋️ Bekleme Koltuğu Satın Al' : '✂️ 2. Kuaför İstasyonu Satın Al';
    const desc = isSofa
      ? `Salona ${slotIndex + 1}. Bekleme Koltuğunu ekleyin! Daha fazla müşteri sırada bekleyebilir.`
      : `Salona 2. Kuaför Aynasını ve Koltuğunu ekleyin! İkinci bir kuaför çalıştırmanıza olanak tanır.`;

    const canAffordCash = state.cash >= cost;
    const canAffordDiamond = state.diamonds >= diamondCost;

    this.openModal(title, `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px; text-align: center; font-family: 'Outfit', sans-serif;">
        <div style="font-size: 54px;">${isSofa ? '🛋️' : '✂️'}</div>
        <h3 style="margin: 0; color: #fbbf24;">${title}</h3>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">${desc}</p>
        <div style="background: rgba(255,255,255,0.06); border: 1px solid #fbbf24; border-radius: 14px; padding: 12px; font-weight: 800; color: #06d6a0; display: flex; justify-content: space-around; align-items: center;">
          <span>Fiyat: ₺${cost}</span>
          <span style="color: #cbd5e1; font-size: 12px;">VEYA</span>
          <span style="color: #38bdf8;">⚡ ${diamondCost} 💎 Elmas</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" id="btn-confirm-buy-furniture-cash" style="flex: 1;">
            ₺${cost} İLE AL
          </button>
          <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" id="btn-confirm-buy-furniture-diamond" style="flex: 1; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
            ⚡ ${diamondCost} 💎 İLE AL
          </button>
        </div>
      </div>
    `);

    document.getElementById('btn-confirm-buy-furniture-cash')?.addEventListener('click', () => {
      if (isSofa ? this.stateStore.buyWaitingSofa() : this.stateStore.buyBarberStation()) {
        this.closeModal();
      }
    });

    document.getElementById('btn-confirm-buy-furniture-diamond')?.addEventListener('click', () => {
      if (isSofa ? this.stateStore.buyWaitingSofaWithDiamonds() : this.stateStore.buyBarberStationWithDiamonds()) {
        this.closeModal();
      }
    });
  }

  public openGoogleReviewsModal(): void {
    const state = this.stateStore.getState();
    const reviews = state.reviews || [];

    let html = `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px;">
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(247, 37, 133, 0.2)); border: 2px solid #fbbf24; border-radius: 18px; padding: 18px; text-align: center;">
          <p style="font-size: 36px; margin-bottom: 2px;">⭐</p>
          <h2 style="margin: 0; color: #fbbf24; font-size: 28px; font-weight: 900;">${state.reputation.toFixed(1)} / 5.0</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Google Haritalar Canlı Müşteri Yorumları (${reviews.length} Değerlendirme)</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto;">
    `;

    reviews.forEach((r: IGoogleReview) => {
      const stars = '⭐'.repeat(r.rating);
      const isBad = r.rating <= 2;

      html += `
        <div style="background: ${isBad ? 'rgba(239, 71, 111, 0.15)' : 'rgba(255, 255, 255, 0.06)'}; border: 1px solid ${isBad ? '#ef476f' : '#f472b6'}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: ${isBad ? '#ef476f' : '#38bdf8'}; font-size: 14px;">${r.customerName}</strong>
            <span style="font-size: 12px;">${stars}</span>
          </div>
          <p style="margin: 0; font-size: 13px; color: #e2e8f0; font-style: italic;">"${r.comment}"</p>
        </div>
      `;
    });

    html += `</div></div>`;
    this.openModal('⭐ Google Canlı Müşteri Değerlendirmeleri', html);
  }

  public openUpgradesModal(): void {
    const activeBranch = this.stateStore.getActiveBranch();
    this.modalTitle.textContent = `⚡ Salon Geliştirmeleri — ${activeBranch.salonName}`;
    this.renderUpgradesList();
    this.modalOverlay.classList.remove('hidden');
  }

  public openEmployeesModal(): void {
    const activeBranch = this.stateStore.getActiveBranch();
    this.modalTitle.textContent = `👩‍🎨 Çalışan Kadrosu — ${activeBranch.salonName}`;
    this.renderEmployeesList();
    this.modalOverlay.classList.remove('hidden');

    if (this.employeesTimer) clearInterval(this.employeesTimer);
    this.employeesTimer = setInterval(() => {
      if (!this.modalOverlay.classList.contains('hidden')) {
        this.renderEmployeesList();
      }
    }, 1000);
  }

  public openProductsModal(): void {
    const state = this.stateStore.getState();
    const canAffordCash50 = state.cash >= 150;
    const canAffordDiamond50 = state.diamonds >= 2;

    const canAffordCash100 = state.cash >= 250;
    const canAffordDiamond100 = state.diamonds >= 3;

    this.openModal('📦 Stok Deposu & Lojistik Kurye', `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px; font-family: 'Outfit', sans-serif;">
        <div style="background: rgba(247, 37, 133, 0.15); border: 2px solid #f72585; border-radius: 18px; padding: 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 42px;">📦</span>
            <div>
              <h4 style="margin: 0; color: #f472b6; font-size: 18px;">Depo Stok Durumu</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Mevcut Şampuan & Bakım Maskesi Stok Parçası</p>
            </div>
          </div>
          <span style="font-size: 24px; font-weight: 900; color: #06d6a0; background: rgba(6, 214, 160, 0.15); padding: 8px 16px; border-radius: 99px; border: 1px solid #06d6a0;">
            ${state.retailProductsStock} / ${state.maxRetailStock}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <h4 style="margin: 0; color: #fbbf24; font-size: 14px;">🚚 HIZLI KURYE SİPARİŞİ VER:</h4>
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-upgrade ${canAffordCash50 ? '' : 'disabled'}" id="btn-restock-50" style="flex: 1;">
              📦 +50 Stok (₺150)
            </button>
            <button class="btn-upgrade ${canAffordDiamond50 ? '' : 'disabled'}" id="btn-restock-50-diamond" style="flex: 1; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
              ⚡ +50 Stok (2 💎)
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-upgrade ${canAffordCash100 ? '' : 'disabled'}" id="btn-restock-100" style="flex: 1;">
              📦 +100 Süper Stok (₺250)
            </button>
            <button class="btn-upgrade ${canAffordDiamond100 ? '' : 'disabled'}" id="btn-restock-100-diamond" style="flex: 1; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
              ⚡ +100 Süper Stok (3 💎)
            </button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('btn-restock-50')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestock(50, 150)) {
        this.openProductsModal();
      }
    });

    document.getElementById('btn-restock-50-diamond')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestockWithDiamonds(50, 2)) {
        this.openProductsModal();
      }
    });

    document.getElementById('btn-restock-100')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestock(100, 250)) {
        this.openProductsModal();
      }
    });

    document.getElementById('btn-restock-100-diamond')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestockWithDiamonds(100, 3)) {
        this.openProductsModal();
      }
    });
  }

  private initTrainingHudBar(): void {
    let bar = document.getElementById('training-hud-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'training-hud-bar';
      document.body.appendChild(bar);
    }
    setInterval(() => this.updateTrainingHudBar(), 1000);
  }

  private updateTrainingHudBar(): void {
    const bar = document.getElementById('training-hud-bar');
    if (!bar) return;

    const state = this.stateStore.getState();
    const employees = state.employees || [];
    const inTraining = employees.filter(
      (e) => e.trainingEndsTimestamp && e.trainingEndsTimestamp > Date.now()
    );

    if (inTraining.length === 0) {
      bar.innerHTML = '';
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    let html = '';

    const BRANCH_NAMES = [
      'Nişantaşı Lüks Salon',
      'Kadıköy Moda Salon',
      'Beşiktaş Çarşı Salon',
      'Bebek Sahil Salon',
      'Etiler VIP Salon',
      'Göktürk Prestige Salon',
      'Bağdat Caddesi Salon',
      'Kanyon Deluxe Salon'
    ];

    inTraining.forEach((emp) => {
      const remainingSec = Math.max(1, Math.ceil((emp.trainingEndsTimestamp! - Date.now()) / 1000));
      const bIdx = emp.branchIndex || 0;
      const bName = BRANCH_NAMES[bIdx] || `Şube #${bIdx + 1}`;
      const canAfford = state.diamonds >= 10;

      html += `
        <div class="training-hud-card">
          <span style="font-size: 20px;">🎓</span>
          <div style="flex: 1; text-align: left;">
            <div style="font-weight: 900; color: #fbbf24; font-size: 12px; letter-spacing: 0.3px;">${emp.name} (${bName})</div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 1px;">
              🎓 Seviye ${emp.level} ➔ Seviye ${emp.level + 1} | <span style="color: #ffffff; font-weight: 800;">⏳ ${remainingSec}s</span>
            </div>
          </div>
          <button class="btn-speedup-hud ${canAfford ? '' : 'disabled'}" data-emp-id="${emp.id}">
            ⚡ 10 💎 Hızlı Bitir
          </button>
        </div>
      `;
    });

    bar.innerHTML = html;

    bar.querySelectorAll('.btn-speedup-hud').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const empId = (e.currentTarget as HTMLElement).getAttribute('data-emp-id');
        const emp = employees.find((x) => x.id === empId);
        if (emp && state.diamonds >= 10) {
          if (this.stateStore.deductDiamonds(10)) {
            emp.trainingEndsTimestamp = undefined;
            emp.level += 1;
            emp.speedMultiplier = 1.0 + (emp.level - 1) * 0.25;
            this.stateStore.saveState();
            EventBus.getInstance().emit(GameEventType.NOTIFICATION_TRIGGERED, `⚡ ${emp.name} Eğitimi Elmas ile Anında Tamamlandı! (Seviye ${emp.level})`);
            EventBus.getInstance().emit(GameEventType.EMPLOYEE_LEVEL_UP, emp);
            this.updateTrainingHudBar();
          }
        }
      });
    });
  }

  public openFranchiseModal(): void {
    const state = this.stateStore.getState();
    const branchCount = state.branches.length;
    const nextBranchIdx = branchCount;

    const BRANCH_NAMES = [
      'Nişantaşı Lüks Salon',
      'Kadıköy Moda Salon',
      'Beşiktaş Çarşı Salon',
      'Bebek Sahil Salon',
      'Etiler VIP Salon',
      'Göktürk Prestige Salon',
      'Bağdat Caddesi Salon',
      'Kanyon Deluxe Salon'
    ];

    const nextBranchName = BRANCH_NAMES[nextBranchIdx] || `Lüks Şube #${nextBranchIdx + 1}`;
    const baseCost = 10000;
    const nextCost = Math.floor(baseCost * Math.pow(2.2, nextBranchIdx - 1));
    const nextDiamondCost = Math.max(1, Math.ceil(nextCost / 100));
    const canAffordFranchiseCash = state.cash >= nextCost;
    const canAffordFranchiseDiamond = state.diamonds >= nextDiamondCost;

    const activeAd = this.stateStore.activeSocialAdPackage;
    const isAdActive = activeAd && Date.now() < activeAd.endsTimestamp;
    const remainingAdSec = isAdActive ? Math.max(1, Math.ceil((activeAd.endsTimestamp - Date.now()) / 1000)) : 0;

    let branchListHtml = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    state.branches.forEach((b, idx) => {
      const isUnderConstruction = b.constructionEndsTimestamp && b.constructionEndsTimestamp > Date.now();
      if (isUnderConstruction) {
        const remainingSec = Math.max(1, Math.ceil((b.constructionEndsTimestamp! - Date.now()) / 1000));
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const canAffordDiamondSpeedup = state.diamonds >= 50;

        branchListHtml += `
          <div style="background: rgba(245, 158, 11, 0.15); border: 2px solid #f59e0b; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
            <div style="color: #fbbf24; font-size: 13px; font-weight: 800;">🚧 ${b.salonName.toUpperCase()} İNŞAAT/KURULUM: ${timeStr}</div>
            <button class="btn-upgrade ${canAffordDiamondSpeedup ? '' : 'disabled'}" data-speedup-branch="${idx}" style="background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
              ⚡ 50 💎 Elmas ile Anında Kur
            </button>
          </div>
        `;
      } else {
        branchListHtml += `
          <div style="background: rgba(6, 214, 160, 0.12); border: 1px solid #06d6a0; border-radius: 12px; padding: 10px; font-size: 12px; color: #06d6a0; font-weight: 800;">
            🟢 ${b.salonName.toUpperCase()} (AKTİF İŞLETİLİYOR)
          </div>
        `;
      }
    });

    branchListHtml += `
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn-upgrade ${canAffordFranchiseCash ? '' : 'disabled'}" id="btn-open-franchise" style="flex: 1; font-size: 11px;">
          🏰 ₺${nextCost.toLocaleString()} İLE AÇ
        </button>
        <button class="btn-upgrade ${canAffordFranchiseDiamond ? '' : 'disabled'}" id="btn-open-franchise-diamond" style="flex: 1; font-size: 11px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
          ⚡ ${nextDiamondCost} 💎 İLE AÇ
        </button>
      </div>
    </div>`;

    this.openModal('📢 Reklam Paketleri & 🏰 Şube İmparatorluğu', `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px; font-family: 'Outfit', sans-serif;">
        <!-- Social Media Marketing Packages -->
        <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2)); border: 2px solid #38bdf8; border-radius: 18px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <span style="font-size: 32px;">📱</span>
            <div>
              <h3 style="margin: 0; color: #38bdf8; font-size: 16px; font-weight: 900;">Sosyal Medya Reklam Paketleri</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #cbd5e1;">Seçilen pakete göre Müşteri Akını ve VIP Oranı yükselir!</p>
            </div>
          </div>

          ${
            isAdActive
              ? `<div style="background: rgba(6, 214, 160, 0.2); border: 1.5px solid #06d6a0; border-radius: 12px; padding: 10px; text-align: center; color: #06d6a0; font-weight: 800;">
                  ⏱️ REKLAM KAMPANYASI AKTİF (${activeAd!.type} PAKET) — KALAN: ${remainingAdSec}s
                 </div>`
              : `<div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; gap: 6px;">
                    <button class="btn-upgrade ${state.cash >= 500 ? '' : 'disabled'}" id="btn-ad-bronze" style="flex: 1; font-size: 11px; padding: 8px; text-align: left;">
                      🌱 Bronz (₺500)
                    </button>
                    <button class="btn-upgrade ${state.diamonds >= 5 ? '' : 'disabled'}" id="btn-ad-bronze-diamond" style="font-size: 11px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                      ⚡ 5 💎
                    </button>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn-upgrade ${state.cash >= 1000 ? '' : 'disabled'}" id="btn-ad-silver" style="flex: 1; font-size: 11px; padding: 8px; text-align: left; background: linear-gradient(135deg, #a855f7, #7e22ce);">
                      ⭐ Gümüş (₺1,000)
                    </button>
                    <button class="btn-upgrade ${state.diamonds >= 10 ? '' : 'disabled'}" id="btn-ad-silver-diamond" style="font-size: 11px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                      ⚡ 10 💎
                    </button>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn-upgrade ${state.cash >= 2000 ? '' : 'disabled'}" id="btn-ad-gold" style="flex: 1; font-size: 11px; padding: 8px; text-align: left; background: linear-gradient(135deg, #fbbf24, #d97706); color: #1e1b4b;">
                      👑 Altın VIP (₺2,000)
                    </button>
                    <button class="btn-upgrade ${state.diamonds >= 20 ? '' : 'disabled'}" id="btn-ad-gold-diamond" style="font-size: 11px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                      ⚡ 20 💎
                    </button>
                  </div>
                 </div>`
          }
        </div>

        <!-- Fashion Week Event -->
        <div style="background: linear-gradient(135deg, rgba(239, 71, 111, 0.25), rgba(157, 78, 221, 0.25)); border: 2px solid #ef476f; border-radius: 18px; padding: 16px; text-align: center;">
          <p style="font-size: 32px; margin-bottom: 2px;">💃</p>
          <h3 style="margin: 0 0 4px 0; color: #ef476f; font-size: 16px; font-weight: 900;">Fashion Week VIP Defilesi</h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #fbcfe8;">25 saniye boyunca <strong>5x Gelir & +10 Elmas!</strong></p>
          <button class="btn-upgrade ${state.isFashionEventActive ? 'disabled' : ''}" id="btn-start-fashion">
            ${state.isFashionEventActive ? '💃 DEFİLE DEVAM EDİYOR...' : '💃 DEFİLE ETKİNLİĞİNİ BAŞLAT (+10 💎)'}
          </button>
        </div>

        <!-- Infinite Salon Branch Expansion -->
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(247, 37, 133, 0.2)); border: 2px solid #fbbf24; border-radius: 18px; padding: 16px; text-align: center;">
          <p style="font-size: 32px; margin-bottom: 2px;">🏰</p>
          <h3 style="margin: 0 0 4px 0; color: #fbbf24; font-size: 16px; font-weight: 900;">Sonsuz Şube İmparatorluğu (${nextBranchName})</h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #fbcfe8;">Mevcut Şubeler: <strong>${branchCount} Şube</strong> | Prestij: <strong style="color: #06d6a0;">+${Math.round((this.stateStore.getActiveBranch().prestigeMultiplier - 1) * 100)}% Kazanç</strong></p>
          ${branchListHtml}
        </div>
      </div>
    `);

    document.getElementById('btn-ad-bronze')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackage('BRONZE')) this.openFranchiseModal();
    });
    document.getElementById('btn-ad-bronze-diamond')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackageWithDiamonds('BRONZE')) this.openFranchiseModal();
    });

    document.getElementById('btn-ad-silver')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackage('SILVER')) this.openFranchiseModal();
    });
    document.getElementById('btn-ad-silver-diamond')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackageWithDiamonds('SILVER')) this.openFranchiseModal();
    });

    document.getElementById('btn-ad-gold')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackage('GOLD')) this.openFranchiseModal();
    });
    document.getElementById('btn-ad-gold-diamond')?.addEventListener('click', () => {
      if (this.stateStore.startSocialMediaAdPackageWithDiamonds('GOLD')) this.openFranchiseModal();
    });

    document.getElementById('btn-start-fashion')?.addEventListener('click', () => {
      this.stateStore.startFashionGalaEvent();
      this.closeModal();
    });

    document.getElementById('btn-open-franchise')?.addEventListener('click', () => {
      if (this.stateStore.openNewFranchiseBranch()) {
        this.openFranchiseModal();
      }
    });

    document.getElementById('btn-open-franchise-diamond')?.addEventListener('click', () => {
      if (this.stateStore.openNewFranchiseBranchWithDiamonds()) {
        this.openFranchiseModal();
      }
    });

    this.modalBody.querySelectorAll('[data-speedup-branch]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const bIdx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-speedup-branch') || '0', 10);
        if (this.stateStore.speedUpBranchConstructionWithDiamonds(bIdx)) {
          this.openFranchiseModal();
        }
      });
    });
  }

  private renderUpgradesList(): void {
    const state = this.stateStore.getState();
    const activeBranch = this.stateStore.getActiveBranch();
    const upgrades = Object.values(activeBranch.upgrades);

    let html = `<div class="upgrades-grid">`;

    // 2nd Barber Station Upgrade Card
    const stationsCount = activeBranch.barberStationsCount || 1;
    const isStation2Unlocked = stationsCount >= 2;
    const canAffordStation2Cash = state.cash >= 2000;
    const canAffordStation2Diamond = state.diamonds >= 20;

    html += `
      <div class="upgrade-card ${isStation2Unlocked ? 'maxed' : ''}">
        <div class="upgrade-icon">✂️</div>
        <div class="upgrade-info">
          <div class="upgrade-name">✂️ 2. Kuaför İstasyonu Kurulumu <span class="upgrade-level">${isStation2Unlocked ? 'AÇIK (2/2)' : 'KİLİTLİ (1/2)'}</span></div>
          <div class="upgrade-desc">Salona 2. Kuaför Aynasını ve Koltuğunu ekler. Selin K.'yı işe almanıza olanak tanır.</div>
        </div>
        <div class="upgrade-action">
          ${
            isStation2Unlocked
              ? `<button class="btn-upgrade max" disabled>AÇIK</button>`
              : `<div style="display: flex; flex-direction: column; gap: 4px;">
                  <button class="btn-upgrade ${canAffordStation2Cash ? '' : 'disabled'}" id="btn-buy-station-2-upgrade" style="font-size: 11px; padding: 6px 10px;">
                    ₺2,000 Al
                  </button>
                  <button class="btn-upgrade ${canAffordStation2Diamond ? '' : 'disabled'}" id="btn-buy-station-2-upgrade-diamond" style="font-size: 11px; padding: 6px 10px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                    ⚡ 20 💎 Al
                  </button>
                 </div>`
          }
        </div>
      </div>
    `;

    upgrades.forEach((u: IUpgradeNode) => {
      const isMax = u.level >= u.maxLevel;
      const currentCost = Math.floor(u.baseCost * Math.pow(u.costMultiplier, u.level));
      const diamondCost = Math.max(1, Math.ceil(currentCost / 100));

      // Prerequisite check
      let prereqFailed = false;
      if (u.prerequisiteUpgradeId) {
        const prereq = activeBranch.upgrades[u.prerequisiteUpgradeId];
        if (!prereq || prereq.level < 1) {
          prereqFailed = true;
        }
      }

      const canAffordCash = state.cash >= currentCost && !prereqFailed;
      const canAffordDiamond = state.diamonds >= diamondCost && !prereqFailed;

      html += `
        <div class="upgrade-card ${isMax ? 'maxed' : ''} ${prereqFailed ? 'prereq-failed' : ''}">
          <div class="upgrade-icon">${u.icon}</div>
          <div class="upgrade-info">
            <div class="upgrade-name">${u.name} <span class="upgrade-level">Seviye ${u.level}/${u.maxLevel}</span></div>
            <div class="upgrade-desc">${u.description}</div>
            ${prereqFailed ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800; margin-top: 4px;">⚠️ ${u.prerequisiteDescription}</div>` : ''}
          </div>
          <div class="upgrade-action">
            ${
              isMax
                ? `<button class="btn-upgrade max" disabled>MAX</button>`
                : `<div style="display: flex; flex-direction: column; gap: 4px;">
                    <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" data-id="${u.id}" style="font-size: 11px; padding: 6px 10px;">
                      ₺${currentCost.toLocaleString()} Al
                    </button>
                    <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" data-id-diamond="${u.id}" style="font-size: 11px; padding: 6px 10px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                      ⚡ ${diamondCost} 💎 Al
                    </button>
                   </div>`
            }
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.modalBody.innerHTML = html;

    document.getElementById('btn-buy-station-2-upgrade')?.addEventListener('click', () => {
      if (this.stateStore.buyBarberStation()) {
        this.renderUpgradesList();
      }
    });
    document.getElementById('btn-buy-station-2-upgrade-diamond')?.addEventListener('click', () => {
      if (this.stateStore.buyBarberStationWithDiamonds()) {
        this.renderUpgradesList();
      }
    });

    this.modalBody.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && this.stateStore.purchaseUpgrade(id)) {
          this.renderUpgradesList();
        }
      });
    });

    this.modalBody.querySelectorAll('[data-id-diamond]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id-diamond');
        if (id && this.stateStore.purchaseUpgradeWithDiamonds(id)) {
          this.renderUpgradesList();
        }
      });
    });
  }

  private renderEmployeesList(): void {
    const state = this.stateStore.getState();
    const activeBranch = this.stateStore.getActiveBranch();
    const employees = state.employees.filter((e) => e.branchIndex === state.activeBranchIndex);

    let html = `<div style="display: flex; flex-direction: column; gap: 12px; padding: 10px;">`;

    if (employees.length === 0) {
      html += `
        <div style="text-align: center; padding: 24px; color: #cbd5e1;">
          <p style="font-size: 40px; margin-bottom: 8px;">👩‍🎨</p>
          <h4 style="color: white; margin-bottom: 6px;">Bu Şubede Henüz Çalışanınız Yok!</h4>
          <p style="font-size: 13px;">Aşağıdaki işe alım kartlarından personel satın alabilirsiniz.</p>
        </div>
      `;
    } else {
      employees.forEach((emp) => {
        const isTraining = emp.trainingEndsTimestamp && emp.trainingEndsTimestamp > Date.now();
        const remainingSec = isTraining ? Math.max(1, Math.ceil((emp.trainingEndsTimestamp! - Date.now()) / 1000)) : 0;
        const costCash = emp.level * 250;
        const costDiamond = Math.max(1, Math.ceil(costCash / 100));

        let prereqFailed = false;
        let prereqMsg = '';
        if (emp.level >= 5) {
          if (emp.role === 'JUNIOR_STYLIST' && emp.assignedChairIndex === 0) {
            const scissorsLvl = activeBranch.upgrades?.quick_scissors?.level || 0;
            if (scissorsLvl < 3) {
              prereqFailed = true;
              prereqMsg = '⚠️ Ön Koşul: Hızlı Fön & Makas Seviye 3/25 olmalıdır!';
            }
          } else if (emp.role === 'JUNIOR_STYLIST' && emp.assignedChairIndex === 1) {
            const chairLvl = activeBranch.upgrades?.comfy_chair?.level || 0;
            if (chairLvl < 5) {
              prereqFailed = true;
              prereqMsg = '⚠️ Ön Koşul: Ergonomik Kuaför Koltuğu Seviye 5/20 olmalıdır!';
            }
          }
        }

        const canAffordUpgradeCash = state.cash >= costCash && !prereqFailed;
        const canAffordUpgradeDiamond = state.diamonds >= costDiamond && !prereqFailed;

        html += `
          <div style="background: rgba(255,255,255,0.06); border: 1px solid #f472b6; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; font-family: 'Outfit', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">${emp.role === 'RECEPTIONIST' ? '👩‍💼' : '👩‍🎨'}</span>
                <div>
                  <h4 style="margin: 0; color: white;">${emp.name} <span style="color: #fbbf24; font-size: 12px;">(Seviye ${emp.level}/10)</span></h4>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #f472b6;">
                    ${emp.role === 'RECEPTIONIST' ? 'Otomatik Kasiyer' : 'Otomatik Hair Stylist'} — Hız Bonus: +${Math.round((emp.speedMultiplier - 0.65) * 100)}%
                  </p>
                </div>
              </div>
              <span style="background: ${isTraining ? '#f59e0b' : '#06d6a0'}; color: #000; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 99px;">
                ${isTraining ? `🎓 EĞİTİMDE (${remainingSec}s)` : 'ÇALIŞIYOR'}
              </span>
            </div>

            ${prereqFailed ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800;">${prereqMsg}</div>` : ''}

            <div style="display: flex; gap: 8px; margin-top: 4px; width: 100%;">
              ${
                isTraining
                  ? `<button class="btn-upgrade" id="btn-speedup-${emp.id}" style="width: 100%; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
                      ⚡ 10 💎 Elmas ile Hızlı Bitir
                     </button>`
                  : `<button class="btn-upgrade ${canAffordUpgradeCash ? '' : 'disabled'}" id="btn-lvl-${emp.id}" style="flex: 1; font-size: 12px; padding: 8px; white-space: nowrap;">
                      🎓 Seviye ${emp.level + 1} (₺${costCash})
                     </button>
                     <button class="btn-upgrade ${canAffordUpgradeDiamond ? '' : 'disabled'}" id="btn-lvl-diamond-${emp.id}" style="flex: 1; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
                      ⚡ ${costDiamond} 💎 ile Eğit
                     </button>`
              }
            </div>
          </div>
        `;
      });
    }

    // --- HIRE CARDS ---
    const hasStylist1 = employees.some((e) => e.role === 'JUNIOR_STYLIST' && e.assignedChairIndex === 0);
    const hasStylist2 = employees.some((e) => e.role === 'JUNIOR_STYLIST' && e.assignedChairIndex === 1);
    const hasStylist3 = employees.some((e) => e.role === 'JUNIOR_STYLIST' && e.assignedChairIndex === 2);
    const hasReceptionist = employees.some((e) => e.role === 'RECEPTIONIST');
    const stationsCount = Math.max(activeBranch.barberStationsCount || 1, activeBranch.chairsCount || 1);

    // 1) Cansu A. - Junior Stylist for Chair #1 — ₺2,000 (20 💎)
    if (!hasStylist1) {
      const canAffordCash = state.cash >= 2000;
      const canAffordDiamond = state.diamonds >= 20;
      html += `
        <div style="background: linear-gradient(135deg, rgba(6, 214, 160, 0.18), rgba(247, 37, 133, 0.15)); border: 2px solid #06d6a0; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px; font-family: 'Outfit', sans-serif;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #06d6a0; font-size: 15px; font-weight: 800;">👩‍🎨 Cansu A. (1. Kuaför — Koltuk #1)</h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">1. kuaför koltuğundaki (7, 4) müşterilerin saçını otomatik yapar.</p>
          </div>
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
            <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" id="btn-hire-stylist-1" style="flex: 1; font-size: 12px; padding: 8px; white-space: nowrap;">
              ₺2,000 İşe Al
            </button>
            <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" id="btn-hire-stylist-1-diamond" style="flex: 1; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
              ⚡ 20 💎 İşe Al
            </button>
          </div>
        </div>
      `;
    }

    // 2) Pelin K. - Receptionist (auto cashier) — ₺2,500 (25 💎)
    if (!hasReceptionist) {
      const canAffordCash = state.cash >= 2500;
      const canAffordDiamond = state.diamonds >= 25;
      html += `
        <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(247, 37, 133, 0.15)); border: 2px solid #38bdf8; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px; font-family: 'Outfit', sans-serif;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #38bdf8; font-size: 15px; font-weight: 800;">👩‍💼 Pelin K. (Otomatik Kasiyer)</h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">Kasada bekleyen müşterilerin ödemesini otomatik tahsil eder. Sabır krizlerini önler!</p>
          </div>
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
            <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" id="btn-hire-receptionist" style="flex: 1; font-size: 12px; padding: 8px; white-space: nowrap;">
              ₺2,500 İşe Al
            </button>
            <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" id="btn-hire-receptionist-diamond" style="flex: 1; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
              ⚡ 25 💎 İşe Al
            </button>
          </div>
        </div>
      `;
    }

    // 3) Selin K. - 2nd Stylist for Chair #2 — ₺4,500 (45 💎), prerequisite: 2. Kuaför İstasyonu (₺3,500)
    if (!hasStylist2) {
      const stationOk = stationsCount >= 2;
      const canAffordCash = state.cash >= 4500 && stationOk;
      const canAffordDiamond = state.diamonds >= 45 && stationOk;
      const prereqNote = !stationOk ? '⚠️ Ön Koşul: Önce 2. Kuaför İstasyonu haritadan satın alınmalıdır!' : '';

      html += `
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(247, 37, 133, 0.15)); border: 2px solid ${stationOk ? '#fbbf24' : '#ef476f'}; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px; font-family: 'Outfit', sans-serif;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #fbbf24; font-size: 15px; font-weight: 800;">👩‍🎨 Selin K. (2. Kuaför — Koltuk #2)</h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">2. kuaför koltuğundaki (12, 4) müşterilerin saçını otomatik yapar.</p>
          </div>
          ${prereqNote ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800;">${prereqNote}</div>` : ''}
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
            <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" id="btn-hire-stylist-2" style="flex: 1; font-size: 12px; padding: 8px; white-space: nowrap;">
              ₺4,500 İşe Al
            </button>
            <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" id="btn-hire-stylist-2-diamond" style="flex: 1; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
              ⚡ 45 💎 İşe Al
            </button>
          </div>
        </div>
      `;
    }

    // 4) Seda T. - 3rd Stylist for Chair #3 — ₺7,500 (75 💎), prerequisite: Salon Alanı Büyütme (3. İstasyon)
    if (!hasStylist3) {
      const station3Ok = stationsCount >= 3;
      const canAffordCash = state.cash >= 7500 && station3Ok;
      const canAffordDiamond = state.diamonds >= 75 && station3Ok;
      const prereqNote = !station3Ok ? '⚠️ Ön Koşul: Önce Salon Alanı Büyütme (3. Stand) yükseltmesi alınmalıdır!' : '';

      html += `
        <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(247, 37, 133, 0.15)); border: 2px solid ${station3Ok ? '#c084fc' : '#ef476f'}; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px; font-family: 'Outfit', sans-serif;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #c084fc; font-size: 15px; font-weight: 800;">👩‍🎨 Seda T. (3. Kuaför — Koltuk #3)</h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">3. kuaför koltuğundaki (17, 4) VIP ve Gelin Saçı müşterilerini otomatik yapar.</p>
          </div>
          ${prereqNote ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800;">${prereqNote}</div>` : ''}
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
            <button class="btn-upgrade ${canAffordCash ? '' : 'disabled'}" id="btn-hire-stylist-3" style="flex: 1; font-size: 12px; padding: 8px; white-space: nowrap;">
              ₺7,500 İşe Al
            </button>
            <button class="btn-upgrade ${canAffordDiamond ? '' : 'disabled'}" id="btn-hire-stylist-3-diamond" style="flex: 1; font-size: 12px; padding: 8px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; white-space: nowrap;">
              ⚡ 75 💎 İşe Al
            </button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    this.modalBody.innerHTML = html;

    // Bind hire buttons (Cash & Diamonds)
    document.getElementById('btn-hire-stylist-1')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(2000)) {
        this.stateStore.hireEmployee('Cansu A.', 'JUNIOR_STYLIST', 0);
        this.renderEmployeesList();
      }
    });
    document.getElementById('btn-hire-stylist-1-diamond')?.addEventListener('click', () => {
      if (this.stateStore.hireEmployeeWithDiamonds('Cansu A.', 'JUNIOR_STYLIST', 0, 20)) {
        this.renderEmployeesList();
      }
    });

    document.getElementById('btn-hire-receptionist')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(2500)) {
        this.stateStore.hireEmployee('Pelin K.', 'RECEPTIONIST', -1);
        this.renderEmployeesList();
      }
    });
    document.getElementById('btn-hire-receptionist-diamond')?.addEventListener('click', () => {
      if (this.stateStore.hireEmployeeWithDiamonds('Pelin K.', 'RECEPTIONIST', -1, 25)) {
        this.renderEmployeesList();
      }
    });

    document.getElementById('btn-hire-stylist-2')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(4500)) {
        this.stateStore.hireEmployee('Selin K.', 'JUNIOR_STYLIST', 1);
        this.renderEmployeesList();
      }
    });
    document.getElementById('btn-hire-stylist-2-diamond')?.addEventListener('click', () => {
      if (this.stateStore.hireEmployeeWithDiamonds('Selin K.', 'JUNIOR_STYLIST', 1, 45)) {
        this.renderEmployeesList();
      }
    });

    document.getElementById('btn-hire-stylist-3')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(7500)) {
        this.stateStore.hireEmployee('Seda T.', 'JUNIOR_STYLIST', 2);
        this.renderEmployeesList();
      }
    });
    document.getElementById('btn-hire-stylist-3-diamond')?.addEventListener('click', () => {
      if (this.stateStore.hireEmployeeWithDiamonds('Seda T.', 'JUNIOR_STYLIST', 2, 75)) {
        this.renderEmployeesList();
      }
    });

    employees.forEach((emp) => {
      document.getElementById(`btn-lvl-${emp.id}`)?.addEventListener('click', () => {
        if (this.stateStore.upgradeEmployeeLevel(emp.id)) {
          this.renderEmployeesList();
        }
      });

      document.getElementById(`btn-lvl-diamond-${emp.id}`)?.addEventListener('click', () => {
        if (this.stateStore.upgradeEmployeeLevelWithDiamonds(emp.id)) {
          this.renderEmployeesList();
        }
      });

      document.getElementById(`btn-speedup-${emp.id}`)?.addEventListener('click', () => {
        if (this.stateStore.speedUpEmployeeTrainingWithDiamonds(emp.id)) {
          this.renderEmployeesList();
        }
      });
    });
  }
}
