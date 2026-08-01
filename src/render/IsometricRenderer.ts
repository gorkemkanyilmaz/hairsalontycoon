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

import grassTileUrl from '../../assets/grass_tile.png';

export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stateStore: StateStore;
  private eventBus: EventBus;
  private grassTileImg: HTMLImageElement | null = null;

  // 24x18 Luxury Commercial Salon Grid (1.5x Spacious Grid Expansion)
  private gridWidth: number = 24;
  private gridHeight: number = 18;
  private tileWidth: number = 56;
  private tileHeight: number = 38;

  // Camera Transform & Mobile Responsive Zoom
  private zoom: number = 0.85;
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
  private initialZoom: number = 0.85;
  private touchTapTime: number = 0;
  private touchMoved: boolean = false;
  private touchStartClientX: number = 0;
  private touchStartClientY: number = 0;

  private hoveredGridPos: IIsoPoint | null = null;

  // Horizontal tile spacing between salon branches (30 tiles shift per branch)
  private readonly BRANCH_SPACING = 30;

  constructor(containerId: string) {
    this.stateStore = StateStore.getInstance();
    EventBus.getInstance().on(GameEventType.BRANCH_SWITCHED, (branchIdx: number) => {
      this.centerCameraOnBranch(branchIdx);
    });
    this.eventBus = EventBus.getInstance();

    const gImg = new Image();
    gImg.src = grassTileUrl;
    gImg.onload = () => {
      this.grassTileImg = gImg;
    };

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

  public calculateOptimalZoom(): number {
    if (window.innerWidth < 600) {
      // Isometric room bounding dimensions for a 24x18 tile room
      // Isometric room width = (gridWidth + gridHeight) * (tileWidth / 2) = (24 + 18) * 32 = 1344px
      // Isometric room height = (gridWidth + gridHeight) * (tileHeight / 2) + 120 = 792px
      const isoRoomW = (this.gridWidth + this.gridHeight) * (this.tileWidth / 2);
      const isoRoomH = (this.gridWidth + this.gridHeight) * (this.tileHeight / 2) + 120;

      // Mobile portrait safe padding: width 94%, available height innerHeight - 160px (top HUD + bottom action buttons)
      const availableW = window.innerWidth * 0.94;
      const availableH = Math.max(320, window.innerHeight - 160);

      const fitZoomW = availableW / isoRoomW;
      const fitZoomH = availableH / isoRoomH;

      return Math.max(0.22, Math.min(0.70, Math.min(fitZoomW, fitZoomH)));
    } else {
      return 0.85;
    }
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    this.zoom = this.calculateOptimalZoom();
    this.centerCamera();
  }

  public centerCamera(): void {
    if (isNaN(this.zoom) || !isFinite(this.zoom) || this.zoom <= 0) {
      this.zoom = this.calculateOptimalZoom();
    }

    const activeBranchIdx = this.stateStore.getState().activeBranchIndex || 0;
    this.centerCameraOnBranch(activeBranchIdx);
  }

  public centerCameraOnBranch(branchIdx: number): void {
    this.zoom = this.calculateOptimalZoom();

    const col = branchIdx % 3;
    const row = Math.floor(branchIdx / 3);
    const branchOffsetX = col * 30;
    const branchOffsetY = row * 28;

    const roomCenterX = (branchOffsetX + this.gridWidth / 2) * this.tileWidth * this.zoom;
    const roomCenterY = (branchOffsetY + this.gridHeight / 2) * this.tileHeight * this.zoom;

    this.offsetX = (window.innerWidth / 2) - roomCenterX;
    this.offsetY = (window.innerHeight / 2) - roomCenterY + 15 * this.zoom;
    this.render();
  }

  public zoomAt(newZoom: number, focusX: number = window.innerWidth / 2, focusY: number = window.innerHeight / 2): void {
    const oldZoom = this.zoom;
    const minZ = window.innerWidth < 600 ? 0.18 : 0.08;
    const clampedZoom = Math.max(minZ, Math.min(2.5, newZoom));
    if (clampedZoom === oldZoom) return;

    const zoomRatio = clampedZoom / oldZoom;
    this.offsetX = focusX - (focusX - this.offsetX) * zoomRatio;
    this.offsetY = focusY - (focusY - this.offsetY) * zoomRatio;

    this.zoom = clampedZoom;
    this.clampCamera();
    this.render();
  }

  private clampCamera(): void {
    if (isNaN(this.zoom) || !isFinite(this.zoom) || this.zoom <= 0) {
      this.zoom = this.calculateOptimalZoom();
    }
    const minZ = window.innerWidth < 600 ? 0.18 : 0.08;
    this.zoom = Math.max(minZ, Math.min(2.5, this.zoom));

    const branchCount = Math.max(1, this.stateStore.getState().branches ? this.stateStore.getState().branches.length : 1);
    const colsCount = Math.min(branchCount, 3);
    const rowsCount = Math.ceil(branchCount / 3);

    const totalWorldWidth = (colsCount * 30 + 10) * this.tileWidth * this.zoom;
    const totalWorldHeight = (rowsCount * 28 + 10) * this.tileHeight * this.zoom;

    const minOffsetX = window.innerWidth - totalWorldWidth - 500;
    const maxOffsetX = 500;

    this.offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, this.offsetX));
    this.offsetY = Math.max(-1000 - totalWorldHeight, Math.min(window.innerHeight + 500, this.offsetY));
  }

  public get zoomLevel(): number {
    return this.zoom;
  }

  public zoomIn(): void {
    this.zoomAt(this.zoom * 1.25);
  }

  public zoomOut(): void {
    this.zoomAt(this.zoom * 0.75);
  }

  public gridToScreen(gx: number, gy: number): IIsoPoint {
    return {
      x: this.offsetX + gx * this.tileWidth * this.zoom,
      y: this.offsetY + gy * this.tileHeight * this.zoom
    };
  }

  public getCanvasBoundingClientRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  public screenToGrid(screenX: number, screenY: number): IIsoPoint {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const gridX = (x - this.offsetX) / (this.tileWidth * this.zoom);
    const gridY = (y - this.offsetY) / (this.tileHeight * this.zoom);

    return { x: gridX, y: gridY };
  }

  public getCustomerAtScreenPoint(screenX: number, screenY: number): ICustomerNPC | null {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = screenX - rect.left;
    const clickY = screenY - rect.top;

    const customers = CustomerManager.getInstance().getCustomers();

    for (let i = customers.length - 1; i >= 0; i--) {
      const c = customers[i];
      const p = this.gridToScreen(c.posX, c.posY);

      const bodyX = p.x + (this.tileWidth / 2) * this.zoom;
      const bodyY = p.y + (this.tileHeight / 2) * this.zoom;
      const bubbleY = p.y - 45 * this.zoom;

      const distBody = Math.hypot(clickX - bodyX, clickY - bodyY);
      const distBubble = Math.hypot(clickX - bodyX, clickY - bubbleY);

      const hitRadius = Math.max(25, 38 * this.zoom);

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
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoomAt(this.zoom * zoomFactor, e.clientX, e.clientY);
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
          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          this.zoomAt(this.initialZoom * pinchScale, midX, midY);
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
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

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

  // Draw floral green grass ground texture around the salon interior
  private drawEnvironmentGround(): void {
    const state = this.stateStore.getState();
    const branches = state.branches ? state.branches.length : 1;
    const colsCount = Math.min(branches, 3);
    const rowsCount = Math.ceil(branches / 3);

    const minGX = -35;
    const maxGX = colsCount * 30 + 35;
    const minGY = -30;
    const maxGY = rowsCount * 28 + 35;

    const isSalonInterior = (gx: number, gy: number): boolean => {
      for (let b = 0; b < branches; b++) {
        const col = b % 3;
        const row = Math.floor(b / 3);
        const offX = col * 30;
        const offY = row * 28;
        const lx = gx - offX;
        const ly = gy - offY;
        if (lx >= 0 && lx < this.gridWidth && ly >= 0 && ly < this.gridHeight) return true;
      }
      return false;
    };

    const grassA = '#1c3a26';
    const grassB = '#1a3524';
    const tw = Math.max(2, Math.round(this.tileWidth * this.zoom));
    const th = Math.max(2, Math.round(this.tileHeight * this.zoom));

    const useImg = this.grassTileImg && this.grassTileImg.complete && this.grassTileImg.naturalWidth > 0;
    const imgW = useImg ? this.grassTileImg!.naturalWidth : 0;
    const imgH = useImg ? this.grassTileImg!.naturalHeight : 0;
    // Map 1 texture repeat over 6x6 tile blocks so flowers are 6x larger & clearly visible at normal zoom
    const tilesPerRepeat = 6;
    const srcW = imgW / tilesPerRepeat;
    const srcH = imgH / tilesPerRepeat;

    // Floral grass background everywhere outside the salon interior
    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        if (isSalonInterior(gx, gy)) continue;

        if (useImg) {
          const p = this.gridToScreen(gx, gy);
          const tileX = (gx % tilesPerRepeat + tilesPerRepeat) % tilesPerRepeat;
          const tileY = (gy % tilesPerRepeat + tilesPerRepeat) % tilesPerRepeat;
          const sx = tileX * srcW;
          const sy = tileY * srcH;
          this.ctx.drawImage(this.grassTileImg!, sx, sy, srcW, srcH, p.x, p.y, tw + 0.8, th + 0.8);
        } else {
          const fill = (gx + gy) % 2 === 0 ? grassA : grassB;
          this.drawFlatTile(gx, gy, fill);
        }
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

    // Dynamic, crisp font scaling that remains large and readable even at low zoom levels
    const fontSize1 = Math.max(15, Math.round(17 * z));
    const fontSize2 = Math.max(13, Math.round(14 * z));

    this.ctx.font = `900 ${fontSize1}px 'Outfit', sans-serif`;
    const w1 = this.ctx.measureText(text1).width;
    this.ctx.font = `800 ${fontSize2}px 'Outfit', sans-serif`;
    const w2 = this.ctx.measureText(text2).width;

    const maxTextW = Math.max(w1, w2);
    const pillW = maxTextW + 28;
    const pillH = fontSize1 + fontSize2 + 18;
    const px = x - pillW / 2;
    const py = y - pillH / 2;

    // Bobbing animation for attention
    const bob = Math.sin(Date.now() / 300) * 3;
    this.ctx.translate(0, bob);

    // High contrast drop shadow for extreme legibility over background graphics
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    this.ctx.shadowBlur = 12;

    // Dark rich background with rounded corners and gold border
    this.ctx.fillStyle = 'rgba(12, 8, 24, 0.96)';
    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pillW, pillH, 12);
    this.ctx.fill();

    this.ctx.shadowBlur = 0; // Turn off drop shadow for text rendering
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Line 1: Training status with remaining seconds
    this.ctx.font = `900 ${fontSize1}px 'Outfit', sans-serif`;
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text1, x, py + 7);

    // Line 2: Speedup hint button label
    this.ctx.font = `800 ${fontSize2}px 'Outfit', sans-serif`;
    this.ctx.fillStyle = '#34d399';
    this.ctx.fillText(text2, x, py + 9 + fontSize1);

    this.ctx.restore();
  }

  private drawFloorGrid(): void {
    const spriteMgr = SpriteManager.getInstance();
    const state = this.stateStore.getState();
    const isFashionEvent = state.isFashionEventActive;
    const branches = state.branches ? state.branches.length : 1;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    for (let b = 0; b < branches; b++) {
      const col = b % 3;
      const row = Math.floor(b / 3);
      const offsetX = col * 30;
      const offsetY = row * 28;

      // Branch Frustum Culling Check
      const pTop = this.gridToScreen(offsetX, offsetY);
      const pBottom = this.gridToScreen(offsetX + 24, offsetY + 18);
      const minX = Math.min(pTop.x, pBottom.x) - 250 * this.zoom;
      const maxX = Math.max(pTop.x, pBottom.x) + 250 * this.zoom;
      const minY = Math.min(pTop.y, pBottom.y) - 250 * this.zoom;
      const maxY = Math.max(pTop.y, pBottom.y) + 250 * this.zoom;

      if (maxX < 0 || minX > canvasW || maxY < 0 || minY > canvasH) {
        continue; // Skip offscreen branch
      }

      for (let x = 0; x < this.gridWidth; x++) {
        for (let y = 0; y < this.gridHeight; y++) {
          const p = this.gridToScreen(x + offsetX, y + offsetY);

          // Culling check for high performance
          if (p.x + 60 * this.zoom < 0 || p.x > canvasW || p.y + 40 * this.zoom < 0 || p.y > canvasH) {
            continue;
          }

          const isAlt = (x + y) % 2 === 0;
          const tileSprite = spriteMgr.getParquetTileSprite(isAlt, this.zoom, x, y);
          const tw = Math.max(2, Math.round(this.tileWidth * this.zoom));
          const th = Math.max(2, Math.round(this.tileHeight * this.zoom));
          this.ctx.drawImage(tileSprite, p.x, p.y, tw + 0.8, th + 0.8);

          // Red Carpet Runway on Tile y === 6 during Fashion Week Gala!
          if (isFashionEvent && x >= 4 && x <= 15 && y === 6) {
            this.ctx.fillStyle = 'rgba(239, 71, 111, 0.85)';
            this.ctx.fillRect(p.x, p.y, this.tileWidth * this.zoom, this.tileHeight * this.zoom);
            this.ctx.strokeStyle = '#fbbf24';
            this.ctx.lineWidth = 2 * this.zoom;
            this.ctx.strokeRect(p.x, p.y, this.tileWidth * this.zoom, this.tileHeight * this.zoom);
          }
        }
      }

      // Draw Branch Banner Marquee for Branch #2, #3, #4...
      const bp = this.gridToScreen(12 + offsetX, 0 + offsetY);
      if (bp.x > -200 && bp.x < canvasW + 200) {
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = `bold ${Math.round(14 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`🏰 Şube #${b + 1}: ${state.branches[b]?.salonName || 'Lüks Kuaför'} (+%${b * 50} Kazanç)`, bp.x, bp.y - 120 * this.zoom);
      }

      // Dynamic Construction Banner & Diamond Speedup Pill (HUGE & PROMINENT COVER)
      const bData = state.branches[b];
      if (bData && bData.constructionEndsTimestamp && Date.now() < bData.constructionEndsTimestamp) {
        const remainingSec = Math.max(0, Math.ceil((bData.constructionEndsTimestamp - Date.now()) / 1000));
        const neededDiamonds = Math.max(1, Math.ceil((remainingSec / 3600) * 50));
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}s ${mins % 60}dk` : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const cp = this.gridToScreen(12 + offsetX, 8 + offsetY);
        const bw = 560 * this.zoom;
        const bh = 210 * this.zoom;
        const bx = cp.x - bw / 2;
        const by = cp.y - bh / 2 - 20 * this.zoom;

        this.ctx.save();
        // Drop shadow for 3D depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 25 * this.zoom;
        this.ctx.shadowOffsetY = 10 * this.zoom;

        // Dark translucent background with gold border
        this.ctx.fillStyle = 'rgba(18, 10, 32, 0.96)';
        this.ctx.beginPath();
        this.ctx.roundRect(bx, by, bw, bh, 22 * this.zoom);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 4 * this.zoom;
        this.ctx.stroke();

        // Reset shadow for crisp text
        this.ctx.shadowColor = 'transparent';

        // Caution Header Strip
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.roundRect(bx + 6 * this.zoom, by + 6 * this.zoom, bw - 12 * this.zoom, 32 * this.zoom, [16 * this.zoom, 16 * this.zoom, 0, 0]);
        this.ctx.fill();

        this.ctx.fillStyle = '#0f172a';
        this.ctx.font = `900 ${Math.round(14 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`🚧 YENİ ŞUBE İNŞAAT SAHASI — GİRİŞ YASAKTIR 🚧`, cp.x, by + 27 * this.zoom);

        // Main Title
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = `900 ${Math.round(26 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`🚧 İNŞAAT DEVAM EDİYOR 🚧`, cp.x, by + 76 * this.zoom);

        // Dynamic Timer Display
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${Math.round(21 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.fillText(`⏱️ Kalan Süre: ${timeStr}`, cp.x, by + 115 * this.zoom);

        // Dynamic Diamond Button Pill
        const btnW = 380 * this.zoom;
        const btnH = 48 * this.zoom;
        const btnX = cp.x - btnW / 2;
        const btnY = by + 142 * this.zoom;

        const btnGrad = this.ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
        btnGrad.addColorStop(0, '#a855f7');
        btnGrad.addColorStop(0.5, '#6366f1');
        btnGrad.addColorStop(1, '#3b82f6');
        this.ctx.fillStyle = btnGrad;
        this.ctx.beginPath();
        this.ctx.roundRect(btnX, btnY, btnW, btnH, 99);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fef08a';
        this.ctx.lineWidth = 2 * this.zoom;
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `900 ${Math.round(17 * this.zoom)}px Outfit, sans-serif`;
        this.ctx.fillText(`⚡ 💎${neededDiamonds} ELMAS İLE ANINDA AÇ ⚡`, cp.x, btnY + 31 * this.zoom);

        this.ctx.restore();
      }
    }
  }

  private drawWalls(): void {
    const state = this.stateStore.getState();
    const branches = state.branches ? state.branches.length : 1;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    // 1.5x Wall Height (110 * 1.5 = 165)
    const wallHeight = 165 * this.zoom;

    for (let b = 0; b < branches; b++) {
      const col = b % 3;
      const row = Math.floor(b / 3);
      const offsetX = col * 30;
      const offsetY = row * 28;

      // Branch Frustum Culling Check
      const pTop = this.gridToScreen(offsetX, offsetY);
      const pBottom = this.gridToScreen(offsetX + 24, offsetY + 18);
      const minX = Math.min(pTop.x, pBottom.x) - 250 * this.zoom;
      const maxX = Math.max(pTop.x, pBottom.x) + 250 * this.zoom;
      const minY = Math.min(pTop.y, pBottom.y) - 250 * this.zoom;
      const maxY = Math.max(pTop.y, pBottom.y) + 250 * this.zoom;

      if (maxX < 0 || minX > canvasW || maxY < 0 || minY > canvasH) {
        continue; // Skip offscreen branch walls
      }

      const pTopLeft = this.gridToScreen(0 + offsetX, 0 + offsetY);
      const pTopRight = this.gridToScreen(this.gridWidth + offsetX, 0 + offsetY);
      const pBottomLeft = this.gridToScreen(0 + offsetX, this.gridHeight + offsetY);
      const pBottomRight = this.gridToScreen(this.gridWidth + offsetX, this.gridHeight + offsetY);

      // 1. Long Back Wall (100% Horizontal & Parallel to Header Line, extending seamlessly to side wall edges)
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y - wallHeight);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y);
      this.ctx.closePath();

      const wallGradBack = this.ctx.createLinearGradient(pTopLeft.x, pTopLeft.y - wallHeight, pTopRight.x, pTopRight.y);
      wallGradBack.addColorStop(0, '#581c87');
      wallGradBack.addColorStop(0.5, '#3b0764');
      wallGradBack.addColorStop(1, '#2e1065');
      this.ctx.fillStyle = wallGradBack;
      this.ctx.fill();
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2 * this.zoom;
      this.ctx.stroke();

      // 2. Left Side Wall (Fully joined at corner)
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pBottomLeft.x - 14 * this.zoom, pBottomLeft.y - wallHeight);
      this.ctx.lineTo(pBottomLeft.x, pBottomLeft.y);
      this.ctx.closePath();

      const wallGradLeft = this.ctx.createLinearGradient(pTopLeft.x, pTopLeft.y - wallHeight, pBottomLeft.x, pBottomLeft.y);
      wallGradLeft.addColorStop(0, '#4c1d95');
      wallGradLeft.addColorStop(1, '#2e1065');
      this.ctx.fillStyle = wallGradLeft;
      this.ctx.fill();
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2 * this.zoom;
      this.ctx.stroke();

      // 3. Right Side Wall (Fully joined at corner)
      this.ctx.beginPath();
      this.ctx.moveTo(pTopRight.x, pTopRight.y);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y - wallHeight);
      this.ctx.lineTo(pBottomRight.x + 14 * this.zoom, pBottomRight.y - wallHeight);
      this.ctx.lineTo(pBottomRight.x, pBottomRight.y);
      this.ctx.closePath();

      this.ctx.fillStyle = wallGradLeft;
      this.ctx.fill();
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2 * this.zoom;
      this.ctx.stroke();

      // 4. Closed Corner Filler Caps (Seals top corner gaps seamlessly)
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y);
      this.ctx.lineTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pTopLeft.x, pTopLeft.y - wallHeight);
      this.ctx.closePath();
      this.ctx.fillStyle = '#4c1d95';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(pTopRight.x, pTopRight.y);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y - wallHeight);
      this.ctx.lineTo(pTopRight.x, pTopRight.y - wallHeight);
      this.ctx.closePath();
      this.ctx.fillStyle = '#4c1d95';
      this.ctx.fill();

      // Gold Moldings along Back Wall Top Line (Spans entire top wall width)
      this.ctx.beginPath();
      this.ctx.moveTo(pTopLeft.x - 14 * this.zoom, pTopLeft.y - wallHeight);
      this.ctx.lineTo(pTopRight.x + 14 * this.zoom, pTopRight.y - wallHeight);
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 3.5 * this.zoom;
      this.ctx.stroke();

      // Paintings on Back Wall (Centered safely inside the 1.5x height wall)
      this.drawRealisticWallPainting(4 + offsetX, 0 + offsetY, 'RIGHT_WALL_1');
      this.drawRealisticWallPainting(12 + offsetX, 0 + offsetY, 'RIGHT_WALL_2');
      this.drawRealisticWallPainting(20 + offsetX, 0 + offsetY, 'LEFT_WALL');
    }
  }

  private drawRealisticWallPainting(gx: number, gy: number, type: 'LEFT_WALL' | 'RIGHT_WALL_1' | 'RIGHT_WALL_2'): void {
    const p = this.gridToScreen(gx, gy);
    const artW = 50 * this.zoom;
    const artH = 40 * this.zoom;
    const artY = p.y - 105 * this.zoom;

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
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    // Environment props (trees, lamps, vacant lots, bench, parked car) around the salon
    this.addEnvironmentEntities(entities);

    const branches = this.stateStore.getState().branches || [this.stateStore.getActiveBranch()];

    // Loop through ALL open branches to render furniture, doors, equipment & poles at offset!
    branches.forEach((bData, bIdx) => {
      const col = bIdx % 3;
      const row = Math.floor(bIdx / 3);
      const offsetX = col * 30;
      const offsetY = row * 28;

      // Branch Frustum Culling Check
      const pTop = this.gridToScreen(offsetX, offsetY);
      const pBottom = this.gridToScreen(offsetX + 24, offsetY + 18);
      const minX = Math.min(pTop.x, pBottom.x) - 250 * this.zoom;
      const maxX = Math.max(pTop.x, pBottom.x) + 250 * this.zoom;
      const minY = Math.min(pTop.y, pBottom.y) - 250 * this.zoom;
      const maxY = Math.max(pTop.y, pBottom.y) + 250 * this.zoom;

      if (maxX < 0 || minX > canvasW || maxY < 0 || minY > canvasH) {
        return; // Skip offscreen branch entities
      }

      // Plants Decor for Branch bIdx
      entities.push({
        gridX: 1 + offsetX, gridY: 1 + offsetY, sortKey: (1 + offsetX) + (1 + offsetY),
        draw: (ctx) => {
          const p = this.gridToScreen(1 + offsetX, 1 + offsetY);
          const plantSprite = spriteMgr.getPottedPlantSprite('MONSTERA', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      entities.push({
        gridX: 22 + offsetX, gridY: 2 + offsetY, sortKey: (22 + offsetX) + (2 + offsetY),
        draw: (ctx) => {
          const p = this.gridToScreen(22 + offsetX, 2 + offsetY);
          const plantSprite = spriteMgr.getPottedPlantSprite('GOLDEN_PALM', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      entities.push({
        gridX: 10 + offsetX, gridY: 14 + offsetY, sortKey: (10 + offsetX) + (14 + offsetY),
        draw: (ctx) => {
          const p = this.gridToScreen(10 + offsetX, 14 + offsetY);
          const plantSprite = spriteMgr.getPottedPlantSprite('ROSE_VASE', this.zoom);
          ctx.drawImage(plantSprite, p.x - plantSprite.width / 2, p.y - plantSprite.height + 15 * this.zoom);
        }
      });

      // Sofas for Branch bIdx
      const sofasCount = bData.waitingSofasCount || 1;
      const sofaTiles = [{ x: 3 + offsetX, y: 14 + offsetY }, { x: 8 + offsetX, y: 14 + offsetY }, { x: 13 + offsetX, y: 14 + offsetY }];
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
        gridX: 7 + offsetX, gridY: 3 + offsetY, sortKey: (7 + offsetX) + (3 + offsetY) - 0.1,
        draw: (ctx) => {
          const p = this.gridToScreen(7 + offsetX, 3 + offsetY);
          const stationSprite = spriteMgr.getBarberStationSprite(this.zoom);
          ctx.drawImage(stationSprite, p.x - stationSprite.width / 2, p.y - stationSprite.height + 10 * this.zoom);
        }
      });

      // Barber Chair #1 for Branch bIdx
      entities.push({
        gridX: 7 + offsetX, gridY: 4 + offsetY, sortKey: (7 + offsetX) + (4 + offsetY),
        draw: (ctx) => {
          const p = this.gridToScreen(7 + offsetX, 4 + offsetY);
          const chairSprite = spriteMgr.getBarberChairSprite(this.zoom);
          ctx.drawImage(chairSprite, p.x - chairSprite.width / 2, p.y - chairSprite.height + 25 * this.zoom);
        }
      });

      // 3D Hair Wash Basin Station at (2 + offsetX, 7 + offsetY) (if unlocked)
      const washUnlocked = (bData.upgrades?.hair_wash_station?.level || 0) >= 1;
      if (washUnlocked) {
        entities.push({
          gridX: 2 + offsetX, gridY: 7 + offsetY, sortKey: (2 + offsetX) + (7 + offsetY),
          draw: (ctx) => {
            const p = this.gridToScreen(2 + offsetX, 7 + offsetY);
            const washSprite = spriteMgr.getHairWashStationSprite(this.zoom);
            ctx.drawImage(washSprite, p.x - washSprite.width / 2, p.y - washSprite.height + 15 * this.zoom);
          }
        });
      }

      // 2nd Barber Station & Chair #2 at (12 + offsetX, 3 + offsetY)/(12 + offsetX, 4 + offsetY)
      const stationsCount = bData.barberStationsCount || 1;
      const stationTile = { x: 12 + offsetX, y: 3 + offsetY };
      const chairTile = { x: 12 + offsetX, y: 4 + offsetY };

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

      // 3rd Barber Station & Chair #3 (👰 Gelin Saçı) at (17 + offsetX, 3 + offsetY)/(17 + offsetX, 4 + offsetY)
      const station3Tile = { x: 17 + offsetX, y: 3 + offsetY };
      const chair3Tile = { x: 17 + offsetX, y: 4 + offsetY };

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

      // 3D Retail Display Shelf at (18 + offsetX, 14 + offsetY) (if unlocked)
      const retailUnlocked = (bData.upgrades?.retail_shelf?.level || 0) >= 1;
      if (retailUnlocked) {
        entities.push({
          gridX: 18 + offsetX, gridY: 14 + offsetY, sortKey: (18 + offsetX) + (14 + offsetY),
          draw: (ctx) => {
            const p = this.gridToScreen(18 + offsetX, 14 + offsetY);
            const shelfSprite = spriteMgr.getRetailShelfSprite(this.zoom);
            ctx.drawImage(shelfSprite, p.x - shelfSprite.width / 2, p.y - shelfSprite.height + 15 * this.zoom);
          }
        });
      }

      // Reception Desk for Branch bIdx at (18 + offsetX, 9 + offsetY) - ALWAYS rendered in background behind ALL NPCs
      entities.push({
        gridX: 18 + offsetX, gridY: 9 + offsetY, sortKey: (18 + offsetX) + (0.1 + offsetY),
        draw: (ctx) => {
          const p = this.gridToScreen(18 + offsetX, 9 + offsetY);
          const deskSprite = spriteMgr.getReceptionDeskSprite(this.zoom);
          const dw = deskSprite.width / 2;
          const dh = deskSprite.height / 2;
          ctx.drawImage(deskSprite, p.x - dw / 2, p.y - dh + 15 * this.zoom, dw, dh);
        }
      });

      // Pink Isometric Salon Door at Entrance (22 + offsetX, 15 + offsetY)
      entities.push({
        gridX: 22 + offsetX, gridY: 15 + offsetY, sortKey: (22 + offsetX) + (15 + offsetY) - 0.1,
        draw: (ctx) => {
          const p = this.gridToScreen(22 + offsetX, 15 + offsetY);
          const doorSprite = spriteMgr.getSalonDoorSprite(this.zoom);
          ctx.drawImage(doorSprite, p.x - doorSprite.width / 2, p.y - doorSprite.height + 15 * this.zoom);
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
