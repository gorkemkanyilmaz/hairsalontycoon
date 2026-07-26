export enum CustomerState {
  ENTERING = 'ENTERING',
  WAITING_IN_QUEUE = 'WAITING_IN_QUEUE',
  WASHING_HAIR = 'WASHING_HAIR',
  SEATED = 'SEATED',
  RECEIVING_SERVICE = 'RECEIVING_SERVICE',
  SHOPPING_RETAIL = 'SHOPPING_RETAIL',
  PAYING = 'PAYING',
  LEAVING = 'LEAVING'
}

export enum CustomerClass {
  ECONOMY = 'ECONOMY',
  STANDARD = 'STANDARD',
  VIP = 'VIP'
}

export enum EmployeeState {
  IDLE = 'IDLE',
  MOVING_TO_CHAIR = 'MOVING_TO_CHAIR',
  STYLING_HAIR = 'STYLING_HAIR',
  TRAINING = 'TRAINING',
  RESTING = 'RESTING'
}

export interface IEmployeeData {
  id: string;
  name: string;
  role: 'JUNIOR_STYLIST' | 'SENIOR_STYLIST' | 'RECEPTIONIST' | 'WASH_SPECIALIST';
  salaryPerMinute: number;
  speedMultiplier: number;
  assignedChairIndex: number;
  state: EmployeeState;
  posX: number;
  posY: number;
  targetX: number;
  targetY: number;
  avatarColor: string;
  isWalking: boolean;
  walkAnimPhase: number;
  level: number;
  trainingEndsTimestamp?: number;
  branchIndex: number;
}

export interface IGoogleReview {
  id: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  timestamp: number;
}

export enum UpgradeCategory {
  EQUIPMENT = 'EQUIPMENT',
  FURNITURE = 'FURNITURE',
  EMPLOYEE = 'EMPLOYEE',
  RETAIL = 'RETAIL',
  DECOR = 'DECOR',
  PRESTIGE = 'PRESTIGE'
}

export interface IUpgradeNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: UpgradeCategory;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  requiredPlayerLevel: number;
  prerequisiteUpgradeId?: string;
  prerequisiteDescription?: string;
  effects: {
    incomeMultiplier?: number;
    serviceSpeedBonus?: number;
    patienceBonus?: number;
    chairsUnlocked?: number;
    autoServiceEnabled?: boolean;
    autoPaymentEnabled?: boolean;
    retailIncomeBonus?: number;
    hairWashUnlocked?: boolean;
    vipFrequencyMultiplier?: number;
  };
}

export interface ISalonTheme {
  floorStyle: 'ROSE_MARBLE' | 'GOLDEN_QUARTZ' | 'MIDNIGHT_OBSIDIAN';
  wallStyle: 'PASTEL_PINK' | 'ELEGANT_VIOLET' | 'LUXE_GOLD';
}

export interface ISalonState {
  branchIndex: number;
  salonName: string;
  salonLevel: number;
  chairsCount: number;
  chairsOccupied: number;
  queueCapacity: number;
  prestigeMultiplier: number;
  theme: ISalonTheme;
  upgrades: Record<string, IUpgradeNode>;
  // Branch-level unlockable furniture (1 of each by default; rest bought from the canvas salon)
  waitingSofasCount: number;
  barberStationsCount: number;
  constructionEndsTimestamp?: number;
}

export interface IGameState {
  cash: number;
  diamonds: number;
  reputation: number;
  reviews: IGoogleReview[];
  playerLevel: number;
  playerXP: number;
  nextLevelXP: number;
  activeBranchIndex: number;
  branches: ISalonState[];
  employees: IEmployeeData[];
  retailProductsStock: number;
  maxRetailStock: number;
  isFashionEventActive: boolean;
  fashionEventTimerSec: number;
  activeTask: string;
  lastSavedTimestamp: number;
}

export enum GameEventType {
  CASH_CHANGED = 'CASH_CHANGED',
  DIAMONDS_CHANGED = 'DIAMONDS_CHANGED',
  XP_GAINED = 'XP_GAINED',
  LEVEL_UP = 'LEVEL_UP',
  CUSTOMER_SPAWNED = 'CUSTOMER_SPAWNED',
  CUSTOMER_SEATED = 'CUSTOMER_SEATED',
  HAIRCUT_STARTED = 'HAIRCUT_STARTED',
  HAIRCUT_COMPLETED = 'HAIRCUT_COMPLETED',
  RETAIL_PRODUCT_BOUGHT = 'RETAIL_PRODUCT_BOUGHT',
  EMPLOYEE_HIRED = 'EMPLOYEE_HIRED',
  EMPLOYEE_LEVEL_UP = 'EMPLOYEE_LEVEL_UP',
  REVIEW_ADDED = 'REVIEW_ADDED',
  UPGRADE_PURCHASED = 'UPGRADE_PURCHASED',
  FRANCHISE_OPENED = 'FRANCHISE_OPENED',
  BRANCH_SWITCHED = 'BRANCH_SWITCHED',
  FASHION_EVENT_STARTED = 'FASHION_EVENT_STARTED',
  FASHION_EVENT_ENDED = 'FASHION_EVENT_ENDED',
  STOCK_CHANGED = 'STOCK_CHANGED',
  THEME_CHANGED = 'THEME_CHANGED',
  NOTIFICATION_TRIGGERED = 'NOTIFICATION_TRIGGERED',
  STATE_CHANGED = 'STATE_CHANGED'
}
