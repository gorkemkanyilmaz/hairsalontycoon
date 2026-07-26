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
    this.modalOverlay.classList.add('hidden');
  }

  public openBuyFurnitureModal(kind: 'sofa' | 'station', slotIndex: number): void {
    const state = this.stateStore.getState();
    const branch = this.stateStore.getActiveBranch();
    const isSofa = kind === 'sofa';
    const cost = isSofa ? 150 : 500;
    const title = isSofa ? '🛋️ Bekleme Koltuğu Satın Al' : '✂️ 2. Kuaför İstasyonu Satın Al';
    const desc = isSofa
      ? `Salona ${slotIndex + 1}. Bekleme Koltuğunu ekleyin! Daha fazla müşteri sırada bekleyebilir.`
      : `Salona 2. Kuaför Aynasını ve Koltuğunu ekleyin! İkinci bir kuaför çalıştırmanıza olanak tanır.`;

    const canAfford = state.cash >= cost;

    this.openModal(title, `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px; text-align: center;">
        <div style="font-size: 54px;">${isSofa ? '🛋️' : '✂️'}</div>
        <h3 style="margin: 0; color: #fbbf24;">${title}</h3>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">${desc}</p>
        <div style="background: rgba(255,255,255,0.06); border: 1px solid #fbbf24; border-radius: 14px; padding: 12px; font-weight: 800; color: #06d6a0;">
          Fiyat: ₺${cost}
        </div>
        <button class="btn-upgrade ${canAfford ? '' : 'disabled'}" id="btn-confirm-buy-furniture">
          ${canAfford ? `₺${cost} İLE SATIN AL` : `Yetersiz Bakiye (₺${cost})`}
        </button>
      </div>
    `);

    document.getElementById('btn-confirm-buy-furniture')?.addEventListener('click', () => {
      if (canAfford) {
        this.stateStore.deductCash(cost);
        if (isSofa) {
          branch.waitingSofasCount = Math.max(branch.waitingSofasCount || 1, slotIndex + 1);
        } else {
          branch.barberStationsCount = 2;
          branch.chairsCount = 2;
        }
        this.stateStore.saveState();
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✨ TEBRİKLER! ${isSofa ? 'YENİ BEKLEME KOLTUĞU' : '2. KUAFÖR İSTASYONU'} KURULDU!`);
        this.eventBus.emit(GameEventType.STATE_CHANGED, state);
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
  }

  public openProductsModal(): void {
    const state = this.stateStore.getState();
    const canAfford50 = state.cash >= 150;
    const canAfford100 = state.cash >= 250;

    this.openModal('📦 Stok Deposu & Lojistik Kurye', `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px;">
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

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <h4 style="margin: 0; color: #fbbf24; font-size: 14px;">🚚 HIZLI KURYE SİPARİŞİ VER:</h4>
          
          <button class="btn-upgrade" id="btn-restock-50" ${canAfford50 ? '' : 'disabled class="btn-upgrade disabled"'}>
            📦 +50 Parça Stok Sipariş Et (₺150)
          </button>

          <button class="btn-upgrade" id="btn-restock-100" ${canAfford100 ? '' : 'disabled class="btn-upgrade disabled"'}>
            📦 +100 Parça Tam Depo Doldur (₺250)
          </button>
        </div>
      </div>
    `);

    document.getElementById('btn-restock-50')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestock(50, 150)) {
        this.openProductsModal();
      }
    });

    document.getElementById('btn-restock-100')?.addEventListener('click', () => {
      if (this.stateStore.orderStockRestock(100, 250)) {
        this.openProductsModal();
      }
    });
  }

  public openFranchiseModal(): void {
    const state = this.stateStore.getState();
    const isBranch2Open = state.branches.length >= 2;
    const canAffordFranchise = state.cash >= 1000 && !isBranch2Open;
    const canAffordInsta = state.cash >= 200;

    this.openModal('📢 Reklam Kampanyası & 🏰 Şube Açılışı', `
      <div style="padding: 16px; color: white; display: flex; flex-direction: column; gap: 16px;">
        <!-- Social Media Marketing Campaigns -->
        <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2)); border: 2px solid #38bdf8; border-radius: 18px; padding: 16px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="font-size: 32px;">📢</span>
            <div>
              <h3 style="margin: 0; color: #38bdf8; font-size: 16px;">Sosyal Medya & Reklam Kampanyası</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #cbd5e1;">Bekleme koltuklarını doldurun! Müşteri geliş hızını 2.5 katına çıkarır.</p>
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn-upgrade" id="btn-ad-insta" ${this.stateStore.isMarketingActive || !canAffordInsta ? 'disabled' : ''} style="flex: 1; font-size: 11px; padding: 8px;">
              ${this.stateStore.isMarketingActive ? '⏱️ REKLAM AKTİF' : '📸 Instagram Influencer (₺200 / 60s)'}
            </button>
          </div>
        </div>

        <!-- Fashion Week Event -->
        <div style="background: linear-gradient(135deg, rgba(239, 71, 111, 0.25), rgba(157, 78, 221, 0.25)); border: 2px solid #ef476f; border-radius: 18px; padding: 16px; text-align: center;">
          <p style="font-size: 32px; margin-bottom: 2px;">💃</p>
          <h3 style="margin: 0 0 4px 0; color: #ef476f; font-size: 16px;">Fashion Week VIP Kırmızı Halı Defilesi</h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #fbcfe8;">25 saniye boyunca <strong>5x Gelir & +10 Elmas!</strong></p>
          <button class="btn-upgrade" id="btn-start-fashion" ${state.isFashionEventActive ? 'disabled' : ''}>
            ${state.isFashionEventActive ? '💃 DEFİLE DEVAM EDİYOR...' : '💃 DEFİLE ETKİNLİĞİNİ BAŞLAT (+10 💎)'}
          </button>
        </div>

        <!-- 2nd Salon Branch Expansion -->
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(247, 37, 133, 0.2)); border: 2px solid #fbbf24; border-radius: 18px; padding: 16px; text-align: center;">
          <p style="font-size: 32px; margin-bottom: 2px;">🏰</p>
          <h3 style="margin: 0 0 4px 0; color: #fbbf24; font-size: 16px;">Nişantaşı Lüks Franchise Şubesi</h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #fbcfe8;">Mevcut Şube: <strong>${state.branches.length} Şube</strong> | Prestij: <strong style="color: #06d6a0;">+${Math.round((this.stateStore.getActiveBranch().prestigeMultiplier - 1) * 100)}% Kazanç</strong></p>
          
          ${
            isBranch2Open
              ? `<button class="btn-upgrade" disabled style="background: rgba(6, 214, 160, 0.2); border-color: #06d6a0; color: #06d6a0;">
                  🟢 2. NİŞANTAŞI ŞUBESİ AÇIK & AKTİF (İŞLETİLİYOR)
                 </button>`
              : `<button class="btn-upgrade ${canAffordFranchise ? '' : 'disabled'}" id="btn-open-franchise">
                  🏰 ₺1,000 İLE NİŞANTAŞI 2. LÜKS ŞUBEYİ AÇ (+%50 KAZANÇ)
                 </button>`
          }
        </div>
      </div>
    `);

    document.getElementById('btn-ad-insta')?.addEventListener('click', () => {
      if (this.stateStore.startMarketingCampaign('INSTAGRAM')) {
        this.openFranchiseModal();
      }
    });

    document.getElementById('btn-start-fashion')?.addEventListener('click', () => {
      this.stateStore.startFashionGalaEvent();
      this.closeModal();
    });

    document.getElementById('btn-open-franchise')?.addEventListener('click', () => {
      if (this.stateStore.openNewFranchiseBranch()) {
        this.closeModal();
      }
    });
  }

  private renderUpgradesList(): void {
    const state = this.stateStore.getState();
    const activeBranch = this.stateStore.getActiveBranch();
    const upgrades = Object.values(activeBranch.upgrades);

    let html = `<div class="upgrades-grid">`;

    upgrades.forEach((u: IUpgradeNode) => {
      const isMax = u.level >= u.maxLevel;
      const currentCost = Math.floor(u.baseCost * Math.pow(u.costMultiplier, u.level));

      // Prerequisite check
      let prereqFailed = false;
      if (u.prerequisiteUpgradeId) {
        const prereq = activeBranch.upgrades[u.prerequisiteUpgradeId];
        if (!prereq || prereq.level < 1) {
          prereqFailed = true;
        }
      }

      const canAfford = state.cash >= currentCost && !prereqFailed;

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
                : `<button class="btn-upgrade ${canAfford ? '' : 'disabled'}" data-id="${u.id}">
                    ₺${currentCost} Satın Al
                   </button>`
            }
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.modalBody.innerHTML = html;

    this.modalBody.querySelectorAll('.btn-upgrade:not(.max):not(.disabled)').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          this.stateStore.purchaseUpgrade(id);
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
        const cost = emp.level * 250;
        const canAffordUpgrade = state.cash >= cost;

        html += `
          <div style="background: rgba(255,255,255,0.06); border: 1px solid #f472b6; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">${emp.role === 'RECEPTIONIST' ? '👩‍💼' : '👩‍🎨'}</span>
                <div>
                  <h4 style="margin: 0; color: white;">${emp.name} <span style="color: #fbbf24; font-size: 12px;">(Seviye ${emp.level})</span></h4>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #f472b6;">
                    ${emp.role === 'RECEPTIONIST' ? 'Otomatik Kasiyer' : 'Otomatik Hair Stylist'} — Hız Bonus: +${Math.round((emp.speedMultiplier - 0.65) * 100)}%
                  </p>
                </div>
              </div>
              <span style="background: ${isTraining ? '#f59e0b' : '#06d6a0'}; color: #000; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 99px;">
                ${isTraining ? `🎓 EĞİTİMDE (${remainingSec}s)` : 'ÇALIŞIYOR'}
              </span>
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              ${
                isTraining
                  ? `<button class="btn-upgrade" id="btn-speedup-${emp.id}" style="font-size: 11px; padding: 6px 12px; background: linear-gradient(135deg, #38bdf8, #0284c7); color: white;">
                      ⚡ 10 💎 Elmas ile Hızlı Bitir
                     </button>`
                  : `<button class="btn-upgrade ${canAffordUpgrade ? '' : 'disabled'}" id="btn-lvl-${emp.id}" style="font-size: 11px; padding: 6px 12px;">
                      🎓 Seviye ${emp.level + 1}'e Eğit (₺${cost})
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
    const hasReceptionist = employees.some((e) => e.role === 'RECEPTIONIST');
    const stationsCount = activeBranch.barberStationsCount || 1;
    const stylist1 = employees.find((e) => e.assignedChairIndex === 0);

    // 1) Cansu A. - Junior Stylist for Chair #1 — ₺600, prerequisite: 2. istasyon (barberStationsCount >= 2)
    if (!hasStylist1) {
      const stationOk = stationsCount >= 2;
      const canAfford = state.cash >= 600 && stationOk;
      html += `
        <div style="background: linear-gradient(135deg, rgba(6, 214, 160, 0.18), rgba(247, 37, 133, 0.15)); border: 2px solid ${stationOk ? '#06d6a0' : '#ef476f'}; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <h4 style="margin: 0 0 4px 0; color: #06d6a0;">👩‍🎨 Cansu A. (1. Kuaför — Koltuk #1)</h4>
              <p style="margin: 0; font-size: 12px; color: #cbd5e1;">1. kuaför koltuğundaki (5, 3) müşterilerin saçını otomatik yapar.</p>
            </div>
            <button class="btn-upgrade ${canAfford ? '' : 'disabled'}" id="btn-hire-stylist-1" style="white-space: nowrap;">
              ₺600 İşe Al
            </button>
          </div>
          ${!stationOk ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800;">⚠️ Ön Koşul: Önce 2. Kuaför İstasyonu (₺500) haritadan satın alınmalıdır!</div>` : ''}
        </div>
      `;
    }

    // 2) Pelin K. - Receptionist (auto cashier) — ₺850, playerLevel >= 2
    if (!hasReceptionist) {
      const canAfford = state.cash >= 850 && state.playerLevel >= 2;
      const lvlLocked = state.playerLevel < 2;
      html += `
        <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(247, 37, 133, 0.15)); border: 2px solid #38bdf8; border-radius: 16px; padding: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #38bdf8;">👩‍💼 Pelin K. (Otomatik Kasiyer)</h4>
            <p style="margin: 0; font-size: 12px; color: #cbd5e1;">Kasada bekleyen müşterilerin ödemesini otomatik tahsil eder. Sabır krizlerini önler!</p>
            ${lvlLocked ? `<div style="color:#ef476f;font-size:11px;font-weight:800;margin-top:4px;">⚠️ Ön Koşul: Oyuncu Seviye 2 olmalı (Şu an: Lv.${state.playerLevel})</div>` : ''}
          </div>
          <button class="btn-upgrade ${canAfford ? '' : 'disabled'}" id="btn-hire-receptionist" style="white-space: nowrap;">
            ₺850 İşe Al
          </button>
        </div>
      `;
    }

    // 3) Selin K. - 2nd Stylist for Chair #2 — ₺800, prerequisite: 2. istasyon + Cansu Lv.5
    if (!hasStylist2) {
      const stationOk = stationsCount >= 2;
      const cansuLevel5 = !!stylist1 && stylist1.level >= 5;
      const canAfford = state.cash >= 800 && stationOk && cansuLevel5;
      let prereqNote = '';
      if (!stationOk) prereqNote = `⚠️ Ön Koşul: Önce 2. Kuaför İstasyonu (₺500) haritadan satın alınmalıdır!`;
      else if (!cansuLevel5) prereqNote = `⚠️ Ön Koşul: 1. Kuaför Cansu A. Seviye 5 olmalı (Şu an: Lv.${stylist1?.level || 1})`;

      html += `
        <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(247, 37, 133, 0.15)); border: 2px solid ${canAfford ? '#fbbf24' : '#ef476f'}; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0 0 4px 0; color: #fbbf24;">👩‍🎨 Selin K. (2. Kuaför — Koltuk #2)</h4>
              <p style="margin: 0; font-size: 12px; color: #cbd5e1;">2. kuaför koltuğundaki (8, 3) müşterilerin saçını otomatik yapar.</p>
            </div>
            <button class="btn-upgrade ${canAfford ? '' : 'disabled'}" id="btn-hire-stylist-2" style="white-space: nowrap;">
              ₺800 İşe Al
            </button>
          </div>
          ${prereqNote ? `<div style="color: #ef476f; font-size: 11px; font-weight: 800;">${prereqNote}</div>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    this.modalBody.innerHTML = html;

    // Bind hire buttons
    document.getElementById('btn-hire-stylist-1')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(600)) {
        this.stateStore.hireEmployee('Cansu A.', 'JUNIOR_STYLIST', 0);
        this.renderEmployeesList();
      }
    });

    document.getElementById('btn-hire-receptionist')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(850)) {
        this.stateStore.hireEmployee('Pelin K.', 'RECEPTIONIST', -1);
        this.renderEmployeesList();
      }
    });

    document.getElementById('btn-hire-stylist-2')?.addEventListener('click', () => {
      if (this.stateStore.deductCash(800)) {
        this.stateStore.hireEmployee('Selin K.', 'JUNIOR_STYLIST', 1);
        this.renderEmployeesList();
      }
    });

    employees.forEach((emp) => {
      document.getElementById(`btn-lvl-${emp.id}`)?.addEventListener('click', () => {
        if (this.stateStore.upgradeEmployeeLevel(emp.id)) {
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
