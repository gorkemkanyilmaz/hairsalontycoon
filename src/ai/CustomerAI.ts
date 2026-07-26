import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { CustomerClass, CustomerState, GameEventType } from '../core/Types';
import { TutorialManager, TutorialStep } from '../ui/TutorialManager';

export interface ICustomerWish {
  color: string;
  cut: string;
  finish: string;
}

export interface ICustomerNPC {
  id: string;
  name: string;
  customerClass: CustomerClass;
  state: CustomerState;
  patience: number;
  maxPatience: number;
  posX: number;
  posY: number;
  targetX: number;
  targetY: number;
  speed: number;
  haircutProgress: number;
  washProgress: number;
  qualityRating?: 'POOR' | 'NORMAL' | 'GREAT' | 'PERFECT';
  earnedAmount: number;
  payPatience: number;
  maxPayPatience: number;
  assignedWaitingIndex?: number;
  assignedChairIndex?: number;
  avatarColor: string;
  hairStyle: 'LONG_WAVY' | 'ELEGANT_BOB' | 'STYLISH_BUN' | 'CURLY_VOLUME';
  wish: ICustomerWish;
  isWalking: boolean;
  walkAnimPhase: number;
  spawnTimestamp: number;
  collectProgress?: number;
  branchIndex?: number;
}

export interface ISeatSlot {
  x: number;
  y: number;
  reservedBy: string | null;
}

const FEMALE_CUSTOMER_NAMES = [
  'Zeynep K.', 'Elif Y.', 'Ayşe T.', 'Merve S.', 'Buse D.',
  'Selin M.', 'Ece C.', 'Gamze K.', 'Melisa B.', 'Damla A.'
];

const VIP_NAMES = [
  '👑 VIP Hande E.', '👑 VIP Serenay S.', '👑 VIP Afra S.', '👑 VIP Demet Ö.', '👑 VIP Eda E.'
];

const FEMALE_AVATAR_COLORS = [
  '#f72585', '#7209b7', '#ff4d6d', '#4cc9f0', '#06d6a0', '#ffb703', '#9d4edd', '#ff758f'
];

export const COLOR_OPTIONS = ['Sarı', 'Platin', 'Esmer', 'Kumral', 'Kızıl'];
export const CUT_OPTIONS = ['Kısa', 'Uzun', 'Kahküllü', 'Bob'];
export const FINISH_OPTIONS = ['Fön', 'Düzleştirme', 'Maşa', 'Bakım Maskesi'];

export class CustomerManager {
  private static instance: CustomerManager;
  private customers: ICustomerNPC[] = [];
  private stateStore: StateStore;
  private eventBus: EventBus;

  private spawnTimer: number = 0;
  private spawnIntervalSec: number = 4.5;
  private waitingSlotsMap: Map<number, ISeatSlot[]> = new Map();
  private barberChairSlotsMap: Map<number, ISeatSlot[]> = new Map();

  private getBranchOffset(bIdx?: number): number {
    const idx = bIdx !== undefined ? bIdx : (this.stateStore.getState().activeBranchIndex || 0);
    return idx * 30;
  }

  public getWaitingSlotsForBranch(bIdx: number): ISeatSlot[] {
    if (!this.waitingSlotsMap.has(bIdx)) {
      const offset = bIdx * 30;
      this.waitingSlotsMap.set(bIdx, [
        { x: 3 + offset, y: 14, reservedBy: null },
        { x: 8 + offset, y: 14, reservedBy: null },
        { x: 13 + offset, y: 14, reservedBy: null }
      ]);
    }
    return this.waitingSlotsMap.get(bIdx)!;
  }

  public getBarberChairSlotsForBranch(bIdx: number): ISeatSlot[] {
    if (!this.barberChairSlotsMap.has(bIdx)) {
      const offset = bIdx * 30;
      this.barberChairSlotsMap.set(bIdx, [
        { x: 7 + offset, y: 4, reservedBy: null },
        { x: 12 + offset, y: 4, reservedBy: null },
        { x: 17 + offset, y: 4, reservedBy: null }
      ]);
    }
    return this.barberChairSlotsMap.get(bIdx)!;
  }

