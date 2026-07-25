import { StateStore } from './StateStore';
import { EventBus } from './EventBus';
import { GameEventType } from './Types';
import { UIManager } from '../ui/UIManager';
import { SoundEngine } from '../audio/SoundEngine';

export class OfflineEarningsManager {
  private static instance: OfflineEarningsManager;
  private stateStore: StateStore;
  private eventBus: EventBus;

  private constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): OfflineEarningsManager {
    if (!OfflineEarningsManager.instance) {
      OfflineEarningsManager.instance = new OfflineEarningsManager();
    }
    return OfflineEarningsManager.instance;
  }

  public checkOfflineEarnings(uiManager: UIManager): void {
    const state = this.stateStore.getState();
    const lastSaved = state.lastSavedTimestamp || Date.now();
    const now = Date.now();
    const offlineSec = Math.floor((now - lastSaved) / 1000);

    // Only process offline earnings if away for at least 30 seconds
    if (offlineSec < 30) return;

    // Cap offline time to max 4 hours (14,400 seconds)
    const cappedOfflineSec = Math.min(14400, offlineSec);

    // Calculate base earnings per minute: ₺20 per chair + ₺30 if Junior Stylist active
    const activeBranch = this.stateStore.getActiveBranch();
    const chairsCount = activeBranch.chairsCount || 1;
    const hasStylist = state.employees.some((e) => e.role === 'JUNIOR_STYLIST');
    const incomePerSec = ((chairsCount * 12 + (hasStylist ? 25 : 8)) / 60) * activeBranch.prestigeMultiplier;

    const totalOfflineEarnings = Math.floor(cappedOfflineSec * incomePerSec);
    if (totalOfflineEarnings <= 10) return;

    const hours = Math.floor(cappedOfflineSec / 3600);
    const mins = Math.floor((cappedOfflineSec % 3600) / 60);

    const timeStr = hours > 0 ? `${hours} saat ${mins} dakika` : `${mins} dakika`;

    // Show Welcome Back Modal
    setTimeout(() => {
      uiManager.openModal('💤 HOŞ GELDİNİZ! SİZ UYURKEN...', `
        <div style="padding: 20px; color: white; text-align: center; display: flex; flex-direction: column; gap: 16px; align-items: center;">
          <div style="font-size: 54px;">🌙✨</div>
          <h3 style="margin: 0; color: #fbbf24; font-size: 20px;">Kuaför Salonunuz Siz Yokken Çalıştı!</h3>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px;">Geçen Süre: <strong>${timeStr}</strong></p>

          <div style="background: linear-gradient(135deg, rgba(6, 214, 160, 0.2), rgba(247, 37, 133, 0.2)); border: 2px solid #06d6a0; border-radius: 20px; padding: 20px; width: 100%; box-sizing: border-box;">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #a7f3d0;">BİRİKEN ÇEVRİMDİŞİ GELİR:</p>
            <h1 style="margin: 0; font-size: 38px; color: #06d6a0; font-weight: 900;">₺${totalOfflineEarnings.toLocaleString('tr-TR')}</h1>
          </div>

          <button class="btn-upgrade" id="btn-claim-offline" style="width: 100%; padding: 14px; font-size: 15px; border-radius: 99px; background: linear-gradient(135deg, #06d6a0, #059669); color: black; font-weight: 900;">
            💰 NAKİTİ TOPLA (₺${totalOfflineEarnings.toLocaleString('tr-TR')})
          </button>
        </div>
      `);

      SoundEngine.getInstance().playLevelUpSound();

      document.getElementById('btn-claim-offline')?.addEventListener('click', () => {
        this.stateStore.addCash(totalOfflineEarnings);
        uiManager.closeModal();
      });
    }, 800);
  }
}
