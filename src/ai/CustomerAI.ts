import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { CustomerClass, CustomerState, GameEventType } from '../core/Types';

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

  public readonly DOOR_TILE = { x: 15, y: 10 };
  public readonly HAIR_WASH_TILE = { x: 2, y: 4 };

  public waitingSlots: ISeatSlot[] = [
    { x: 2, y: 9, reservedBy: null },
    { x: 5, y: 9, reservedBy: null },
    { x: 8, y: 9, reservedBy: null }
  ];

  // 2 Barber Chair Slots (Chair #1 at 5, 3 and Chair #2 at 8, 3)
  public barberChairSlots: ISeatSlot[] = [
    { x: 5, y: 3, reservedBy: null },
    { x: 8, y: 3, reservedBy: null }
  ];

  public readonly RECEPTION_TILE = { x: 12, y: 6 };

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
    // 1. Clean stale seat reservations
    this.cleanStaleReservations();

    // 2. Strict FIFO Queue Promotion (First-In, First-Out!)
    this.promoteFirstInQueueToFreeChair();

    // 3. Spawn Timer (Accelerated by Marketing Campaign!)
    const targetInterval = this.stateStore.isMarketingActive ? 1.8 : this.spawnIntervalSec;
    this.spawnTimer += deltaSec;
    if (this.spawnTimer >= targetInterval) {
      this.spawnTimer = 0;
      this.trySpawnCustomer();
    }

    // 4. Auto-spawn if salon is completely empty
    if (this.customers.length === 0 && this.spawnTimer > 1.2) {
      this.spawnTimer = 0;
      this.trySpawnCustomer();
    }

    // 5. Update Movement AI for all customers in FORWARD order!
    for (let i = 0; i < this.customers.length; i++) {
      const customer = this.customers[i];
      if (!customer) continue;
      this.updateCustomerAI(customer, deltaSec);

      if (
        customer.state === CustomerState.LEAVING &&
        Math.hypot(customer.posX - this.DOOR_TILE.x, customer.posY - this.DOOR_TILE.y) < 0.6
      ) {
        this.freeCustomerReservations(customer.id);
        this.customers.splice(i, 1);
        i--;
      }
    }
  }

  private cleanStaleReservations(): void {
    const activeWaitingIds = new Set(
      this.customers
        .filter((c) => (c.state === CustomerState.WAITING_IN_QUEUE || c.state === CustomerState.ENTERING) && c.assignedWaitingIndex !== undefined)
        .map((c) => c.id)
    );

    this.waitingSlots.forEach((s) => {
      if (s.reservedBy && !activeWaitingIds.has(s.reservedBy)) {
        s.reservedBy = null;
      }
    });

    const activeChairIds = new Set(
      this.customers
        .filter((c) => (c.state === CustomerState.SEATED || c.state === CustomerState.RECEIVING_SERVICE || c.state === CustomerState.ENTERING) && c.assignedChairIndex !== undefined)
        .map((c) => c.id)
    );

    this.barberChairSlots.forEach((s) => {
      if (s.reservedBy && !activeChairIds.has(s.reservedBy)) {
        s.reservedBy = null;
      }
    });
  }

  // Strict FIFO Promotion: Find the EARLIEST waiting customer (smallest assignedWaitingIndex or oldest spawnTimestamp)
  private promoteFirstInQueueToFreeChair(): void {
    const activeBranch = this.stateStore.getActiveBranch();
    const chairsCount = activeBranch.chairsCount || 1;

    let freeChairIdx = -1;
    for (let i = 0; i < chairsCount; i++) {
      if (this.barberChairSlots[i].reservedBy === null) {
        freeChairIdx = i;
        break;
      }
    }

    if (freeChairIdx === -1) return;

    // Candidates: customers already waiting in queue OR still walking to a waiting slot
    // (ENTERING without a chair assignment). This preserves strict arrival (FIFO) order
    // so an earlier-arrived customer walking to a sofa is never skipped by a later one.
    const waitingCandidates = this.customers.filter(
      (c) =>
        c.state === CustomerState.WAITING_IN_QUEUE ||
        (c.state === CustomerState.ENTERING &&
          c.assignedChairIndex === undefined &&
          c.assignedWaitingIndex !== undefined)
    );

    if (waitingCandidates.length === 0) return;

    // Sort strictly by true arrival time (spawnTimestamp), ties broken by waiting slot index
    waitingCandidates.sort((a, b) => {
      if (a.spawnTimestamp !== b.spawnTimestamp) return a.spawnTimestamp - b.spawnTimestamp;
      const idxA = a.assignedWaitingIndex ?? 999;
      const idxB = b.assignedWaitingIndex ?? 999;
      return idxA - idxB;
    });

    const firstInQueue = waitingCandidates[0];

    // Promote firstInQueue to freeChairIdx!
    if (firstInQueue.assignedWaitingIndex !== undefined) {
      this.waitingSlots[firstInQueue.assignedWaitingIndex].reservedBy = null;
      firstInQueue.assignedWaitingIndex = undefined;
    }

    this.barberChairSlots[freeChairIdx].reservedBy = firstInQueue.id;
    firstInQueue.assignedChairIndex = freeChairIdx;
    firstInQueue.targetX = this.barberChairSlots[freeChairIdx].x;
    firstInQueue.targetY = this.barberChairSlots[freeChairIdx].y;
    firstInQueue.state = CustomerState.ENTERING;
  }

  private trySpawnCustomer(): void {
    const customerAtDoor = this.customers.some(
      (c) => Math.hypot(c.posX - this.DOOR_TILE.x, c.posY - this.DOOR_TILE.y) < 3.2
    );
    if (customerAtDoor) return;

    const activeBranch = this.stateStore.getActiveBranch();
    const chairsCount = activeBranch.chairsCount || 1;

    let freeChairIndex = -1;
    for (let i = 0; i < chairsCount; i++) {
      if (this.barberChairSlots[i].reservedBy === null) {
        freeChairIndex = i;
        break;
      }
    }

    // Only the unlocked waiting sofas of the active branch can host a queue
    const sofasCount = Math.max(1, activeBranch.waitingSofasCount || 1);
    let freeWaitingSlotIndex = -1;
    for (let i = 0; i < sofasCount; i++) {
      if (this.waitingSlots[i] && this.waitingSlots[i].reservedBy === null) {
        freeWaitingSlotIndex = i;
        break;
      }
    }

    if (freeChairIndex === -1 && freeWaitingSlotIndex === -1) {
      return;
    }

    const vipUnlocked = (activeBranch.upgrades?.vip_attractor?.level || 0) >= 1;
    const isVIP = Math.random() < (vipUnlocked ? 0.50 : 0.20);

    const randomName = isVIP
      ? VIP_NAMES[Math.floor(Math.random() * VIP_NAMES.length)]
      : FEMALE_CUSTOMER_NAMES[Math.floor(Math.random() * FEMALE_CUSTOMER_NAMES.length)];

    const randomColor = isVIP ? '#fbbf24' : FEMALE_AVATAR_COLORS[Math.floor(Math.random() * FEMALE_AVATAR_COLORS.length)];

    const randomColorWish = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    const randomCutWish = CUT_OPTIONS[Math.floor(Math.random() * CUT_OPTIONS.length)];
    const randomFinishWish = FINISH_OPTIONS[Math.floor(Math.random() * FINISH_OPTIONS.length)];

    let targetX = 5;
    let targetY = 3;
    let assignedWaitingIdx: number | undefined = undefined;
    let assignedChairIdx: number | undefined = undefined;

    if (freeChairIndex !== -1) {
      assignedChairIdx = freeChairIndex;
      targetX = this.barberChairSlots[freeChairIndex].x;
      targetY = this.barberChairSlots[freeChairIndex].y;
    } else {
      assignedWaitingIdx = freeWaitingSlotIndex;
      targetX = this.waitingSlots[freeWaitingSlotIndex].x;
      targetY = this.waitingSlots[freeWaitingSlotIndex].y;
    }

    const newCustomer: ICustomerNPC = {
      id: 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: randomName,
      customerClass: isVIP ? CustomerClass.VIP : CustomerClass.STANDARD,
      state: CustomerState.ENTERING,
      patience: isVIP ? 85 : 100,
      maxPatience: 100,
      posX: this.DOOR_TILE.x,
      posY: this.DOOR_TILE.y,
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
      spawnTimestamp: Date.now()
    };

    if (assignedChairIdx !== undefined) {
      this.barberChairSlots[assignedChairIdx].reservedBy = newCustomer.id;
    } else if (assignedWaitingIdx !== undefined && this.waitingSlots[assignedWaitingIdx]) {
      this.waitingSlots[assignedWaitingIdx].reservedBy = newCustomer.id;
    }

    this.customers.push(newCustomer);
    this.eventBus.emit(GameEventType.CUSTOMER_SPAWNED, newCustomer);
  }

  private updateCustomerAI(customer: ICustomerNPC, deltaSec: number): void {
    this.moveTowardsTarget(customer, deltaSec);

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
          customer.targetX = this.DOOR_TILE.x;
          customer.targetY = this.DOOR_TILE.y;
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
            let freeChairIdx = 0;
            if (chairsCount > 1 && this.barberChairSlots[1].reservedBy === null) {
              freeChairIdx = 1;
            }

            this.barberChairSlots[freeChairIdx].reservedBy = customer.id;
            customer.assignedChairIndex = freeChairIdx;
            customer.targetX = this.barberChairSlots[freeChairIdx].x;
            customer.targetY = this.barberChairSlots[freeChairIdx].y;
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
          customer.targetX = this.RECEPTION_TILE.x;
          customer.targetY = this.RECEPTION_TILE.y;
          customer.payPatience = customer.maxPayPatience;
        }
        break;

      case CustomerState.PAYING: {
        const atDesk = Math.hypot(customer.posX - this.RECEPTION_TILE.x, customer.posY - this.RECEPTION_TILE.y) < 0.5;
        customer.payPatience = Math.max(0, customer.payPatience - deltaSec * (atDesk ? 3.0 : 1.2));
        if (customer.payPatience <= 0 && atDesk) {
          // Player never collected payment — customer leaves WITHOUT paying (angry review)
          this.freeCustomerReservations(customer.id);
          customer.state = CustomerState.LEAVING;
          customer.targetX = this.DOOR_TILE.x;
          customer.targetY = this.DOOR_TILE.y;
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

    if (customer.assignedChairIndex !== undefined) {
      this.barberChairSlots[customer.assignedChairIndex].reservedBy = null;
      customer.assignedChairIndex = undefined;
    }

    if (qualityRating === 'POOR') {
      customer.earnedAmount = 0;
      this.stateStore.addGoogleReview(
        customer.name,
        1,
        `${customer.wish.color} saç istedim ama tamamen alakasız işlem yapıldı! 😡 ₺0 Bahşiş! 1 Yıldız!`
      );
      this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `😡 ${customer.name} YANLIŞ İŞLEMDEN DOLAYI 1 YILDIZ VERDİ! (₺0 Bahşiş!)`);
    } else {
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

      const activeBranch = this.stateStore.getActiveBranch();
      const chairMultiplier = 1 + ((activeBranch.upgrades?.comfy_chair?.level || 0) * 0.15);
      customer.earnedAmount += Math.floor((basePrice + tip) * chairMultiplier);
    }

    const activeBranch = this.stateStore.getActiveBranch();
    const retailUnlocked = (activeBranch.upgrades?.retail_shelf?.level || 0) >= 1;
    if (retailUnlocked && Math.random() > 0.3 && qualityRating !== 'POOR') {
      customer.state = CustomerState.SHOPPING_RETAIL;
      customer.targetX = 12;
      customer.targetY = 9;
    } else {
      customer.state = CustomerState.PAYING;
      customer.targetX = this.RECEPTION_TILE.x;
      customer.targetY = this.RECEPTION_TILE.y;
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

      customer.state = CustomerState.LEAVING;
      customer.targetX = this.DOOR_TILE.x;
      customer.targetY = this.DOOR_TILE.y;
    }
  }

  private freeCustomerReservations(customerId: string): void {
    this.waitingSlots.forEach((s) => {
      if (s.reservedBy === customerId) s.reservedBy = null;
    });
    this.barberChairSlots.forEach((s) => {
      if (s.reservedBy === customerId) s.reservedBy = null;
    });
  }
}
