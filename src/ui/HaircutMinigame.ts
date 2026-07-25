import { EventBus } from '../core/EventBus';
import { CustomerManager, ICustomerNPC, COLOR_OPTIONS, CUT_OPTIONS, FINISH_OPTIONS } from '../ai/CustomerAI';

export class HaircutMinigame {
  private overlayElement!: HTMLElement;
  private currentCustomer: ICustomerNPC | null = null;
  private customerManager: CustomerManager;

  // Selected Options by Player
  private selectedColor: string = '';
  private selectedCut: string = '';
  private selectedFinish: string = '';

  constructor() {
    this.customerManager = CustomerManager.getInstance();
    this.createDOM();
  }

  private createDOM(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'styling-modal-overlay hidden';

    this.overlayElement.innerHTML = `
      <div class="styling-modal-card">
        <div class="modal-header">
          <div class="header-title">
            <span class="header-icon">💇‍♀️</span>
            <h3>KADIN KUAFÖRÜ STİL DANIŞMANLIĞI</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-styling">✕</button>
        </div>

        <div class="modal-body">
          <!-- Customer Wish Banner -->
          <div class="customer-wish-box">
            <div class="cust-avatar-icon">👩‍🦰</div>
            <div class="wish-details">
              <h4 id="cust-wish-name">Müşteri Adı</h4>
              <p class="wish-text">💬 <i>"Benim için tam olarak şu modeli uygulamanı istiyorum:"</i></p>
              <div class="wish-tags">
                <span class="wish-tag tag-color" id="wish-color-tag">Sarı</span>
                <span class="wish-tag tag-cut" id="wish-cut-tag">Kısa</span>
                <span class="wish-tag tag-finish" id="wish-finish-tag">Fön</span>
              </div>
            </div>
          </div>

          <!-- Interactive Selection Panels -->
          <div class="styling-options-container">
            <!-- 1. Hair Color Group -->
            <div class="option-group">
              <label class="group-label">🎨 1. Saç Rengi Seçimi:</label>
              <div class="choice-chips" id="color-chips-container"></div>
            </div>

            <!-- 2. Hair Cut Group -->
            <div class="option-group">
              <label class="group-label">✂️ 2. Kesim & Model Seçimi:</label>
              <div class="choice-chips" id="cut-chips-container"></div>
            </div>

            <!-- 3. Finish Styling Group -->
            <div class="option-group">
              <label class="group-label">✨ 3. İşlem & Şekillendirme:</label>
              <div class="choice-chips" id="finish-chips-container"></div>
            </div>
          </div>

          <!-- Submit Button -->
          <button class="btn-primary-action" id="btn-apply-styling">
            ✨ SAÇI ŞEKİLLENDİR VE BİTİR
          </button>
        </div>
      </div>
    `;

    document.getElementById('app')?.appendChild(this.overlayElement);
    this.injectStyles();
    this.bindEvents();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .styling-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(12, 10, 20, 0.85);
        backdrop-filter: blur(12px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        transition: all 0.3s ease;
      }
      .styling-modal-overlay.hidden {
        opacity: 0;
        pointer-events: none !important;
        transform: scale(0.95);
      }
      .styling-modal-card {
        background: rgba(26, 18, 38, 0.95);
        border: 2px solid #f472b6;
        border-radius: 24px;
        width: 100%;
        max-width: 520px;
        box-shadow: 0 20px 50px rgba(244, 114, 182, 0.3);
        color: #ffffff;
        font-family: 'Outfit', sans-serif;
        overflow: hidden;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 24px;
        background: rgba(244, 114, 182, 0.12);
        border-bottom: 1px solid rgba(244, 114, 182, 0.2);
      }
      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .header-title h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 800;
        color: #fce7f3;
        letter-spacing: 0.5px;
      }
      .btn-close-modal {
        background: none;
        border: none;
        color: #cbd5e1;
        font-size: 20px;
        cursor: pointer;
      }
      .modal-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .customer-wish-box {
        background: linear-gradient(135deg, rgba(247, 37, 133, 0.2), rgba(114, 9, 183, 0.2));
        border: 1px solid #f72585;
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .cust-avatar-icon {
        font-size: 42px;
      }
      .wish-details h4 {
        margin: 0 0 4px 0;
        font-size: 18px;
        color: #ffffff;
      }
      .wish-text {
        margin: 0 0 10px 0;
        font-size: 13px;
        color: #fbcfe8;
      }
      .wish-tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .wish-tag {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 99px;
        color: #ffffff;
      }
      .tag-color { background: #f72585; }
      .tag-cut { background: #7209b7; }
      .tag-finish { background: #4cc9f0; color: #000000; }

      .styling-options-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .option-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .group-label {
        font-size: 13px;
        font-weight: 700;
        color: #f472b6;
      }
      .choice-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e2e8f0;
        font-family: 'Outfit', sans-serif;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .chip-btn:hover {
        background: rgba(244, 114, 182, 0.2);
        border-color: #f472b6;
      }
      .chip-btn.selected {
        background: #f72585;
        border-color: #ffffff;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(247, 37, 133, 0.5);
      }

      .btn-primary-action {
        background: linear-gradient(135deg, #f72585, #b5179e);
        border: none;
        color: #ffffff;
        font-family: 'Outfit', sans-serif;
        font-size: 15px;
        font-weight: 800;
        padding: 14px;
        border-radius: 14px;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(247, 37, 133, 0.4);
        transition: all 0.2s ease;
        margin-top: 10px;
      }
      .btn-primary-action:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(247, 37, 133, 0.6);
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    document.getElementById('btn-close-styling')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('btn-apply-styling')?.addEventListener('click', () => {
      this.evaluateStyling();
    });
  }

  public startMinigame(customer: ICustomerNPC): void {
    this.currentCustomer = customer;
    this.selectedColor = '';
    this.selectedCut = '';
    this.selectedFinish = '';

    // Populate Customer Wish Labels
    document.getElementById('cust-wish-name')!.textContent = customer.name;
    document.getElementById('wish-color-tag')!.textContent = `🎨 ${customer.wish.color}`;
    document.getElementById('wish-cut-tag')!.textContent = `✂️ ${customer.wish.cut}`;
    document.getElementById('wish-finish-tag')!.textContent = `✨ ${customer.wish.finish}`;

    // Render Choice Chips
    this.renderChips('color-chips-container', COLOR_OPTIONS, (selected) => {
      this.selectedColor = selected;
    });

    this.renderChips('cut-chips-container', CUT_OPTIONS, (selected) => {
      this.selectedCut = selected;
    });

    this.renderChips('finish-chips-container', FINISH_OPTIONS, (selected) => {
      this.selectedFinish = selected;
    });

    this.overlayElement.classList.remove('hidden');
  }

  private renderChips(containerId: string, options: string[], onSelect: (val: string) => void): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    options.forEach((option) => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.textContent = option;

      btn.addEventListener('click', () => {
        // Unselect siblings
        Array.from(container.children).forEach((c) => c.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(option);
      });

      container.appendChild(btn);
    });
  }

  private evaluateStyling(): void {
    if (!this.currentCustomer) return;

    if (!this.selectedColor || !this.selectedCut || !this.selectedFinish) {
      EventBus.getInstance().emit('NOTIFICATION_TRIGGERED', '⚠️ Lütfen 3 kategoriden de birer seçim yapın!');
      return;
    }

    const wish = this.currentCustomer.wish;
    let matchCount = 0;

    if (this.selectedColor === wish.color) matchCount++;
    if (this.selectedCut === wish.cut) matchCount++;
    if (this.selectedFinish === wish.finish) matchCount++;

    let rating: 'POOR' | 'NORMAL' | 'GREAT' | 'PERFECT' = 'POOR';
    let feedbackMsg = '';

    if (matchCount === 3) {
      rating = 'PERFECT';
      feedbackMsg = `🌟 MÜKEMMEL STİL! ${this.currentCustomer.name} saç modeline bayıldı! (+₺35 Bahşiş)`;
    } else if (matchCount === 2) {
      rating = 'GREAT';
      feedbackMsg = `👍 HARİKA İŞ! ${this.currentCustomer.name} genel olarak çok memnun kaldı! (+₺20 Bahşiş)`;
    } else if (matchCount === 1) {
      rating = 'NORMAL';
      feedbackMsg = `✂️ FENA DEĞİL! ${this.currentCustomer.name} istediği modele tam ulaşamadı. (+₺5 Bahşiş)`;
    } else {
      rating = 'POOR';
      feedbackMsg = `⚠️ KÖTÜ KESİM! ${this.currentCustomer.name}: "İstediğim saç bu değildi!" (₺0 Bahşiş)`;
    }

    EventBus.getInstance().emit('NOTIFICATION_TRIGGERED', feedbackMsg);
    this.customerManager.finishHaircut(this.currentCustomer, rating);

    this.closeModal();
  }

  private closeModal(): void {
    this.overlayElement.classList.add('hidden');
    this.currentCustomer = null;
  }
}
