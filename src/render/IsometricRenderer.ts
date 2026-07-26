import { StateStore } from '../core/StateStore';
import { EventBus } from '../core/EventBus';
import { CustomerManager, ICustomerNPC } from '../ai/CustomerAI';
import { CustomerState, CustomerClass, GameEventType } from '../core/Types';
import { SpriteManager } from './SpriteManager';
import { TutorialManager } from '../ui/TutorialManager';

export interface IIsoPoint {
  x: number;
  y: number;
}

export interface IRenderableEntity {
  gridX: number;
  gridY: number;
  sortKey: number;
  draw: (ctx: CanvasRenderingContext2D, renderer: IsometricRenderer) => void;
}

export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stateStore: StateStore;
  private eventBus: EventBus;

  // 24x18 Luxury Commercial Salon Grid (1.5x Spacious Grid Expansion)
  private gridWidth: number = 24;
  private gridHeight: number = 18;
  private tileWidth: number = 72;
  private tileHeight: number = 36;

  // Camera Transform & Mobile Responsive Zoom
  private zoom: number = 0.78;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  // Mobile Pinch Zoom & Touch Drag Tracking
  private isTouchDragging: boolean = false;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private initialPinchDist: number = 0;
  private initialZoom: number = 0.78;
  private touchTapTime: number = 0;
  private touchMoved: boolean = false;
  private touchStartClientX: number = 0;
  private touchStartClientY: number = 0;

  private hoveredGridPos: IIsoPoint | null = null;

  // Horizontal tile spacing between salon branches (so 2nd salon walls don't overlap)
  private readonly BRANCH_SPACING = 30;

  constructor(containerId: string) {
    // Listen for Branch Switched event to auto-center camera on active salon branch
    this.stateStore = StateStore.getInstance();
    EventBus.getInstance().on(GameEventType.BRANCH_SWITCHED, (branchIdx: number) => {
      this.centerCameraOnBranch(branchIdx);
    });
    this.eventBus = EventBus.getInstance();

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(this.canvas);
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 200);
    });

    this.setupMouseInteractions();
    this.setupTouchInteractions();
    this.centerCamera();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    // Mobile Responsive Auto-Fit Zoom Adjustment
    // Fit the whole salon isometric footprint (~88% of screen width) so nothing overlaps
    // and tapping stays accurate on small phones like iPhone 14 Pro.
    if (window.innerWidth < 600) {
      const isoWidth = (this.gridWidth + this.gridHeight) * (this.tileWidth / 2);
      const targetW = window.innerWidth * 0.88;
      this.zoom = Math.max(0.30, Math.min(0.60, targetW / isoWidth));
    } else {
      this.zoom = 0.78;
    }

    this.centerCamera();
  }

  public centerCamera(): void {
    if (isNaN(this.zoom) || !isFinite(this.zoom) || this.zoom <= 0) {
      this.zoom = window.innerWidth < 600 ? 0.42 : 0.78;
    }

    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    this.centerCameraOnBranch(activeBranchIdx);
  }

  public centerCameraOnBranch(branchIdx: number): void {
    if (isNaN(this.zoom) || !isFinite(this.zoom) || this.zoom <= 0) {
      this.zoom = window.innerWidth < 600 ? 0.42 : 0.78;
    }

    const branchOffsetX = branchIdx * this.BRANCH_SPACING;
    const centerGridX = (this.gridWidth - 1) / 2 + branchOffsetX;
    const centerGridY = (this.gridHeight - 1) / 2;

    const isoCenterX = (centerGridX - centerGridY) * (this.tileWidth / 2);
    const isoCenterY = (centerGridX + centerGridY) * (this.tileHeight / 2);

    this.offsetX = (window.innerWidth / 2) - (isoCenterX * this.zoom);
    this.offsetY = (window.innerHeight / 2) - (isoCenterY * this.zoom) + 90 * this.zoom;
    this.render();
  }

  private clampCamera(): void {
    if (isNaN(this.zoom) || !isFinite(this.zoom) || this.zoom <= 0) {
      this.zoom = window.innerWidth < 600 ? 0.42 : 0.78;
    }
    this.zoom = Math.max(0.40, Math.min(2.0, this.zoom));

    const centerGridX = (this.gridWidth - 1) / 2;
    const centerGridY = (this.gridHeight - 1) / 2;

    const isoCenterX = (centerGridX - centerGridY) * (this.tileWidth / 2);
    const isoCenterY = (centerGridX + centerGridY) * (this.tileHeight / 2);

    const targetCenterX = (window.innerWidth / 2) - (isoCenterX * this.zoom);
    const targetCenterY = (window.innerHeight / 2) - (isoCenterY * this.zoom) + 90 * this.zoom;

    const branchCount = Math.max(1, this.stateStore.getState().branches ? this.stateStore.getState().branches.length : 1);
    const rightmostOffset = (branchCount - 1) * (1920 * this.zoom / 2);

    const minOffsetX = targetCenterX - rightmostOffset - 1200 * this.zoom;
    const maxOffsetX = targetCenterX + 800 * this.zoom;

    this.offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, this.offsetX));
    this.offsetY = Math.max(targetCenterY - 800 * this.zoom, Math.min(targetCenterY + 800 * this.zoom, this.offsetY));
  }

  public zoomIn(): void {
    this.zoom = Math.min(this.zoom + 0.15, 2.0);
    this.clampCamera();
    this.render();
  }

  public zoomOut(): void {
    this.zoom = Math.max(this.zoom - 0.15, 0.40);
    this.clampCamera();
    this.render();
  }

  public gridToScreen(gx: number, gy: number): IIsoPoint {
    const isoX = (gx - gy) * (this.tileWidth / 2);
    const isoY = (gx + gy) * (this.tileHeight / 2);

    return {
      x: this.offsetX + isoX * this.zoom,
      y: this.offsetY + isoY * this.zoom
    };
  }

  public screenToGrid(screenX: number, screenY: number): IIsoPoint {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const relX = x - this.offsetX;
    const relY = y - this.offsetY;

    const scaledTileWidth = this.tileWidth * this.zoom;
    const scaledTileHeight = this.tileHeight * this.zoom;

    const isoX = relX / (scaledTileWidth / 2);
    const isoY = relY / (scaledTileHeight / 2);

    const gridX = (isoY + isoX) / 2;
    const gridY = (isoY - isoX) / 2;

    return { x: gridX, y: gridY };
  }

  // Get customer under screen click point (includes body AND "Saçımı yapın!" speech bubble)
  public getCustomerAtScreenPoint(screenX: number, screenY: number): ICustomerNPC | null {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = screenX - rect.left;
    const clickY = screenY - rect.top;

    const customers = CustomerManager.getInstance().getCustomers();

    for (let i = customers.length - 1; i >= 0; i--) {
      const c = customers[i];
      const p = this.gridToScreen(c.posX, c.posY);

      // Customer body center point & speech bubble center point
      const bodyX = p.x;
      const bodyY = p.y - 35 * this.zoom;
      const bubbleY = p.y - 100 * this.zoom;

      const distBody = Math.hypot(clickX - bodyX, clickY - bodyY);
      const distBubble = Math.hypot(clickX - bodyX, clickY - bubbleY);

      const hitRadius = Math.max(55, 75 * this.zoom);

      if (distBody <= hitRadius || distBubble <= hitRadius) {
        return c;
      }
    }
    return null;
  }

  private setupMouseInteractions(): void {
    let mouseDownX = 0;
    let mouseDownY = 0;
    let isMouseDown = false;

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isMouseDown = true;
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown || e.buttons !== 1) {
        isMouseDown = false;
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
      } else {
        const moveDist = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY);
        if (moveDist > 6) { // Only drag if moved more than 6px
          this.isDragging = true;
          this.canvas.style.cursor = 'grabbing';
          this.offsetX = e.clientX - this.dragStartX;
          this.offsetY = e.clientY - this.dragStartY;
          this.clampCamera();
          this.render();
        }
      }

      if (!this.isDragging) {
        const gridPos = this.screenToGrid(e.clientX, e.clientY);
        this.hoveredGridPos = gridPos;

        const isNearChair = Math.abs(gridPos.x - 5) <= 1 && Math.abs(gridPos.y - 3) <= 1;
        const isNearDesk = Math.abs(gridPos.x - 12) <= 1 && Math.abs(gridPos.y - 6) <= 1;

        if (isNearChair || isNearDesk) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'grab';
        }
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
      setTimeout(() => { this.isDragging = false; }, 50);
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      isMouseDown = false;
      this.isDragging = false;
    });

    window.addEventListener('blur', () => {
      isMouseDown = false;
      this.isDragging = false;
      this.isTouchDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) this.zoomIn();
      else this.zoomOut();
    });

    this.canvas.addEventListener('click', (e) => {
      const moveDist = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY);
      if (moveDist < 8) { // Clean click
        const gridPos = this.screenToGrid(e.clientX, e.clientY);
        this.eventBus.emit('CANVAS_CLICKED', gridPos, e.clientX, e.clientY);
      }
    });
  }

  // Mobile Touch Interactions
  private setupTouchInteractions(): void {
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.touchTapTime = Date.now();
      this.touchMoved = false;

      if (e.touches.length === 1) {
        this.isTouchDragging = true;
        this.touchStartX = e.touches[0].clientX - this.offsetX;
        this.touchStartY = e.touches[0].clientY - this.offsetY;
        this.touchStartClientX = e.touches[0].clientX;
        this.touchStartClientY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isTouchDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        this.initialZoom = this.zoom;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1 && this.isTouchDragging) {
        const moveDist = Math.hypot(e.touches[0].clientX - this.touchStartClientX, e.touches[0].clientY - this.touchStartClientY);
        if (moveDist > 8) {
          this.touchMoved = true;
        }
        this.offsetX = e.touches[0].clientX - this.touchStartX;
        this.offsetY = e.touches[0].clientY - this.touchStartY;
        this.clampCamera();
        this.render();
      } else if (e.touches.length === 2 && this.initialPinchDist > 0) {
        this.touchMoved = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (currentDist > 0 && this.initialPinchDist > 0) {
          const pinchScale = currentDist / this.initialPinchDist;
          this.zoom = Math.max(0.40, Math.min(2.0, this.initialZoom * pinchScale));
          this.clampCamera();
          this.render();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      const tapDuration = Date.now() - this.touchTapTime;

      if (e.changedTouches.length === 1 && tapDuration < 350 && !this.touchMoved) {
        const touch = e.changedTouches[0];
        const gridPos = this.screenToGrid(touch.clientX, touch.clientY);
        this.eventBus.emit('CANVAS_CLICKED', gridPos, touch.clientX, touch.clientY);
      }

      if (e.touches.length === 0) {
        this.isTouchDragging = false;
        this.initialPinchDist = 0;
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      this.isTouchDragging = false;
      this.initialPinchDist = 0;
    });
  }

  public render(): void {
    try {
      const dpr = window.devicePixelRatio || 1;
      this.ctx.save();
      this.ctx.scale(dpr, dpr);

      // Pure Lush Green Grass Backdrop (Zero Black Void!)
      this.ctx.fillStyle = '#1c3a26';
      this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Draw the world environment around the salon (grass, sidewalk, road) for All Branches
      this.drawEnvironmentGround();

      // 2. Draw Pastel Marble Floor Tiles for All Branches
      this.drawFloorGrid();

      // 2. Draw Soft Pastel Walls & Realistic Art Paintings for All Branches
      this.drawWalls();

      // 3. Build Unified Render Queue & Sort by Z-Index Depth (gx + gy)
      this.drawDepthSortedWorld();

      this.ctx.restore();
    } catch (err) {
      console.error('IsometricRenderer render exception:', err);
    }
  }

  // Flat isometric diamond ground tile (used for surroundings: grass/sidewalk/road)
  private drawFlatTile(gx: number, gy: number, fill: string, stroke?: string): void {
    const p = this.gridToScreen(gx, gy);
    const hw = (this.tileWidth * this.zoom) / 2;
    const hh = (this.tileHeight * this.zoom) / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y - hh);
    this.ctx.lineTo(p.x + hw, p.y);
    this.ctx.lineTo(p.x, p.y + hh);
    this.ctx.lineTo(p.x - hw, p.y);
    this.ctx.closePath();
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    if (stroke) {
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = 0.6 * this.zoom;
      this.ctx.stroke();
    }
  }

  // Draw pure lush green grass ground around the salon interior
  private drawEnvironmentGround(): void {
    const state = this.stateStore.getState();
    const branches = state.branches ? state.branches.length : 1;

    const minGX = -35;
    const maxGX = (branches - 1) * this.BRANCH_SPACING + this.gridWidth + 35;
    const minGY = -30;
    const maxGY = 45;

    const isSalonInterior = (gx: number, gy: number): boolean => {
      for (let b = 0; b < branches; b++) {
        const off = b * this.BRANCH_SPACING;
        const lx = gx - off;
        if (lx >= 0 && lx < this.gridWidth && gy >= 0 && gy < this.gridHeight) return true;
      }
      return false;
    };

    const grassA = '#1c3a26';
    const grassB = '#1a3524';

    // Pure green grass background everywhere outside the salon interior
    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        if (isSalonInterior(gx, gy)) continue;
        const fill = (gx + gy) % 2 === 0 ? grassA : grassB;
        this.drawFlatTile(gx, gy, fill);
      }
    }
  }

  private addEnvironmentEntities(entities: IRenderableEntity[]): void {
    // Pure green grass environment — no street lamps or road clutter
  }

  private drawStreetLamp(p: IIsoPoint): void {
    const z = this.zoom;
    const poleH = 70 * z;
    this.ctx.save();
    // base
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(p.x - 2 * z, p.y - 12 * z, 4 * z, 12 * z);
    // pole
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillRect(p.x - 1.6 * z, p.y - 12 * z - poleH, 3.2 * z, poleH);
    // lamp head
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y - 12 * z - poleH - 2 * z, 6 * z, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fde68a';
    this.ctx.fill();
    // glow
    const glow = this.ctx.createRadialGradient(p.x, p.y - 12 * z - poleH, 1, p.x, p.y - 12 * z - poleH, 26 * z);
    glow.addColorStop(0, 'rgba(253, 230, 138, 0.45)');
    glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y - 12 * z - poleH, 26 * z, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawStreetBench(p: IIsoPoint): void {
    const z = this.zoom;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(p.x, p.y + 2 * z, 22 * z, 8 * z, 0, 0, Math.PI * 2);
    this.ctx.fill();
    // seat (wood plank)
    this.ctx.fillStyle = '#92400e';
    this.ctx.fillRect(p.x - 20 * z, p.y - 16 * z, 40 * z, 8 * z);
    this.ctx.fillStyle = '#b45309';
    this.ctx.fillRect(p.x - 20 * z, p.y - 18 * z, 40 * z, 4 * z);
    // legs
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(p.x - 18 * z, p.y - 8 * z, 4 * z, 10 * z);
    this.ctx.fillRect(p.x + 14 * z, p.y - 8 * z, 4 * z, 10 * z);
    // backrest
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(p.x - 20 * z, p.y - 34 * z, 40 * z, 4 * z);
    this.ctx.fillStyle = '#78350f';
    this.ctx.fillRect(p.x - 14 * z, p.y - 34 * z, 4 * z, 18 * z);
    this.ctx.fillRect(p.x + 10 * z, p.y - 34 * z, 4 * z, 18 * z);
    this.ctx.restore();
  }

// Green "+" floating badge shown above locked/purchasable furniture slots on the salon canvas
  private drawLockedBadge(x: number, y: number, label: string): void {
    const z = this.zoom;
    this.ctx.save();
    const pillW = Math.max(54 * z, this.ctx.measureText(label).width + 18 * z);
    const pillH = 18 * z;
    const px = x - pillW / 2;
    const py = y - pillH / 2;

    // bobbing animation based on time for attention
    const bob = Math.sin(Date.now() / 380) * 2 * z;
    this.ctx.translate(0, bob);

    this.ctx.fillStyle = 'rgba(6, 214, 160, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pillW, pillH, 99);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.6 * z;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${11 * z}px Outfit, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, py + pillH / 2 + 1 * z);
    this.ctx.restore();
  }

  // Large High-Contrast Training Badge Pill shown above employees on training
  private drawTrainingPill(x: number, y: number, remainingSec: number): void {
    const z = this.zoom;
    this.ctx.save();

    const text1 = `🎓 EĞİTİMDE (${remainingSec}s)`;
    const text2 = `⚡ 10💎 HIZLANDIR`;

    this.ctx.font = `bold ${Math.max(12, 13 * z)}px Outfit, sans-serif`;
    const w1 = this.ctx.measureText(text1).width;
    const w2 = this.ctx.measureText(text2).width;
    const pillW = Math.max(140 * z, Math.max(w1, w2) + 24 * z);
    const pillH = 42 * z;
    const px = x - pillW / 2;
    const py = y - pillH / 2;

    // Bobbing animation for attention
    const bob = Math.sin(Date.now() / 300) * 3 * z;
    this.ctx.translate(0, bob);

    // Dark high-contrast rounded background with gold border
    this.ctx.fillStyle = 'rgba(15, 10, 30, 0.96)';
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pillW, pillH, 12 * z);
    this.ctx.fill();

    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 2.5 * z;
    this.ctx.stroke();

    // Line 1: Training status with remaining seconds
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text1, x, py + 5 * z);

    // Line 2: Speedup hint pill
    this.ctx.fillStyle = '#10b981';
    this.ctx.fillText(text2, x, py + 22 * z);

    this.ctx.restore();
  }

  private drawFloorGrid(): void {
    const spriteMgr = SpriteManager.getInstance();
    const state = this.stateStore.getState();
    const isFashionEvent = state.isFashionEventActive;
    const branches = state.branches ? state.branches.length : 1;

    for (let b = 0; b < branches; b++) {
      const offsetX = b * this.BRANCH_SPACING; // 17 tiles horizontal shift for 2nd branch!

      for (let x = 0; x < this.gridWidth; x++) {
        for (let y = 0; y < this.gridHeight; y++) {
          const p = this.gridToScreen(x + offsetX, y);
          const isAlt = (x + y) % 2 === 0;
          const tileSprite = spriteMgr.getParquetTileSprite(isAlt, this.zoom);
          this.ctx.drawImage(tileSprite, p.x - tileSprite.width / 2, p.y);

          // Red Carpet Runway on Tile y === 6 during Fashion Week Gala!
          if (isFashionEvent && x >= 4 && x <= 15 && y === 6) {
            const hw = (this.tileHeight * this.zoom) / 2;
            const fw = (this.tileWidth * this.zoom) / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x + fw, p.y + hw);
            this.ctx.lineTo(p.x, p.y + hw * 2);
            this.ctx.lineTo(p.x - fw, p.y + hw);
            this.ctx.closePath();

            this.ctx.fillStyle = 'rgba(239, 71, 111, 0.85)';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fbbf24';
            this.ctx.lineWidth = 2 * this.zoom;
            this.ctx.stroke();
          }
        }
      }

      // Draw Branch Banner Marquee for Branch #2
      if (b >= 1) {
        const bp = this.gridToScreen(8 + offsetX, 1);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = `bold ${Math.round(14 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`🏰 Nişantaşı Lüks Şube #${b + 1} (+%${b * 50} Kazanç)`, bp.x, bp.y - 120 * this.zoom);
      }
    }
  }

  private drawWalls(): void {
    const state = this.stateStore.getState();
    const branches = state.branches ? state.branches.length : 1;
    const wallHeight = 145 * this.zoom;

    for (let b = 0; b < branches; b++) {
      const offsetX = b * this.BRANCH_SPACING;

      const pTopLeft = this.gridToScreen(0 + offsetX, 0);
      const pBottomLeft = this.gridToScreen(0 + offsetX, this.gridHeight);

      // Left Wall
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pBottomLeft.x, pBottomLeft.y - wallHeight);
      this.ctx.lineTo(pBottomLeft.x, pBottomLeft.y);
      this.ctx.closePath();

      const wallGradLeft = this.ctx.createLinearGradient(pTopLeft.x, pTopLeft.y - wallHeight, pBottomLeft.x, pBottomLeft.y);
      wallGradLeft.addColorStop(0, '#581c87');
      wallGradLeft.addColorStop(0.6, '#3b0764');
      wallGradLeft.addColorStop(1, '#2e1065');
      this.ctx.fillStyle = wallGradLeft;
      this.ctx.fill();
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      const pBottomRight = this.gridToScreen(this.gridWidth + offsetX, 0);

      // Right Wall
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pBottomRight.x, pBottomRight.y - wallHeight);
      this.ctx.lineTo(pBottomRight.x, pBottomRight.y);
      this.ctx.closePath();

      const wallGradRight = this.ctx.createLinearGradient(pTopLeft.x, pTopLeft.y - wallHeight, pBottomRight.x, pBottomRight.y);
      wallGradRight.addColorStop(0, '#6b21a8');
      wallGradRight.addColorStop(0.6, '#4c1d95');
      wallGradRight.addColorStop(1, '#3b0764');
      this.ctx.fillStyle = wallGradRight;
      this.ctx.fill();
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Gold Moldings
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pBottomLeft.x, pBottomLeft.y - wallHeight);
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 3 * this.zoom;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pBottomRight.x, pBottomRight.y - wallHeight);
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 3 * this.zoom;
      this.ctx.stroke();

      // Paintings on Wall
      this.drawRealisticWallPainting(0 + offsetX, 4, 'LEFT_WALL');
      this.drawRealisticWallPainting(3 + offsetX, 0, 'RIGHT_WALL_1');
      this.drawRealisticWallPainting(9 + offsetX, 0, 'RIGHT_WALL_2');
    }
  }

  private drawRealisticWallPainting(gx: number, gy: number, type: 'LEFT_WALL' | 'RIGHT_WALL_1' | 'RIGHT_WALL_2'): void {
    const p = this.gridToScreen(gx, gy);
    const artW = 50 * this.zoom;
    const artH = 40 * this.zoom;
    const artY = p.y - 100 * this.zoom;

    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillRect(p.x - artW / 2, artY - artH / 2, artW, artH);
    this.ctx.strokeStyle = '#d97706';
    this.ctx.lineWidth = 2 * this.zoom;
    this.ctx.strokeRect(p.x - artW / 2, artY - artH / 2, artW, artH);

    this.ctx.fillStyle = '#fce7f3';
    this.ctx.fillRect(p.x - artW / 2 + 3, artY - artH / 2 + 3, artW - 6, artH - 6);

    if (type === 'LEFT_WALL') {
      this.ctx.fillStyle = '#f472b6';
      this.ctx.beginPath();
      this.ctx.arc(p.x, artY - 2 * this.zoom, 12 * this.zoom, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#831843';
      this.ctx.lineWidth = 2 * this.zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - 8 * this.zoom, artY - 10 * this.zoom);
      this.ctx.quadraticCurveTo(p.x + 4 * this.zoom, artY - 6 * this.zoom, p.x + 2 * this.zoom, artY + 2 * this.zoom);
      this.ctx.quadraticCurveTo(p.x + 8 * this.zoom, artY + 4 * this.zoom, p.x - 2 * this.zoom, artY + 12 * this.zoom);
      this.ctx.stroke();
    } else if (type === 'RIGHT_WALL_1') {
      this.ctx.fillStyle = '#fbcfe8';
      this.ctx.fillRect(p.x - artW / 2 + 3, artY - artH / 2 + 3, artW - 6, artH - 6);

      this.ctx.fillStyle = '#10b981';
      [-8, 0, 8].forEach((ox) => {
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + ox * this.zoom, artY, 5 * this.zoom, 12 * this.zoom, Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.fillStyle = '#f72585';
      this.ctx.beginPath();
      this.ctx.arc(p.x, artY - 4 * this.zoom, 7 * this.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = '#fae8ff';
      this.ctx.fillRect(p.x - artW / 2 + 3, artY - artH / 2 + 3, artW - 6, artH - 6);

      this.ctx.fillStyle = '#e11d48';
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, artY + 4 * this.zoom, 10 * this.zoom, 4 * this.zoom, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#0f172a';
      this.ctx.lineWidth = 2 * this.zoom;
      this.ctx.beginPath();
      this.ctx.arc(p.x - 6 * this.zoom, artY - 6 * this.zoom, 5 * this.zoom, Math.PI, Math.PI * 2);
      this.ctx.arc(p.x + 6 * this.zoom, artY - 6 * this.zoom, 5 * this.zoom, Math.PI, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawDepthSortedWorld(): void {
    const spriteMgr = SpriteManager.getInstance();
    const customerMgr = CustomerManager.getInstance();
    const entities: IRenderableEntity[] = [];

    // Environment props (trees, lamps, vacant lots, bench, parked car) around the salon
    this.addEnvironmentEntities(entities);

    const branches = this.stateStore.getState().branches || [this.stateStore.getActiveBranch()];

    // Loop through ALL open branches to render furniture, doors, equipment & poles at offset!
    branches.forEach((bData, bIdx) => {
      const offsetX = bIdx * 30;

      // Plants Decor for Branch bIdx
      entities.push({
        gridX: 1 + offsetX, gridY: 1, sortKey: 1 + offsetX + 1,
        draw: (ctx) => {
          const p = this.gridToScreen(1 + offsetX, 1);
          const plantSprite = spriteMgr.getPottedPlantSprite('MONSTERA', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      entities.push({
        gridX: 22 + offsetX, gridY: 2, sortKey: 22 + offsetX + 2,
        draw: (ctx) => {
          const p = this.gridToScreen(22 + offsetX, 2);
          const plantSprite = spriteMgr.getPottedPlantSprite('GOLDEN_PALM', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      entities.push({
        gridX: 10 + offsetX, gridY: 14, sortKey: 10 + offsetX + 14,
        draw: (ctx) => {
          const p = this.gridToScreen(10 + offsetX, 14);
          const plantSprite = spriteMgr.getPottedPlantSprite('ROSE_VASE', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      // Sofas for Branch bIdx
      const sofasCount = bData.waitingSofasCount || 1;
      const sofaTiles = [{ x: 3 + offsetX, y: 14 }, { x: 8 + offsetX, y: 14 }, { x: 13 + offsetX, y: 14 }];
      sofaTiles.forEach((tile, idx) => {
        const isActive = idx < sofasCount;
        entities.push({
          gridX: tile.x, gridY: tile.y, sortKey: tile.x + tile.y,
          draw: (ctx) => {
            const p = this.gridToScreen(tile.x, tile.y);
            const sofaSprite = spriteMgr.getWaitingSofaSprite(this.zoom);
            const drawY = p.y - sofaSprite.height + 15 * this.zoom;
            if (isActive) {
              ctx.drawImage(sofaSprite, p.x - sofaSprite.width / 2, drawY);
            } else {
              ctx.save();
              ctx.globalAlpha = 0.35;
              ctx.drawImage(sofaSprite, p.x - sofaSprite.width / 2, drawY);
              ctx.restore();
              this.drawLockedBadge(p.x, drawY + 6 * this.zoom, '🛋️ +₺800');
            }
          }
        });
      });

      // Mirror Station #1 for Branch bIdx
      entities.push({
        gridX: 7 + offsetX, gridY: 3, sortKey: 7 + offsetX + 3 - 0.1,
        draw: (ctx) => {
          const p = this.gridToScreen(7 + offsetX, 3);
          const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
          ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
        }
      });

      // Barber Chair #1 for Branch bIdx
      entities.push({
        gridX: 7 + offsetX, gridY: 4, sortKey: 7 + offsetX + 4,
        draw: (ctx) => {
          const p = this.gridToScreen(7 + offsetX, 4);
          const chairSprite = spriteMgr.getBarberChairSprite(this.zoom);
          ctx.drawImage(chairSprite, p.x - chairSprite.width / 2, p.y - chairSprite.height + 25 * this.zoom);
        }
      });

      // 3D Warehouse Cargo Box Shelf at (21 + offsetX, 3) (Far top-right corner to prevent overlap with Station 3)
      entities.push({
        gridX: 21 + offsetX, gridY: 3, sortKey: 21 + offsetX + 3,
        draw: (ctx) => {
          const p = this.gridToScreen(21 + offsetX, 3);
          const shelfSprite = spriteMgr.getWarehouseShelfSprite(this.zoom);
          ctx.drawImage(shelfSprite, p.x - shelfSprite.width / 2, p.y - shelfSprite.height + 15 * this.zoom);
        }
      });

      // 3D Hair Wash Basin Station at (2 + offsetX, 7) (if unlocked)
      const washUnlocked = (bData.upgrades?.hair_wash_station?.level || 0) >= 1;
      if (washUnlocked) {
        entities.push({
          gridX: 2 + offsetX, gridY: 7, sortKey: 2 + offsetX + 7,
          draw: (ctx) => {
            const p = this.gridToScreen(2 + offsetX, 7);
            const washSprite = spriteMgr.getHairWashStationSprite(this.zoom);
            ctx.drawImage(washSprite, p.x - washSprite.width / 2, p.y - washSprite.height + 15 * this.zoom);
          }
        });
      }

      // 2nd Barber Station & Chair #2 at (12 + offsetX, 3)/(12 + offsetX, 4)
      const stationsCount = bData.barberStationsCount || 1;
      const stationTile = { x: 12 + offsetX, y: 3 };
      const chairTile = { x: 12 + offsetX, y: 4 };

      entities.push({
        gridX: stationTile.x, gridY: stationTile.y, sortKey: stationTile.x + stationTile.y - 0.1,
        draw: (ctx) => {
          const p = this.gridToScreen(stationTile.x, stationTile.y);
          if (stationsCount >= 2) {
            const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
            ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.3;
            const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
            ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
            ctx.restore();
            this.drawLockedBadge(p.x, p.y - stationSprite.height + 14 * this.zoom, '✂️ +₺2,000');
          }
        }
      });

      entities.push({
        gridX: chairTile.x, gridY: chairTile.y, sortKey: chairTile.x + chairTile.y,
        draw: (ctx) => {
          const p = this.gridToScreen(chairTile.x, chairTile.y);
          if (stationsCount >= 2) {
            const chairSprite = spriteMgr.getBarberChairSprite(this.zoom);
            ctx.drawImage(chairSprite, p.x - chairSprite.width / 2, p.y - chairSprite.height + 25 * this.zoom);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.3;
            const chairSprite = spriteMgr.getBarberChairSprite(this.zoom);
            ctx.drawImage(chairSprite, p.x - chairSprite.width / 2, p.y - chairSprite.height + 25 * this.zoom);
            ctx.restore();
          }
        }
      });

      // 3rd Barber Station & Chair #3 (👰 Gelin Saçı) at (17 + offsetX, 3)/(17 + offsetX, 4)
      const station3Tile = { x: 17 + offsetX, y: 3 };
      const chair3Tile = { x: 17 + offsetX, y: 4 };

      entities.push({
        gridX: station3Tile.x, gridY: station3Tile.y, sortKey: station3Tile.x + station3Tile.y - 0.1,
        draw: (ctx) => {
          const p = this.gridToScreen(station3Tile.x, station3Tile.y);
          if (stationsCount >= 3) {
            const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
            ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.25;
            const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
            ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
            ctx.restore();
            this.drawLockedBadge(p.x, p.y - stationSprite.height + 14 * this.zoom, '👰 Salon Büyüt (₺8,000)');
          }
        }
      });

      entities.push({
        gridX: chair3Tile.x, gridY: chair3Tile.y, sortKey: chair3Tile.x + chair3Tile.y,
        draw: (ctx) => {
          const p = this.gridToScreen(chair3Tile.x, chair3Tile.y);
          if (stationsCount >= 3) {
            const chairSprite = spriteMgr.getBarberChairSprite(this.zoom);
            ctx.drawImage(chairSprite, p.x - chairSprite.width / 2, p.y - chairSprite.height + 25 * this.zoom);
          }
        }
      });

      // 3D Retail Display Shelf at (18 + offsetX, 14) (if unlocked)
      const retailUnlocked = (bData.upgrades?.retail_shelf?.level || 0) >= 1;
      if (retailUnlocked) {
        entities.push({
          gridX: 18 + offsetX, gridY: 14, sortKey: 18 + offsetX + 14,
          draw: (ctx) => {
            const p = this.gridToScreen(18 + offsetX, 14);
            const shelfSprite = spriteMgr.getRetailShelfSprite(this.zoom);
            ctx.drawImage(shelfSprite, p.x - shelfSprite.width / 2, p.y - shelfSprite.height + 15 * this.zoom);
          }
        });
      }

      // Reception Desk for Branch bIdx at (18 + offsetX, 9)
      entities.push({
        gridX: 18 + offsetX, gridY: 9, sortKey: 18 + offsetX + 9,
        draw: (ctx) => {
          const p = this.gridToScreen(18 + offsetX, 9);
          const deskSprite = spriteMgr.getReceptionDeskSprite(this.zoom);
          ctx.drawImage(deskSprite, p.x - deskSprite.width / 2, p.y - deskSprite.height + 15 * this.zoom);
        }
      });

      // Barber Pole for Branch bIdx at (22 + offsetX, 15)
      entities.push({
        gridX: 22 + offsetX, gridY: 15, sortKey: 22 + offsetX + 15,
        draw: (ctx) => {
          const p = this.gridToScreen(22 + offsetX, 15);
          this.drawBarberPole(p.x, p.y);
        }
      });
    });

    // 4. Hired Employee NPCs (Stylists & Receptionist)
    const employees = this.stateStore.getState().employees;
    employees.forEach((emp) => {
      const renderX = emp.posX;
      entities.push({
        gridX: renderX, gridY: emp.posY, sortKey: renderX + emp.posY + 0.04,
        draw: (ctx) => {
          const p = this.gridToScreen(renderX, emp.posY);
          const empSprite = spriteMgr.getStylistEmployeeSprite(emp.avatarColor, emp.isWalking, emp.walkAnimPhase, this.zoom);
          ctx.drawImage(empSprite, p.x - empSprite.width / 2, p.y - empSprite.height + 12 * this.zoom);

          // Employee Badge Pill with role icon
          const roleIcon = emp.role === 'RECEPTIONIST' ? '👩‍💼' : '👩‍🎨';
          this.drawNameBadgePill(`${roleIcon} ${emp.name}`, p.x, p.y + 22 * this.zoom);

          // Dynamic floating countdown badge above employee head during training!
          if (emp.trainingEndsTimestamp && emp.trainingEndsTimestamp > Date.now()) {
            const remainingSec = Math.max(1, Math.ceil((emp.trainingEndsTimestamp - Date.now()) / 1000));
            this.drawTrainingPill(p.x, p.y - 85 * this.zoom, remainingSec);
          }
        }
      });
    });

    // Customers
    customerMgr.getCustomers().forEach((cust: ICustomerNPC) => {
      entities.push({
        gridX: cust.posX, gridY: cust.posY, sortKey: cust.posX + cust.posY + 0.05,
        draw: (ctx) => {
          const p = this.gridToScreen(cust.posX, cust.posY);

          const custSprite = spriteMgr.getCustomerAnimFrame(
            cust.avatarColor,
            cust.isWalking,
            cust.walkAnimPhase,
            this.zoom,
            cust.appliedHairColor
          );
          ctx.drawImage(custSprite, p.x - custSprite.width / 2, p.y - custSprite.height + 12 * this.zoom);

          // Name Badge Pill (Golden Pill for VIPs)
          if (cust.customerClass === CustomerClass.VIP) {
            this.drawNameBadgePill(`👑 ${cust.name}`, p.x, p.y + 22 * this.zoom, '#fbbf24');
          } else {
            this.drawNameBadgePill(cust.name, p.x, p.y + 22 * this.zoom);
          }

          const baseHeadY = p.y - 78 * this.zoom;

          // Draw Glowing VIP Crown Halo above VIP head
          if (cust.customerClass === CustomerClass.VIP) {
            ctx.font = `${18 * this.zoom}px sans-serif`;
            ctx.fillText('👑', p.x, baseHeadY - 4 * this.zoom);
          }      if (cust.state === CustomerState.SEATED) {
            ctx.font = `${26 * this.zoom}px sans-serif`;
            ctx.fillText('✂️', p.x, baseHeadY - 20 * this.zoom);
            this.drawSpeechBubble(p.x, baseHeadY - 50 * this.zoom, '✂️ Saçımı yapın!');
          } else if (cust.state === CustomerState.RECEIVING_SERVICE) {
            const circleY = baseHeadY - 26 * this.zoom;
            ctx.beginPath();
            ctx.arc(p.x, circleY, 11 * this.zoom, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 3 * this.zoom;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(
              p.x, circleY, 11 * this.zoom,
              -Math.PI / 2,
              -Math.PI / 2 + (Math.PI * 2 * cust.haircutProgress) / 100
            );
            ctx.strokeStyle = '#06d6a0';
            ctx.lineWidth = 3 * this.zoom;
            ctx.stroke();
          } else if (cust.state === CustomerState.PAYING) {
            ctx.font = `${30 * this.zoom}px sans-serif`;
            ctx.fillText('💵', p.x, baseHeadY - 22 * this.zoom);

            // Payment patience bar (time left to collect before customer leaves unpaid)
            const barW = 38 * this.zoom;
            const barH = 7 * this.zoom;
            const barY = baseHeadY - 26 * this.zoom;
            const ratio = cust.maxPayPatience > 0 ? cust.payPatience / cust.maxPayPatience : 1;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(p.x - barW / 2, barY, barW, barH);
            ctx.fillStyle = ratio > 0.5 ? '#06d6a0' : ratio > 0.25 ? '#ffb703' : '#ef476f';
            ctx.fillRect(p.x - barW / 2, barY, barW * ratio, barH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x - barW / 2, barY, barW, barH);

            if (ratio < 0.25) {
              this.drawSpeechBubble(p.x, barY - 22 * this.zoom, '😠 Ödememi alın yoksa gidiyorum!');
            } else {
              this.drawSpeechBubble(p.x, baseHeadY - 52 * this.zoom, '💵 Ödeme Hazır!');
            }
          } else if (cust.state === CustomerState.WAITING_IN_QUEUE) {
            const barW = 38 * this.zoom;
            const barH = 7 * this.zoom;
            const barY = baseHeadY - 26 * this.zoom;
            const pRatio = cust.patience / cust.maxPatience;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(p.x - barW / 2, barY, barW, barH);

            ctx.fillStyle = pRatio > 0.5 ? '#06d6a0' : pRatio > 0.25 ? '#ffb703' : '#ef476f';
            ctx.fillRect(p.x - barW / 2, barY, barW * pRatio, barH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x - barW / 2, barY, barW, barH);

let bubbleText = '';
            if (pRatio < 0.20) {
              bubbleText = '🤬 Bu nasıl işletme! Ben gidiyorum!';
            } else if (pRatio < 0.45) {
              bubbleText = '😠 Çok yavaş! Sıra ne zaman gelecek?';
            } else if (pRatio < 0.70) {
              bubbleText = '⏳ Sıkıldım, biraz acele edin...';
            }

            if (bubbleText) {
              this.drawSpeechBubble(p.x, barY - 22 * this.zoom, bubbleText);
            }
          }
        }
      });
    });

    entities.sort((a, b) => a.sortKey - b.sortKey);
    entities.forEach((ent) => ent.draw(this.ctx, this));

    // Update Pulsing Tutorial Spotlight Ring position every frame!
    TutorialManager.getInstance().positionSpotlightForStep(this);
  }

  private drawNameBadgePill(name: string, x: number, y: number, borderColor: string = '#f472b6'): void {
    this.ctx.save();
    this.ctx.font = `bold ${10 * this.zoom}px sans-serif`;
    const textW = this.ctx.measureText(name).width;
    const padX = 8 * this.zoom;
    const padY = 4 * this.zoom;
    const pw = textW + padX * 2;
    const ph = 14 * this.zoom + padY;

    const px = x - pw / 2;
    const py = y - ph / 2;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pw, ph, 99);
    this.ctx.fill();
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1.5 * this.zoom;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, x, py + ph - 4 * this.zoom);
    this.ctx.restore();
  }

  private drawSpeechBubble(x: number, y: number, text: string): void {
    this.ctx.save();
    this.ctx.font = `bold ${10 * this.zoom}px sans-serif`;
    const textWidth = this.ctx.measureText(text).width;
    const paddingX = 10 * this.zoom;
    const paddingY = 6 * this.zoom;
    const bw = textWidth + paddingX * 2;
    const bh = 18 * this.zoom + paddingY;

    const bx = x - bw / 2;
    const by = y - bh;

    this.ctx.fillStyle = 'rgba(18, 12, 28, 0.92)';
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bw, bh, 8 * this.zoom);
    this.ctx.fill();
    this.ctx.strokeStyle = '#f472b6';
    this.ctx.lineWidth = 1.5 * this.zoom;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x - 5 * this.zoom, by + bh);
    this.ctx.lineTo(x, by + bh + 5 * this.zoom);
    this.ctx.lineTo(x + 5 * this.zoom, by + bh);
    this.ctx.closePath();
    this.ctx.fillStyle = '#f472b6';
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, by + bh - 6 * this.zoom);
    this.ctx.restore();
  }

  private drawBarberPole(x: number, y: number): void {
    const poleWidth = 16 * this.zoom;
    const poleHeight = 50 * this.zoom;

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
    this.ctx.strokeStyle = '#ef476f';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);

    this.ctx.beginPath();
    this.ctx.arc(x, y - poleHeight - 8 * this.zoom, 10 * this.zoom, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffb703';
    this.ctx.fill();
  }
}
