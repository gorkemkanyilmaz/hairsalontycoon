import { EventBus } from './EventBus';
import { GameEventType, IGameState, IUpgradeNode, UpgradeCategory, IEmployeeData, EmployeeState, ISalonTheme, IGoogleReview, ISalonState } from './Types';

const createDefaultUpgrades = (): Record<string, IUpgradeNode> => ({
  quick_scissors: {
    id: 'quick_scissors',
    name: 'Hızlı Fön & Makas',
    description: 'Saç şekillendirme süresini %10 hızlandırır.',
    icon: '💇‍♀️',
    category: UpgradeCategory.EQUIPMENT,
    level: 1,
    maxLevel: 25,
    baseCost: 50,
    costMultiplier: 1.25,
    requiredPlayerLevel: 1,
    effects: { serviceSpeedBonus: 0.10 }
  },
  comfy_chair: {
    id: 'comfy_chair',
    name: 'Ergonomik Kuaför Koltuğu',
    description: 'Müşteri bahşişini ve memnuniyetini artırır.',
    icon: '🪑',
    category: UpgradeCategory.FURNITURE,
    level: 1,
    maxLevel: 20,
    baseCost: 120,
    costMultiplier: 1.30,
    requiredPlayerLevel: 1,
    prerequisiteUpgradeId: 'quick_scissors',
    prerequisiteDescription: 'Hızlı Fön & Makas Seviye 2 olmalıdır!',
    effects: { incomeMultiplier: 0.15 }
  },
  hair_wash_station: {
    id: 'hair_wash_station',
    name: 'Saç Yıkama Ünitesi & Yıkama Koltuğu',
    description: 'Müşterilerin saçını yıkayarak +₺25 ekstra kazanç ve memnuniyet sağlar!',
    icon: '🚿',
    category: UpgradeCategory.FURNITURE,
    level: 0,
    maxLevel: 1,
    baseCost: 450,
    costMultiplier: 1.0,
    requiredPlayerLevel: 1,
    prerequisiteUpgradeId: 'quick_scissors',
    prerequisiteDescription: 'Hızlı Fön & Makas Seviye 5 olmalıdır!',
    effects: { hairWashUnlocked: true }
  },
  retail_shelf: {
    id: 'retail_shelf',
    name: 'Şampuan & Bakım Ürün Stantı',
    description: 'Saçını yaptıran müşterilere ₺50 ürün satışı sağlar!',
    icon: '🧴',
    category: UpgradeCategory.RETAIL,
    level: 0,
    maxLevel: 1,
    baseCost: 400,
    costMultiplier: 1.0,
    requiredPlayerLevel: 1,
    prerequisiteUpgradeId: 'hair_wash_station',
    prerequisiteDescription: 'Önce Saç Yıkama Ünitesi satın alınmalıdır!',
    effects: { retailIncomeBonus: 50 }
  },
  vip_attractor: {
    id: 'vip_attractor',
    name: 'VIP Influencer & Ünlü Reklamı',
    description: 'Salona 3 katı bahşiş veren VIP Ünlü Müşteri geliş sıklığını artırır!',
    icon: '👑',
    category: UpgradeCategory.DECOR,
    level: 0,
    maxLevel: 5,
    baseCost: 600,
    costMultiplier: 1.5,
    requiredPlayerLevel: 1,
    effects: { vipFrequencyMultiplier: 3.0 }
  },
  salon_expansion: {
    id: 'salon_expansion',
    name: '📐 Salon Alanı Büyütme',
    description: 'Salonu büyütür! 3. Kuaför Standını ve 1 Saatlik Lüks 👰 Gelin Saçı Hizmetini açar!',
    icon: '📐',
    category: UpgradeCategory.EXPANSION,
    level: 0,
    maxLevel: 1,
    baseCost: 8000,
    costMultiplier: 1.0,
    requiredPlayerLevel: 1,
    prerequisiteUpgradeId: 'comfy_chair',
    prerequisiteDescription: 'Ergonomik Kuaför Koltuğu Seviye 3 olmalıdır!',
    effects: { expansionUnlocked: true }
  }
});