  public getDoorTile(bIdx?: number): { x: number; y: number } {
    return { x: 22 + this.getBranchOffset(bIdx), y: 15 };
  }

  public getReceptionTile(bIdx?: number): { x: number; y: number } {
    return { x: 18 + this.getBranchOffset(bIdx), y: 9 };
  }

  public getWaitingSlotTile(bIdx: number, slotIdx: number): { x: number; y: number } {
    const slots = this.getWaitingSlotsForBranch(bIdx);
    return { x: slots[slotIdx]?.x || (3 + bIdx * 30), y: 14 };
  }

  public getChairSlotTile(bIdx: number, chairIdx: number): { x: number; y: number } {
    const slots = this.getBarberChairSlotsForBranch(bIdx);
    return { x: slots[chairIdx]?.x || (7 + bIdx * 30), y: 4 };
  }

  private constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();
    setTimeout(() => this.trySpawnCustomer(), 400);
  }

  public static getInstance(): CustomerManager {
    if (!CustomerManager.instance) {
      CustomerManager.instance = new CustomerManager();
    }
    return CustomerManager.instance;
  }

  public getCustomers(): ICustomerNPC[] {
    return this.customers;
  }

  public update(deltaSec: number): void {
    const branches = this.stateStore.getState().branches || [this.stateStore.getActiveBranch()];

    branches.forEach((_, bIdx) => this.cleanStaleReservationsForBranch(bIdx));
    branches.forEach((_, bIdx) => this.promoteFirstInQueueToFreeChairForBranch(bIdx));

    const targetInterval = this.stateStore.isMarketingActive ? 1.8 : this.spawnIntervalSec;
    this.spawnTimer += deltaSec;
    if (this.spawnTimer >= targetInterval) {
      this.spawnTimer = 0;
      branches.forEach((_, bIdx) => this.trySpawnCustomerForBranch(bIdx));
    }

    const activeBIdx = this.stateStore.getState().activeBranchIndex || 0;
    const activeBranchCusts = this.customers.filter((c) => (c.branchIndex || 0) === activeBIdx);
    if (activeBranchCusts.length === 0 && this.spawnTimer > 0.8) {
      this.spawnTimer = 0;
      this.trySpawnCustomerForBranch(activeBIdx);
    }

    for (let i = 0; i < this.customers.length; i++) {
      const customer = this.customers[i];
      if (!customer) continue;
      this.updateCustomerAI(customer, deltaSec);

      const doorTile = this.getDoorTile(customer.branchIndex);
      if (
        customer.state === CustomerState.LEAVING &&
        Math.hypot(customer.posX - doorTile.x, customer.posY - doorTile.y) < 0.6
      ) {
        this.freeCustomerReservations(customer.id, customer.branchIndex || 0);
        this.customers.splice(i, 1);
        i--;
      }
    }
  }

  private cleanStaleReservationsForBranch(bIdx: number): void {
    const waitingSlots = this.getWaitingSlotsForBranch(bIdx);
    const chairSlots = this.getBarberChairSlotsForBranch(bIdx);

    const activeWaitingIds = new Set(
      this.customers
        .filter((c) => (c.branchIndex || 0) === bIdx && (c.state === CustomerState.WAITING_IN_QUEUE || c.state === CustomerState.ENTERING) && c.assignedWaitingIndex !== undefined)
        .map((c) => c.id)
    );

    waitingSlots.forEach((s) => {
      if (s.reservedBy && !activeWaitingIds.has(s.reservedBy)) {
        s.reservedBy = null;
      }
    });

    const activeChairIds = new Set(
      this.customers
        .filter((c) => (c.branchIndex || 0) === bIdx && (c.state === CustomerState.SEATED || c.state === CustomerState.RECEIVING_SERVICE || c.state === CustomerState.ENTERING) && c.assignedChairIndex !== undefined)
        .map((c) => c.id)
    );

    chairSlots.forEach((s) => {
      if (s.reservedBy && !activeChairIds.has(s.reservedBy)) {
        s.reservedBy = null;
      }
    });
  }

  private promoteFirstInQueueToFreeChairForBranch(bIdx: number): void {
    const branchData = this.stateStore.getState().branches?.[bIdx] || this.stateStore.getActiveBranch();
    const chairsCount = branchData.chairsCount || 1;
    const chairSlots = this.getBarberChairSlotsForBranch(bIdx);
    const waitingSlots = this.getWaitingSlotsForBranch(bIdx);

    let freeChairIdx = -1;
    for (let i = 0; i < chairsCount; i++) {
      if (chairSlots[i] && chairSlots[i].reservedBy === null) {
        freeChairIdx = i;
        break;
      }
    }

    if (freeChairIdx === -1) return;

    const waitingCandidates = this.customers.filter(
      (c) =>
        (c.branchIndex || 0) === bIdx &&
        (c.state === CustomerState.WAITING_IN_QUEUE ||
        (c.state === CustomerState.ENTERING &&
          c.assignedChairIndex === undefined &&
          c.assignedWaitingIndex !== undefined))
    );

    if (waitingCandidates.length === 0) return;

    waitingCandidates.sort((a, b) => {
      if (a.spawnTimestamp !== b.spawnTimestamp) return a.spawnTimestamp - b.spawnTimestamp;
      return (a.assignedWaitingIndex || 0) - (b.assignedWaitingIndex || 0);
    });

    const firstInQueue = waitingCandidates[0];

    if (firstInQueue.assignedWaitingIndex !== undefined && waitingSlots[firstInQueue.assignedWaitingIndex]) {
      waitingSlots[firstInQueue.assignedWaitingIndex].reservedBy = null;
      firstInQueue.assignedWaitingIndex = undefined;
    }

    const chairTile = this.getChairSlotTile(bIdx, freeChairIdx);
    chairSlots[freeChairIdx].reservedBy = firstInQueue.id;
    firstInQueue.assignedChairIndex = freeChairIdx;
    firstInQueue.targetX = chairTile.x;
    firstInQueue.targetY = chairTile.y;
    firstInQueue.state = CustomerState.ENTERING;
  }

  private trySpawnCustomer(): void {
    const activeBIdx = this.stateStore.getState().activeBranchIndex || 0;
    this.trySpawnCustomerForBranch(activeBIdx);
  }

  private trySpawnCustomerForBranch(bIdx: number): void {
    const doorTile = this.getDoorTile(bIdx);

    const customerAtDoor = this.customers.some(
      (c) => (c.branchIndex || 0) === bIdx && Math.hypot(c.posX - doorTile.x, c.posY - doorTile.y) < 3.2
    );
    if (customerAtDoor) return;

    const branchData = this.stateStore.getState().branches?.[bIdx] || this.stateStore.getActiveBranch();
    const chairsCount = branchData.chairsCount || 1;
    const chairSlots = this.getBarberChairSlotsForBranch(bIdx);
    const waitingSlots = this.getWaitingSlotsForBranch(bIdx);

    let freeChairIndex = -1;
    for (let i = 0; i < chairsCount; i++) {
      if (chairSlots[i] && chairSlots[i].reservedBy === null) {
        freeChairIndex = i;
        break;
      }
    }

    const sofasCount = Math.max(1, branchData.waitingSofasCount || 1);
    let freeWaitingSlotIndex = -1;
    for (let i = 0; i < sofasCount; i++) {
      if (waitingSlots[i] && waitingSlots[i].reservedBy === null) {
        freeWaitingSlotIndex = i;
        break;
      }
    }

    if (freeChairIndex === -1 && freeWaitingSlotIndex === -1) {
      return;
    }

    const vipUnlocked = (branchData.upgrades?.vip_attractor?.level || 0) >= 1;
    const isVIP = Math.random() < (vipUnlocked ? 0.50 : 0.20);

    const randomName = isVIP
      ? VIP_NAMES[Math.floor(Math.random() * VIP_NAMES.length)]
      : FEMALE_CUSTOMER_NAMES[Math.floor(Math.random() * FEMALE_CUSTOMER_NAMES.length)];

    const randomColor = isVIP ? '#fbbf24' : FEMALE_AVATAR_COLORS[Math.floor(Math.random() * FEMALE_AVATAR_COLORS.length)];

    let targetX = 5 + bIdx * 20;
    let targetY = 3;
    let assignedWaitingIdx: number | undefined = undefined;
    let assignedChairIdx: number | undefined = undefined;

    if (freeChairIndex !== -1) {
      assignedChairIdx = freeChairIndex;
      const t = this.getChairSlotTile(bIdx, freeChairIndex);
      targetX = t.x;
      targetY = t.y;
    } else {
      assignedWaitingIdx = freeWaitingSlotIndex;
      const t = this.getWaitingSlotTile(bIdx, freeWaitingSlotIndex);
      targetX = t.x;
      targetY = t.y;
    }

    const randomColorWish = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    const randomCutWish = CUT_OPTIONS[Math.floor(Math.random() * CUT_OPTIONS.length)];
    const randomFinishWish = FINISH_OPTIONS[Math.floor(Math.random() * FINISH_OPTIONS.length)];

    const newCustomer: ICustomerNPC = {
      id: 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: randomName,
      customerClass: isVIP ? CustomerClass.VIP : CustomerClass.STANDARD,
      state: CustomerState.ENTERING,
      patience: isVIP ? 85 : 100,
      maxPatience: 100,
      posX: doorTile.x,
      posY: doorTile.y,
      targetX: targetX,
      targetY: targetY,
      speed: isVIP ? 4.2 : 3.6,
      haircutProgress: 0,
      washProgress: 0,
      earnedAmount: 0,
      payPatience: 0,
      maxPayPatience: 25,
      assignedWaitingIndex: assignedWaitingIdx,
      assignedChairIndex: assignedChairIdx,
      avatarColor: randomColor,
      hairStyle: 'LONG_WAVY',
      wish: {
        color: randomColorWish,
        cut: randomCutWish,
        finish: randomFinishWish
      },
      isWalking: true,
      walkAnimPhase: 0,
      spawnTimestamp: Date.now(),
      branchIndex: bIdx
    };

    if (assignedChairIdx !== undefined) {
      chairSlots[assignedChairIdx].reservedBy = newCustomer.id;
    } else if (assignedWaitingIdx !== undefined && waitingSlots[assignedWaitingIdx]) {
      waitingSlots[assignedWaitingIdx].reservedBy = newCustomer.id;
    }

    this.customers.push(newCustomer);
    this.eventBus.emit(GameEventType.CUSTOMER_SPAWNED, newCustomer);
  }

  private updateCustomerAI(customer: ICustomerNPC, deltaSec: number): void {
    this.moveTowardsTarget(customer, deltaSec);
    const bIdx = customer.branchIndex || 0;
    const doorTile = this.getDoorTile(bIdx);
    const receptionTile = this.getReceptionTile(bIdx);

    switch (customer.state) {
      case CustomerState.ENTERING:
        if (Math.hypot(customer.posX - customer.targetX, customer.posY - customer.targetY) < 0.12) {
          customer.posX = customer.targetX;
          customer.posY = customer.targetY;
          customer.isWalking = false;

          if (customer.assignedChairIndex !== undefined) {
            customer.state = CustomerState.SEATED;
            this.eventBus.emit(GameEventType.CUSTOMER_SEATED, customer);
          } else {
            customer.state = CustomerState.WAITING_IN_QUEUE;
          }
        }
        break;

      case CustomerState.WAITING_IN_QUEUE:
        customer.patience = Math.max(0, customer.patience - deltaSec * 2.5);
        if (customer.patience <= 0) {
          this.freeCustomerReservations(customer.id);
          customer.state = CustomerState.LEAVING;
          customer.targetX = doorTile.x;
          customer.targetY = doorTile.y;
          this.stateStore.addGoogleReview(customer.name, 1, `Çok uzun süre bekletildim! Kimse ilgilenmedi! 😡 1 Yıldız!`);
          this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `${customer.name} sabrı tükendiği için ayrıldı! ⭐ 1 Yıldız Yorum Yaptı!`);
        }
        break;

      case CustomerState.WASHING_HAIR:
        if (Math.hypot(customer.posX - customer.targetX, customer.posY - customer.targetY) < 0.12) {
          customer.washProgress += deltaSec * 45;
          if (customer.washProgress >= 100) {
            customer.washProgress = 100;
            customer.earnedAmount += 30;

            const chairsCount = this.stateStore.getActiveBranch().chairsCount || 1;
            const chairSlotsBranch = this.getBarberChairSlotsForBranch(bIdx);
            let freeChairIdx = 0;
            if (chairsCount > 1 && chairSlotsBranch[1].reservedBy === null) {
              freeChairIdx = 1;
            }

            const chairTile = this.getChairSlotTile(bIdx, freeChairIdx);
            chairSlotsBranch[freeChairIdx].reservedBy = customer.id;
            customer.assignedChairIndex = freeChairIdx;
            customer.targetX = chairTile.x;
            customer.targetY = chairTile.y;
            customer.state = CustomerState.ENTERING;
          }
        }
        break;

      case CustomerState.SEATED:
        break;

      case CustomerState.RECEIVING_SERVICE:
        break;

      case CustomerState.SHOPPING_RETAIL:
        if (Math.hypot(customer.posX - customer.targetX, customer.posY - customer.targetY) < 0.12) {
          customer.earnedAmount += 50;

          customer.state = CustomerState.PAYING;
          customer.targetX = receptionTile.x;
          customer.targetY = receptionTile.y;
          customer.payPatience = customer.maxPayPatience;
        }
        break;

      case CustomerState.PAYING: {
        const atDesk = Math.hypot(customer.posX - receptionTile.x, customer.posY - receptionTile.y) < 0.5;
        customer.payPatience = Math.max(0, customer.payPatience - deltaSec * (atDesk ? 3.0 : 1.2));
        if (customer.payPatience <= 0 && atDesk) {
          this.freeCustomerReservations(customer.id);
          customer.state = CustomerState.LEAVING;
          customer.targetX = doorTile.x;
          customer.targetY = doorTile.y;
          this.stateStore.addGoogleReview(
            customer.name,
            1,
            `Kasada ödeme için çok bekletildim, ödeme bile almadan ayrıldım! Rezalet! 😡 1 Yıldız!`
          );
          this.eventBus.emit(
            GameEventType.NOTIFICATION_TRIGGERED,
            `😠 ${customer.name} kasada çok bekledi, ÖDEMEDEN AYRILDI! ⭐ 1 Yıldız!`
          );
        }
        break;
      }

      case CustomerState.LEAVING:
        break;
    }
  }

  private moveTowardsTarget(customer: ICustomerNPC, deltaSec: number): void {
    const dx = customer.targetX - customer.posX;
    const dy = customer.targetY - customer.posY;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      customer.posX = customer.targetX;
      customer.posY = customer.targetY;
      customer.isWalking = false;
    } else {
      customer.isWalking = true;
      customer.walkAnimPhase += deltaSec * 16;
      if (customer.walkAnimPhase > Math.PI * 2) customer.walkAnimPhase -= Math.PI * 2;

      const step = customer.speed * deltaSec;
      customer.posX += (dx / dist) * Math.min(step, dist);
      customer.posY += (dy / dist) * Math.min(step, dist);
    }
  }

  public finishHaircut(customer: ICustomerNPC, qualityRating: 'POOR' | 'NORMAL' | 'GREAT' | 'PERFECT' = 'GREAT'): void {
    customer.qualityRating = qualityRating;
    const bIdx = customer.branchIndex || 0;
    const receptionTile = this.getReceptionTile(bIdx);
    const chairSlots = this.getBarberChairSlotsForBranch(bIdx);

    if (customer.assignedChairIndex !== undefined && chairSlots[customer.assignedChairIndex]) {
      chairSlots[customer.assignedChairIndex].reservedBy = null;
      customer.assignedChairIndex = undefined;
    }

    const hasShampoo = this.stateStore.consumeShampooStock();

    if (!hasShampoo || qualityRating === 'POOR') {
      customer.earnedAmount = 0;
      customer.qualityRating = 'POOR';
      const reason = !hasShampoo ? 'Salonda hiç şampuan kalmamıştı! Saçımı yıkayamadılar!' : `${customer.wish.color} saç istedim ama tamamen alakasız işlem yapıldı!`;
      this.stateStore.addGoogleReview(customer.name, 1, `${reason} 😡 ₺0 Bahşiş! 1 Yıldız!`);
      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `😡 ${customer.name} KÖTÜ DENEYİMDEN DOLAYI 1 YILDIZ VERDİ! (₺0 Bahşiş!)`);
    } else {
      // Transformation Sparkle Hair Color Change!
      if (customer.wish.color.includes('Platin')) customer.avatarColor = '#fef08a';
      else if (customer.wish.color.includes('Gül')) customer.avatarColor = '#f472b6';
      else if (customer.wish.color.includes('Karamel')) customer.avatarColor = '#f59e0b';
      else if (customer.wish.color.includes('Çikolata')) customer.avatarColor = '#78350f';

      let basePrice = customer.customerClass === CustomerClass.VIP ? 120 : 35;
      let tip = customer.customerClass === CustomerClass.VIP ? 60 : 15;

      if (qualityRating === 'GREAT') tip += 15;
      if (qualityRating === 'PERFECT') {
        tip += 35;
        this.stateStore.addGoogleReview(
          customer.name,
          5,
          `Harika kuaför salonu! ${customer.wish.color} saç stilim mükemmel oldu! ⭐⭐⭐⭐⭐`
        );
      }

      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `✨ PARLAMA EFEKTİ! ${customer.name} tam istediği ${customer.wish.color} saç rengine kavuştu!`);

      const activeBranch = this.stateStore.getActiveBranch();
      const chairMultiplier = 1 + ((activeBranch.upgrades?.comfy_chair?.level || 0) * 0.15);
      customer.earnedAmount += Math.floor((basePrice + tip) * chairMultiplier);
    }

    const activeBranch = this.stateStore.getActiveBranch();
    const retailUnlocked = (activeBranch.upgrades?.retail_shelf?.level || 0) >= 1;
    if (retailUnlocked && Math.random() > 0.3 && qualityRating !== 'POOR') {
      customer.state = CustomerState.SHOPPING_RETAIL;
      customer.targetX = 18 + bIdx * 30;
      customer.targetY = 14;
    } else {
      customer.state = CustomerState.PAYING;
      customer.targetX = receptionTile.x;
      customer.targetY = receptionTile.y;
      customer.payPatience = customer.maxPayPatience;
    }

    this.eventBus.emit(GameEventType.HAIRCUT_COMPLETED, customer);
  }

  public collectPayment(customer: ICustomerNPC): void {
    if (customer.state === CustomerState.PAYING) {
      if (customer.earnedAmount > 0) {
        this.stateStore.addCash(customer.earnedAmount);
        this.stateStore.addXP(customer.customerClass === CustomerClass.VIP ? 60 : 20);
      }

      const bIdx = customer.branchIndex || 0;
      const doorTile = this.getDoorTile(bIdx);
      customer.state = CustomerState.LEAVING;
      customer.targetX = doorTile.x;
      customer.targetY = doorTile.y;
    }
  }

  private freeCustomerReservations(customerId: string, bIdx: number = 0): void {
    const waitingSlots = this.getWaitingSlotsForBranch(bIdx);
    const chairSlots = this.getBarberChairSlotsForBranch(bIdx);

    waitingSlots.forEach((s) => {
      if (s.reservedBy === customerId) s.reservedBy = null;
    });
    chairSlots.forEach((s) => {
      if (s.reservedBy === customerId) s.reservedBy = null;
    });
  }
}
