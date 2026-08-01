import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { CustomerManager, ICustomerNPC } from './CustomerAI';
import { CustomerState, EmployeeState, GameEventType, IEmployeeData } from '../core/Types';

export class EmployeeManager {
  private static instance: EmployeeManager;
  private stateStore: StateStore;
  private eventBus: EventBus;
  private customerManager: CustomerManager;

  private constructor() {
    this.stateStore = StateStore.getInstance();
    this.eventBus = EventBus.getInstance();
    this.customerManager = CustomerManager.getInstance();
  }

  public static getInstance(): EmployeeManager {
    if (!EmployeeManager.instance) {
      EmployeeManager.instance = new EmployeeManager();
    }
    return EmployeeManager.instance;
  }

  public update(deltaSec: number): void {
    const employees = this.stateStore.getState().employees;
    const customers = this.customerManager.getCustomers();

    employees.forEach((emp) => {
      this.updateEmployeeAI(emp, customers, deltaSec);
    });
  }

  private updateEmployeeAI(emp: IEmployeeData, customers: ICustomerNPC[], deltaSec: number): void {
    this.moveTowardsTarget(emp, deltaSec);

    const bIdx = emp.branchIndex || 0;
    const col = bIdx % 3;
    const row = Math.floor(bIdx / 3);
    const offsetX = col * 30;
    const offsetY = row * 28;
    const bData = this.stateStore.getState().branches?.[bIdx];
    if (bData && bData.constructionEndsTimestamp && Date.now() < bData.constructionEndsTimestamp) {
      emp.state = EmployeeState.IDLE;
      emp.targetX = 1 + offsetX;
      emp.targetY = 1 + offsetY;
      return;
    }

    // If employee is in training, skip automated work until training timer expires
    if (emp.trainingEndsTimestamp) {
      if (Date.now() < emp.trainingEndsTimestamp) {
        emp.state = EmployeeState.TRAINING;
        emp.targetX = 1 + offsetX;
        emp.targetY = 1 + offsetY;
        return;
      } else {
        emp.trainingEndsTimestamp = undefined;
        emp.state = EmployeeState.IDLE;
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🎓 TEBRİKLER! ${emp.name} Seviye ${emp.level} Eğitimi Tamamlandı!`);
      }
    }

    if (emp.role === 'JUNIOR_STYLIST' || emp.role === 'SENIOR_STYLIST') {
      // Automatic Hair Stylist AI Logic (Positioned to the RIGHT of station)
      const homeX = (emp.assignedChairIndex === 1 ? 13 : (emp.assignedChairIndex === 2 ? 18 : 8)) + offsetX;
      const homeY = 3 + offsetY;
      emp.targetX = homeX;
      emp.targetY = homeY;

      const chairIndex = emp.assignedChairIndex;
      const seatedCustomer = customers.find(
        (c) => (c.branchIndex || 0) === bIdx &&
        c.assignedChairIndex === chairIndex && (c.state === CustomerState.SEATED || c.state === CustomerState.RECEIVING_SERVICE)
      );

      if (seatedCustomer) {
        if (seatedCustomer.state === CustomerState.SEATED) {
          seatedCustomer.state = CustomerState.RECEIVING_SERVICE;
          seatedCustomer.haircutProgress = 0;
        }

        if (seatedCustomer.state === CustomerState.RECEIVING_SERVICE) {
          const speedMult = 1.0 + (emp.level - 1) * 0.35;
          // Seviye 1 kuaför hizmet hızı %20 yavaşlatıldı (22 -> 17.6 progress/sn)
          seatedCustomer.haircutProgress = (seatedCustomer.haircutProgress || 0) + deltaSec * 17.6 * speedMult;

          if (seatedCustomer.haircutProgress >= 100) {
            seatedCustomer.haircutProgress = 100;
            this.customerManager.finishHaircut(seatedCustomer, 'GREAT');
          }
        }
      }
    } else if (emp.role === 'RECEPTIONIST') {
      // Automatic Receptionist Cash Collection AI Logic
      emp.targetX = 18 + offsetX;
      emp.targetY = 8 + offsetY;

      const payingCustomer = customers.find(
        (c) => (c.branchIndex || 0) === bIdx && c.state === CustomerState.PAYING
      );
      if (payingCustomer) {
        const distToDesk = Math.hypot(payingCustomer.posX - (18 + offsetX), payingCustomer.posY - (9 + offsetY));
        if (distToDesk < 1.2) {
          // Initialize payment collection progress if not started
          if (payingCustomer.collectProgress === undefined) {
            payingCustomer.collectProgress = 0;
          }

          // Level 1 = 4.0s duration, Level 2 = 3.0s, Level 5 = 1.5s
          const durationSec = Math.max(1.2, 4.5 - emp.level * 0.7);
          payingCustomer.collectProgress += deltaSec * (100 / durationSec);

          if (payingCustomer.collectProgress >= 100) {
            payingCustomer.collectProgress = 100;
            this.customerManager.collectPayment(payingCustomer);
            this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `👩‍💼 ${emp.name} (Kasiyer) +₺${payingCustomer.earnedAmount} Tahsil Etti!`);
          }
        }
      }
    }
  }

  private moveTowardsTarget(emp: IEmployeeData, deltaSec: number): void {
    const dx = emp.targetX - emp.posX;
    const dy = emp.targetY - emp.posY;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.04) {
      emp.posX = emp.targetX;
      emp.posY = emp.targetY;
      emp.isWalking = false;
    } else {
      emp.isWalking = true;
      emp.walkAnimPhase += deltaSec * 14;
      if (emp.walkAnimPhase > Math.PI * 2) emp.walkAnimPhase -= Math.PI * 2;

      const step = 2.4 * deltaSec;
      emp.posX += (dx / dist) * Math.min(step, dist);
      emp.posY += (dy / dist) * Math.min(step, dist);
    }
  }
}