const INITIAL_REVIEWS: IGoogleReview[] = [
  { id: 'rev_1', customerName: 'Hande S.', rating: 5, comment: 'Kesim ve fön muhteşem oldu! Personel çok ilgili! ⭐⭐⭐⭐⭐', timestamp: Date.now() - 3600000 },
  { id: 'rev_2', customerName: 'Buse A.', rating: 4, comment: 'Salon biraz kalabalıktı ama saç rengim harika açıldı! ⭐⭐⭐⭐', timestamp: Date.now() - 7200000 }
];

export class StateStore {
  private static instance: StateStore;
  private state: IGameState;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.state = this.loadOrInitState();
  }

  public static getInstance(): StateStore {
    if (!StateStore.instance) {
      StateStore.instance = new StateStore();
    }
    return StateStore.instance;
  }

  private loadOrInitState(): IGameState {
    try {
      const saved = localStorage.getItem('HAIR_EMPIRE_SAVE');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.branches && Array.isArray(parsed.branches) && parsed.branches.length > 0 && parsed.branches[0].upgrades) {
          // Migration: fix any employee role/name corruption from reversed parameters
          if (parsed.employees && Array.isArray(parsed.employees)) {
            parsed.employees.forEach((emp: any) => {
              if (emp.role === 'Cansu A.' || emp.name === 'JUNIOR_STYLIST') {
                emp.name = 'Cansu A.';
                emp.role = 'JUNIOR_STYLIST';
              } else if (emp.role === 'Pelin K.' || emp.name === 'RECEPTIONIST') {
                emp.name = 'Pelin K.';
                emp.role = 'RECEPTIONIST';
              } else if (emp.role === 'Selin K.') {
                emp.name = 'Selin K.';
                emp.role = 'JUNIOR_STYLIST';
              }
            });
          }
          if (parsed.diamonds === undefined || parsed.diamonds < 10000) {
            parsed.diamonds = 10000;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Invalid local save detected, resetting game state cleanly...');
    }

    localStorage.removeItem('HAIR_EMPIRE_SAVE');
    return this.getDefaultState();
  }

  private getDefaultState(): IGameState {
    const branch1: ISalonState = {
      branchIndex: 0,
      salonName: 'Kadıköy Lüks Kuaförü #1',
      salonLevel: 1,
      chairsCount: 1,
      chairsOccupied: 0,
      queueCapacity: 1,
      prestigeMultiplier: 1.0,
      theme: { floorStyle: 'ROSE_MARBLE', wallStyle: 'PASTEL_PINK' },
      upgrades: createDefaultUpgrades(),
      waitingSofasCount: 1,
      barberStationsCount: 1
    };

    return {
      cash: 500,
      diamonds: 10000,
      reputation: 4.5,
      reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
      playerLevel: 1,
      playerXP: 0,
      nextLevelXP: 100,
      activeBranchIndex: 0,
      branches: [branch1],
      employees: [],
      retailProductsStock: 50,
      maxRetailStock: 100,
      isFashionEventActive: false,
      fashionEventTimerSec: 0,
      activeTask: '2. Kuaför İstasyonu alın ve Cansu A.\'yı işe alın!',
      lastSavedTimestamp: Date.now()
    };
  }

  public saveState(): void {
    this.state.lastSavedTimestamp = Date.now();
    localStorage.setItem('HAIR_EMPIRE_SAVE', JSON.stringify(this.state));
  }

  public resetAllProgress(): void {
    try {
      localStorage.removeItem('HAIR_EMPIRE_SAVE');
      localStorage.removeItem('luxe_salon_tutorial_step');
      localStorage.clear();
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
    this.state = this.getDefaultState();
    this.saveState();
    TutorialManager.getInstance().resetTutorial();
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.eventBus.emit(GameEventType.CASH_CHANGED, this.state.cash);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🧹 TÜM KAYITLI OYUN GEÇMİŞİ SIFIRLANDI! SIFIRDAN BAŞLANIYOR...`);
  }

  public getState(): Readonly<IGameState> {
    return this.state;
  }

  public getActiveBranch(): ISalonState {
    if (!this.state || !this.state.branches || !Array.isArray(this.state.branches) || this.state.branches.length === 0) {
      this.state = this.getDefaultState();
    }
    const idx = this.state.activeBranchIndex || 0;
    const branch = this.state.branches[idx] || this.state.branches[0];
    // Migration: ensure new furniture fields exist for older saves
    if (branch.waitingSofasCount === undefined) {
      branch.waitingSofasCount = branch.queueCapacity && branch.queueCapacity > 1 ? branch.queueCapacity : 1;
    }
    if (branch.barberStationsCount === undefined) {
      branch.barberStationsCount = branch.chairsCount || 1;
    }
    if (branch.upgrades && branch.upgrades.salon_expansion) {
      branch.upgrades.salon_expansion.maxLevel = 1;
    }
    return branch;
  }

  public switchActiveBranch(index: number): void {
    if (index < 0 || index >= this.state.branches.length) return;
    this.state.activeBranchIndex = index;
    this.eventBus.emit(GameEventType.BRANCH_SWITCHED, index);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📍 ${this.getActiveBranch().salonName} YÖNETİMİNE GEÇİLDİ!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
  }

  // Buy an extra waiting sofa for the active branch (max 3). ₺800 each.
  public buyWaitingSofa(): boolean {
    const branch = this.getActiveBranch();
    if ((branch.waitingSofasCount || 1) >= 3) return false;
    const cost = 800;
    if (!this.deductCash(cost)) return false;
    branch.waitingSofasCount = (branch.waitingSofasCount || 1) + 1;
    branch.queueCapacity = branch.waitingSofasCount;
    if (branch.salonLevel < 2) branch.salonLevel = 2;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🛋️ Yeni bekleme koltuğu kuruldu! (Toplam ${branch.waitingSofasCount}/3)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  // Consume 1 shampoo stock unit for every customer serviced
  public consumeShampooStock(): boolean {
    if (this.state.retailProductsStock <= 0) {
      this.state.retailProductsStock = 0;
      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `⚠️ 🧴 ŞAMPUAN BİTTİ! Müşteriler saç bakımı yapılamadığı için memnuniyetsiz ayrılıyor!`);
      this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
      this.saveState();
      return false;
    }

    this.state.retailProductsStock -= 1;
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  // Buy a 2nd barber station (chair + mirror) for the active branch. ₺2,000.
  public buyBarberStation(): boolean {
    const branch = this.getActiveBranch();
    if ((branch.barberStationsCount || 1) >= 2) return false;
    const cost = 2000;
    if (!this.deductCash(cost)) return false;
    branch.barberStationsCount = 2;
    branch.chairsCount = 2;
    if (branch.salonLevel < 2) branch.salonLevel = 2;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✂️ 2. Kuaför İstasyonu kuruldu! Artık aynı anda 2 müşteri hizmet alabilir!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public addGoogleReview(customerName: string, rating: number, comment: string): void {
    const newRev: IGoogleReview = {
      id: 'rev_' + Date.now(),
      customerName,
      rating,
      comment,
      timestamp: Date.now()
    };

    this.state.reviews.unshift(newRev);
    if (this.state.reviews.length > 20) this.state.reviews.pop();

    const sum = this.state.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.state.reputation = Math.round((sum / this.state.reviews.length) * 10) / 10;

    this.eventBus.emit(GameEventType.REVIEW_ADDED, newRev);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
  }

  public addCash(amount: number): void {
    if (amount <= 0) return;
    const activeBranch = this.getActiveBranch();
    const multiplier = this.state.isFashionEventActive ? 5.0 : 1.0;
    const finalAmount = Math.floor(amount * activeBranch.prestigeMultiplier * multiplier);
    this.state.cash += finalAmount;
    this.eventBus.emit(GameEventType.CASH_CHANGED, this.state.cash);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
  }

  public deductCash(amount: number): boolean {
    if (this.state.cash < amount) return false;
    this.state.cash -= amount;
    this.eventBus.emit(GameEventType.CASH_CHANGED, this.state.cash);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public addDiamonds(amount: number): void {
    if (amount <= 0) return;
    this.state.diamonds += amount;
    this.eventBus.emit(GameEventType.DIAMONDS_CHANGED, this.state.diamonds);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
  }

  public deductDiamonds(amount: number): boolean {
    if (this.state.diamonds < amount) return false;
    this.state.diamonds -= amount;
    this.eventBus.emit(GameEventType.DIAMONDS_CHANGED, this.state.diamonds);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public upgradeEmployeeLevel(employeeId: string): boolean {
    const emp = this.state.employees.find((e) => e.id === employeeId);
    if (!emp) return false;

    const cost = emp.level * 250;
    if (!this.deductCash(cost)) return false;

    emp.level += 1;
    emp.speedMultiplier += 0.20;
    const durationSec = 20 + emp.level * 10; // Level 2: 30s, Level 3: 40s, Level 4: 50s...
    emp.trainingEndsTimestamp = Date.now() + durationSec * 1000;

    this.eventBus.emit(GameEventType.EMPLOYEE_LEVEL_UP, emp);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🎓 ${emp.name} SEVİYE ${emp.level} EĞİTİMİNE BAŞLADI! (${durationSec} sn)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public speedUpEmployeeTrainingWithDiamonds(employeeId: string): boolean {
    const emp = this.state.employees.find((e) => e.id === employeeId);
    if (!emp || !emp.trainingEndsTimestamp) return false;

    if (!this.deductDiamonds(10)) return false;

    emp.trainingEndsTimestamp = undefined;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `⚡ ELMASLA HIZLANDIRILDI! ${emp.name} Eğitimi Anında Tamamlandı!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public addXP(amount: number): void {
    this.state.playerXP += amount;
    this.eventBus.emit(GameEventType.XP_GAINED, amount);

    while (this.state.playerXP >= this.state.nextLevelXP) {
      this.state.playerXP -= this.state.nextLevelXP;
      this.state.playerLevel += 1;
      this.state.nextLevelXP = Math.floor(this.state.nextLevelXP * 1.5);
      this.eventBus.emit(GameEventType.LEVEL_UP, this.state.playerLevel);
    }
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
  }

  public consumeStock(amount: number = 1): boolean {
    if (this.state.retailProductsStock < amount) return false;
    this.state.retailProductsStock -= amount;
    this.eventBus.emit(GameEventType.STOCK_CHANGED, this.state.retailProductsStock);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public orderStockRestock(amount: number, cost: number): boolean {
    if (this.state.retailProductsStock >= this.state.maxRetailStock) return false;
    if (!this.deductCash(cost)) return false;

    this.state.retailProductsStock = Math.min(this.state.maxRetailStock, this.state.retailProductsStock + amount);
    this.eventBus.emit(GameEventType.STOCK_CHANGED, this.state.retailProductsStock);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📦 KURYE GELDİ! +${amount} Şampuan & Bakım Stoğu Depoya Teslim Edildi!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public startFashionGalaEvent(): void {
    if (this.state.isFashionEventActive) return;
    this.state.isFashionEventActive = true;
    this.state.fashionEventTimerSec = 25;
    this.addDiamonds(10);

    this.eventBus.emit(GameEventType.FASHION_EVENT_STARTED, 25);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `💃 FASHION WEEK DEFLİE ETKİNLİĞİ BAŞLADI! (5x GELİR & +10 ELMAS!)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);

    const timer = setInterval(() => {
      this.state.fashionEventTimerSec -= 1;
      if (this.state.fashionEventTimerSec <= 0) {
        clearInterval(timer);
        this.state.isFashionEventActive = false;
        this.eventBus.emit(GameEventType.FASHION_EVENT_ENDED);
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✨ Defile Etkinliği Tamamlandı!`);
        this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
      }
    }, 1000);
  }

  public purchaseUpgrade(upgradeId: string): boolean {
    const activeBranch = this.getActiveBranch();
    const upgrade = activeBranch.upgrades[upgradeId];
    if (!upgrade) return false;
    if (upgrade.level >= upgrade.maxLevel) return false;
    if (this.state.playerLevel < upgrade.requiredPlayerLevel) return false;

    // Prerequisite Check!
    if (upgrade.prerequisiteUpgradeId) {
      const prereq = activeBranch.upgrades[upgrade.prerequisiteUpgradeId];
      if (!prereq || prereq.level < 1) {
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `⚠️ ÖN KOŞUL: ${upgrade.prerequisiteDescription || 'Önceki geliştirme satın alınmalıdır!'}`);
        return false;
      }
    }

    const currentCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    if (!this.deductCash(currentCost)) return false;

    upgrade.level += 1;
    this.addXP(35 * upgrade.level);

    if (upgradeId === 'salon_expansion') {
      activeBranch.barberStationsCount = Math.max(activeBranch.barberStationsCount || 1, 3);
      activeBranch.chairsCount = Math.max(activeBranch.chairsCount || 1, 3);
      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📐 TEBRİKLER! SALON BÜYÜTÜLDÜ! 3. Kuaför Standı & 👰 Gelin Saçı Hizmeti Açıldı!`);
    }

    this.eventBus.emit(GameEventType.UPGRADE_PURCHASED, upgrade);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public purchaseUpgradeWithDiamonds(upgradeId: string): boolean {
    const activeBranch = this.getActiveBranch();
    const upgrade = activeBranch.upgrades[upgradeId];
    if (!upgrade) return false;
    if (upgrade.level >= upgrade.maxLevel) return false;

    if (upgrade.prerequisiteUpgradeId) {
      const prereq = activeBranch.upgrades[upgrade.prerequisiteUpgradeId];
      if (!prereq || prereq.level < 1) {
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `⚠️ ÖN KOŞUL: ${upgrade.prerequisiteDescription || 'Önceki geliştirme satın alınmalıdır!'}`);
        return false;
      }
    }

    const currentCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    const diamondCost = Math.max(1, Math.ceil(currentCost / 100));

    if (!this.deductDiamonds(diamondCost)) return false;

    upgrade.level += 1;
    this.addXP(35 * upgrade.level);

    if (upgradeId === 'salon_expansion') {
      activeBranch.barberStationsCount = Math.max(activeBranch.barberStationsCount || 1, 3);
      activeBranch.chairsCount = Math.max(activeBranch.chairsCount || 1, 3);
      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📐 TEBRİKLER! SALON BÜYÜTÜLDÜ! 3. Kuaför Standı & 👰 Gelin Saçı Hizmeti Açıldı!`);
    }

    this.eventBus.emit(GameEventType.UPGRADE_PURCHASED, upgrade);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public buyWaitingSofaWithDiamonds(): boolean {
    const branch = this.getActiveBranch();
    if ((branch.waitingSofasCount || 1) >= 3) return false;
    const diamondCost = 8;
    if (!this.deductDiamonds(diamondCost)) return false;
    branch.waitingSofasCount = (branch.waitingSofasCount || 1) + 1;
    branch.queueCapacity = branch.waitingSofasCount;
    if (branch.salonLevel < 2) branch.salonLevel = 2;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🛋️ Yeni bekleme koltuğu elmas ile kuruldu! (Toplam ${branch.waitingSofasCount}/3)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public buyBarberStationWithDiamonds(): boolean {
    const branch = this.getActiveBranch();
    if ((branch.barberStationsCount || 1) >= 2) return false;
    const diamondCost = 20;
    if (!this.deductDiamonds(diamondCost)) return false;
    branch.barberStationsCount = 2;
    branch.chairsCount = 2;
    if (branch.salonLevel < 2) branch.salonLevel = 2;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✂️ 2. Kuaför İstasyonu elmas ile kuruldu!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public hireEmployeeWithDiamonds(name: string, role: 'JUNIOR_STYLIST' | 'SENIOR_STYLIST' | 'RECEPTIONIST', chairIndex: number, diamondCost: number): boolean {
    if (!this.deductDiamonds(diamondCost)) return false;
    this.hireEmployee(name, role, chairIndex);
    return true;
  }

  public upgradeEmployeeLevelWithDiamonds(employeeId: string): boolean {
    const emp = this.state.employees.find((e) => e.id === employeeId);
    if (!emp) return false;

    const costCash = emp.level * 250;
    const diamondCost = Math.max(1, Math.ceil(costCash / 100));
    if (!this.deductDiamonds(diamondCost)) return false;

    emp.level += 1;
    emp.speedMultiplier += 0.20;
    const durationSec = 20 + emp.level * 10;
    emp.trainingEndsTimestamp = Date.now() + durationSec * 1000;

    this.eventBus.emit(GameEventType.EMPLOYEE_LEVEL_UP, emp);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🎓 ${emp.name} ELMAS İLE SEVİYE ${emp.level} EĞİTİMİNE BAŞLADI! (${durationSec} sn)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public orderStockRestockWithDiamonds(amount: number, diamondCost: number): boolean {
    if (this.state.retailProductsStock >= this.state.maxRetailStock) return false;
    if (!this.deductDiamonds(diamondCost)) return false;

    this.state.retailProductsStock = Math.min(this.state.maxRetailStock, this.state.retailProductsStock + amount);
    this.eventBus.emit(GameEventType.STOCK_CHANGED, this.state.retailProductsStock);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📦 HIZLI KURYE ELMAS İLE GELDİ! +${amount} Şampuan & Bakım Stoğu Teslim Edildi!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public startSocialMediaAdPackageWithDiamonds(packageType: 'BRONZE' | 'SILVER' | 'GOLD'): boolean {
    let cashCost = 500;
    let durationSec = 60;
    let spawnMult = 1.5;
    let vipRate = 0.25;

    if (packageType === 'SILVER') {
      cashCost = 1000;
      durationSec = 90;
      spawnMult = 2.0;
      vipRate = 0.45;
    } else if (packageType === 'GOLD') {
      cashCost = 2000;
      durationSec = 120;
      spawnMult = 3.0;
      vipRate = 0.75;
    }

    const diamondCost = Math.max(1, Math.ceil(cashCost / 100));
    if (!this.deductDiamonds(diamondCost)) return false;

    this.activeSocialAdPackage = {
      type: packageType,
      endsTimestamp: Date.now() + durationSec * 1000,
      spawnMultiplier: spawnMult,
      vipChance: vipRate
    };

    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📱 REKLAM KAMPANYASI ELMASLA BAŞLATILDI! (${packageType} Paket: +%${Math.round((spawnMult - 1) * 100)} Müşteri & %${Math.round(vipRate * 100)} VIP)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public openNewFranchiseBranchWithDiamonds(): boolean {
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

    const nextBranchIdx = this.state.branches.length;
    const baseCost = 10000;
    const cashCost = Math.floor(baseCost * Math.pow(2.2, nextBranchIdx - 1));
    const diamondCost = Math.max(1, Math.ceil(cashCost / 100));

    if (!this.deductDiamonds(diamondCost)) return false;

    const salonName = BRANCH_NAMES[nextBranchIdx] || `Lüks Şube #${nextBranchIdx + 1}`;

    const newBranch: ISalonState = {
      branchIndex: nextBranchIdx,
      salonName: salonName,
      salonLevel: 1,
      queueCapacity: 1,
      waitingSofasCount: 1,
      barberStationsCount: 1,
      chairsCount: 1,
      prestigeMultiplier: 1.0 + nextBranchIdx * 0.5,
      constructionEndsTimestamp: Date.now() + 3600 * 1000,
      upgrades: {
        quick_scissors: { id: 'quick_scissors', name: 'Hızlı Fön & Makas', description: 'Kuaför işlem hızını artırır.', icon: '✂️', level: 0, maxLevel: 25, baseCost: 100, costMultiplier: 1.4, requiredPlayerLevel: 1 },
        comfy_chair: { id: 'comfy_chair', name: 'Ergonomik Kuaför Koltuğu', description: 'Müşteri sabrını ve bahşiş oranını yükseltir.', icon: '💺', level: 0, maxLevel: 20, baseCost: 150, costMultiplier: 1.5, requiredPlayerLevel: 1 },
        auto_cashier: { id: 'auto_cashier', name: 'POS Dokunmatik Kasa', description: 'Ödeme alma süresini hızlandırır.', icon: '💳', level: 0, maxLevel: 15, baseCost: 300, costMultiplier: 1.6, requiredPlayerLevel: 2 },
        hair_wash_station: { id: 'hair_wash_station', name: 'Saç Yıkama & Spa Ünitesi', description: 'Servis başı geliri +%40 artırır.', icon: '🚰', level: 0, maxLevel: 10, baseCost: 500, costMultiplier: 1.8, requiredPlayerLevel: 3 },
        vip_champagne: { id: 'vip_champagne', name: 'VIP Şampanya İkramı', description: 'VIP müşterilerin ödediği parayı 2x yapar.', icon: '🍾', level: 0, maxLevel: 10, baseCost: 1000, costMultiplier: 2.0, requiredPlayerLevel: 4 },
        marketing_boost: { id: 'marketing_boost', name: 'Sosyal Medya Reklamları', description: 'Salona gelen toplam müşteri sayısını artırır.', icon: '📱', level: 0, maxLevel: 15, baseCost: 250, costMultiplier: 1.5, requiredPlayerLevel: 2 },
        salon_expansion: { id: 'salon_expansion', name: 'Salon Alanı Büyütme', description: 'Salona 3. kuaför standı & gelin saçı bölümünü ekler.', icon: '📐', level: 0, maxLevel: 1, baseCost: 8000, costMultiplier: 1.0, requiredPlayerLevel: 5, prerequisiteUpgradeId: 'comfy_chair', prerequisiteDescription: 'Ergonomik Kuaför Koltuğu en az Seviye 1 olmalıdır' }
      }
    };

    this.state.branches.push(newBranch);
    this.state.activeBranchIndex = nextBranchIdx;

    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🏰 TEBRİKLER! ELMAS İLE YENİ ŞUBE (${salonName}) KURULDU!`);
    this.eventBus.emit(GameEventType.BRANCH_SWITCHED, nextBranchIdx);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public isMarketingActive: boolean = false;
  public marketingTimerSec: number = 0;

  public startMarketingCampaign(type: 'INSTAGRAM' | 'BILLBOARD'): boolean {
    if (this.isMarketingActive) return false;
    const cost = type === 'INSTAGRAM' ? 200 : 400;
    if (!this.deductCash(cost)) return false;

    this.isMarketingActive = true;
    this.marketingTimerSec = 60;

    this.eventBus.emit(
      GameEventType.NOTIFICATION_TRIGGERED,
      `📢 ${type === 'INSTAGRAM' ? 'INSTAGRAM / TIKTOK INFLUENCER' : 'BILLBOARD & GOOGLE HARİTA'} REKLAM KAMPANYASI BAŞLADI! (60 sn 2x MÜŞTERİ AKIŞI!)`
    );
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);

    const timer = setInterval(() => {
      this.marketingTimerSec -= 1;
      if (this.marketingTimerSec <= 0) {
        clearInterval(timer);
        this.isMarketingActive = false;
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✨ Reklam Kampanyası Tamamlandı!`);
        this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
      }
    }, 1000);

    return true;
  }

  public activeSocialAdPackage?: { type: 'BRONZE' | 'SILVER' | 'GOLD'; endsTimestamp: number; spawnMultiplier: number; vipChance: number };

  public startSocialMediaAdPackage(packageType: 'BRONZE' | 'SILVER' | 'GOLD'): boolean {
    let cost = 500;
    let durationSec = 60;
    let spawnMult = 1.5;
    let vipRate = 0.25;

    if (packageType === 'SILVER') {
      cost = 1000;
      durationSec = 90;
      spawnMult = 2.0;
      vipRate = 0.45;
    } else if (packageType === 'GOLD') {
      cost = 2000;
      durationSec = 120;
      spawnMult = 3.0;
      vipRate = 0.75;
    }

    if (!this.deductCash(cost)) return false;

    this.activeSocialAdPackage = {
      type: packageType,
      endsTimestamp: Date.now() + durationSec * 1000,
      spawnMultiplier: spawnMult,
      vipChance: vipRate
    };

    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `📱 REKLAM KAMPANYASI BAŞLATILDI! (${packageType} Paket: +%${Math.round((spawnMult - 1) * 100)} Müşteri & %${Math.round(vipRate * 100)} VIP Oranı)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public openNewFranchiseBranch(): boolean {
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

    const nextBranchIdx = this.state.branches.length;
    const baseCost = 10000;
    const cost = Math.floor(baseCost * Math.pow(2.2, nextBranchIdx - 1));
    if (this.state.cash < cost) return false;

    this.state.cash -= cost;
    this.addDiamonds(25);

    const salonName = BRANCH_NAMES[nextBranchIdx] || `Lüks Şube #${nextBranchIdx + 1}`;

    const newBranch: ISalonState = {
      branchIndex: nextBranchIdx,
      salonName: salonName,
      salonLevel: 1,
      chairsCount: 1,
      chairsOccupied: 0,
      queueCapacity: 1,
      prestigeMultiplier: 1.5 + nextBranchIdx * 0.5,
      theme: { floorStyle: 'GOLDEN_QUARTZ', wallStyle: 'LUXE_GOLD' },
      upgrades: createDefaultUpgrades(),
      waitingSofasCount: 1,
      barberStationsCount: 1,
      constructionEndsTimestamp: Date.now() + 3600 * 1000 // 1 Hour (3600 seconds) construction time!
    };

    this.state.branches.push(newBranch);
    this.state.activeBranchIndex = nextBranchIdx;

    this.eventBus.emit(GameEventType.FRANCHISE_OPENED, this.state.branches.length);
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🏰 TEBRİKLER! ${salonName.toUpperCase()} KURULUMU BAŞLADI! (1 Saat İnşaat Süresi)`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public speedUpBranchConstructionWithDiamonds(branchIndex: number): boolean {
    const branch = this.state.branches[branchIndex];
    if (!branch || !branch.constructionEndsTimestamp) return false;

    const diamondCost = 50;
    if (!this.deductDiamonds(diamondCost)) return false;

    branch.constructionEndsTimestamp = undefined;
    this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `⚡ 50 💎 ELMAS İLE ANINDA TAMAMLANDI! ${branch.salonName} Hizmete Açıldı!`);
    this.eventBus.emit(GameEventType.STATE_CHANGED, this.state);
    this.saveState();
    return true;
  }

  public hireEmployee(name: string, role: 'JUNIOR_STYLIST' | 'SENIOR_STYLIST' | 'RECEPTIONIST' | 'WASH_SPECIALIST', assignedChairIndex: number): void {
    const startX = role === 'RECEPTIONIST' ? 18 : (assignedChairIndex === 1 ? 12 : (assignedChairIndex === 2 ? 17 : 7));
    const startY = role === 'RECEPTIONIST' ? 8 : 3;

    const newEmp: IEmployeeData = {
      id: 'emp_' + Date.now(),
      name,
      role,
      salaryPerMinute: 15,
      speedMultiplier: 0.65,
      assignedChairIndex,
      state: EmployeeState.IDLE,
      posX: startX,
      posY: startY,
      targetX: startX,
      targetY: startY,
      avatarColor: role === 'RECEPTIONIST' ? '#38bdf8' : (assignedChairIndex === 1 ? '#fbbf24' : '#e879f9'),
      isWalking: false,
      walkAnimPhase: 0,
      level: 1,
      branchIndex: this.state.activeBranchIndex
    };

    this.state.employees.push(newEmp);
    this.eventBus.emit(GameEventType.EMPLOYEE_HIRED, newEmp);
    this.saveState();
  }
}
