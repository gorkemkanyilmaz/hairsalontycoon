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

    // If employee is in training, skip work until training timer expires
    if (emp.trainingEndsTimestamp) {
      if (Date.now() < emp.trainingEndsTimestamp) {
        emp.state = EmployeeState.TRAINING;
        const branchOffset = (emp.branchIndex || 0) * 30;
        emp.targetX = 1 + branchOffset;
        emp.targetY = 1;

        // Clear any seated customer at emp's assigned chair so chair is empty!
        if (emp.assignedChairIndex !== undefined) {
          const seatedCustomer = customers.find(
            (c) => (c.branchIndex || 0) === (emp.branchIndex || 0) &&
            c.assignedChairIndex === emp.assignedChairIndex && (c.state === CustomerState.SEATED || c.state === CustomerState.RECEIVING_SERVICE)
          );
          if (seatedCustomer) {
            this.customerManager.finishHaircut(seatedCustomer, 'GREAT');
          }
        }
        return;
      } else {
        emp.trainingEndsTimestamp = undefined;
        emp.state = EmployeeState.IDLE;
        this.eventBus.emit(GameEventType.NOTIFICATION_TRIGGERED, `🎓 TEBRİKLER! ${emp.name} Seviye ${emp.level} Eğitimi Tamamlandı!`);
      }
    }

    const branchOffset = (emp.branchIndex || 0) * 30;

    if (emp.role === 'JUNIOR_STYLIST' || emp.role === 'SENIOR_STYLIST') {
      // Automatic Hair Stylist AI Logic
      const homeX = (emp.assignedChairIndex === 1 ? 12 : (emp.assignedChairIndex === 2 ? 17 : 7)) + branchOffset;
      const homeY = 3;
      emp.targetX = homeX;
      emp.targetY = homeY;

      const chairIndex = emp.assignedChairIndex;
      const seatedCustomer = customers.find(
        (c) => (c.branchIndex || 0) === (emp.branchIndex || 0) &&
        c.assignedChairIndex === chairIndex && (c.state === CustomerState.SEATED || c.state === CustomerState.RECEIVING_SERVICE)
      );

      if (seatedCustomer) {
        if (seatedCustomer.state === CustomerState.SEATED) {
          seatedCustomer.state = CustomerState.RECEIVING_SERVICE;
          seatedCustomer.haircutProgress = 0;
          this.eventBus.emit(GameEventType.HAIRCUT_STARTED, seatedCustomer);
        } else if (seatedCustomer.state === CustomerState.RECEIVING_SERVICE) {
          const activeBranch = this.stateStore.getActiveBranch();
          const speedBonus = 1.0 + ((activeBranch.upgrades?.quick_scissors?.level || 0) * 0.10);
          const baseRate = 4.0 + (emp.level || 1) * 2.5; // Level 1 = 6.5, Level 5 = 16.5
          seatedCustomer.haircutProgress += deltaSec * baseRate * emp.speedMultiplier * speedBonus;

          if (seatedCustomer.haircutProgress >= 100) {
            seatedCustomer.haircutProgress = 100;
            this.customerManager.finishHaircut(seatedCustomer, 'GREAT');
          }
        }
      }
    } else if (emp.role === 'RECEPTIONIST') {
      // Automatic Receptionist Cash Collection AI Logic
      emp.targetX = 18 + branchOffset;
      emp.targetY = 8;

      const payingCustomer = customers.find(
        (c) => (c.branchIndex || 0) === (emp.branchIndex || 0) && c.state === CustomerState.PAYING
      );
      if (payingCustomer) {
        const distToDesk = Math.hypot(payingCustomer.posX - (18 + branchOffset), payingCustomer.posY - 9);
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
