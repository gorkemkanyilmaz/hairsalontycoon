import cashRegisterUrl from '../../assets/cash_register.png';
import productShelfUrl from '../../assets/product_shelf.png';
import salonFloorUrl from '../../assets/salon_floor_tile.png';
import waitingSofaUrl from '../../assets/waiting_sofa.png';
import salonChairUrl from '../../assets/salon_chair.png';
import pottedPlantUrl from '../../assets/potted_plant.png';
import salonDoorUrl from '../../assets/salon_door.png';
import hairWashUrl from '../../assets/hair_wash_station.png';
import warehouseShelfUrl from '../../assets/warehouse_shelf.png';

// Walk cycles & Seated poses
import custWalk0Url from '../../assets/cust_walk_0.png';
import custWalk1Url from '../../assets/cust_walk_1.png';
import custWalk2Url from '../../assets/cust_walk_2.png';
import custWalk3Url from '../../assets/cust_walk_3.png';
import custSeatedUrl from '../../assets/cust_seated.png';

import stylistWalk0Url from '../../assets/stylist_walk_0.png';
import stylistWalk1Url from '../../assets/stylist_walk_1.png';
import stylistWalk2Url from '../../assets/stylist_walk_2.png';
import stylistWalk3Url from '../../assets/stylist_walk_3.png';

export class SpriteManager {
  private static instance: SpriteManager;
  private cache: Map<string, HTMLCanvasElement> = new Map();

  private cashRegisterImg: HTMLImageElement | null = null;
  private productShelfImg: HTMLImageElement | null = null;
  private salonFloorImg: HTMLImageElement | null = null;
  private waitingSofaImg: HTMLImageElement | null = null;
  private salonChairImg: HTMLImageElement | null = null;
  private pottedPlantImg: HTMLImageElement | null = null;
  private salonDoorImg: HTMLImageElement | null = null;
  private hairWashImg: HTMLImageElement | null = null;
  private warehouseShelfImg: HTMLImageElement | null = null;

  // Customer anim images
  private custWalkImgs: (HTMLImageElement | null)[] = [null, null, null, null];
  private custSeatedImg: HTMLImageElement | null = null;

  // Stylist anim images
  private stylistWalkImgs: (HTMLImageElement | null)[] = [null, null, null, null];

  private constructor() {
    this.loadImage(cashRegisterUrl, (img) => { this.cashRegisterImg = img; });
    this.loadImage(productShelfUrl, (img) => { this.productShelfImg = img; });
    this.loadImage(salonFloorUrl, (img) => { this.salonFloorImg = img; });
    this.loadImage(waitingSofaUrl, (img) => { this.waitingSofaImg = img; });
    this.loadImage(salonChairUrl, (img) => { this.salonChairImg = img; });
    this.loadImage(pottedPlantUrl, (img) => { this.pottedPlantImg = img; });
    this.loadImage(salonDoorUrl, (img) => { this.salonDoorImg = img; });
    this.loadImage(hairWashUrl, (img) => { this.hairWashImg = img; });
    this.loadImage(warehouseShelfUrl, (img) => { this.warehouseShelfImg = img; });

    this.loadImage(custWalk0Url, (img) => { this.custWalkImgs[0] = img; });
    this.loadImage(custWalk1Url, (img) => { this.custWalkImgs[1] = img; });
    this.loadImage(custWalk2Url, (img) => { this.custWalkImgs[2] = img; });
    this.loadImage(custWalk3Url, (img) => { this.custWalkImgs[3] = img; });
    this.loadImage(custSeatedUrl, (img) => { this.custSeatedImg = img; });

    this.loadImage(stylistWalk0Url, (img) => { this.stylistWalkImgs[0] = img; });
    this.loadImage(stylistWalk1Url, (img) => { this.stylistWalkImgs[1] = img; });
    this.loadImage(stylistWalk2Url, (img) => { this.stylistWalkImgs[2] = img; });
    this.loadImage(stylistWalk3Url, (img) => { this.stylistWalkImgs[3] = img; });
  }

  private loadImage(url: string, callback: (img: HTMLImageElement) => void): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      callback(img);
      this.cache.clear();
    };
  }

  private quantizeScale(scale: number): number {
    return Math.round(scale * 20) / 20;
  }

  public static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  // 1. High-Definition Luxury Rose Gold & White Marble Floor Tile
  public getParquetTileSprite(isAlternate: boolean, scale: number = 1, tileX: number = 0, tileY: number = 0): HTMLCanvasElement {
    const tw = Math.max(2, Math.round(56 * scale));
    const th = Math.max(2, Math.round(38 * scale));
    const key = `pink_marble_tile_${isAlternate}_${tileX % 8}_${tileY % 8}_${tw}_${th}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d')!;

    if (this.salonFloorImg && this.salonFloorImg.complete && this.salonFloorImg.naturalWidth > 0) {
      const numCols = 8;
      const numRows = 8;
      const srcW = this.salonFloorImg.naturalWidth / numCols;
      const srcH = this.salonFloorImg.naturalHeight / numRows;
      const sx = ((tileX % numCols + numCols) % numCols) * srcW;
      const sy = ((tileY % numRows + numRows) % numRows) * srcH;

      ctx.drawImage(this.salonFloorImg, sx, sy, srcW, srcH, 0, 0, tw, th);
    } else {
      ctx.fillStyle = isAlternate ? '#ffffff' : '#fdf2f8';
      ctx.fillRect(0, 0, tw, th);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 2. Indoor Potted Plant
  public getPottedPlantSprite(type: 'MONSTERA' | 'ROSE_VASE' | 'GOLDEN_PALM' = 'MONSTERA', scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `potted_plant_3d_${type}_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.85;
    if (this.pottedPlantImg && this.pottedPlantImg.complete && this.pottedPlantImg.naturalHeight > 0) {
      aspect = this.pottedPlantImg.naturalWidth / this.pottedPlantImg.naturalHeight;
    }

    const imgH = Math.round(115 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(20 * scale);
    const h = imgH + Math.round(20 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 28 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    if (this.pottedPlantImg && this.pottedPlantImg.complete && this.pottedPlantImg.naturalWidth > 0) {
      ctx.drawImage(this.pottedPlantImg, cx - imgW / 2, cy - imgH + 2 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  public getBarberChairSprite(scale: number = 1): HTMLCanvasElement {
    const key = `styling_chair_null_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    this.cache.set(key, canvas);
    return canvas;
  }

  // 3. Grand Reception Counter (Large, prominent executive checkout desk)
  public getReceptionDeskSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `reception_desk_grand_v2_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 1.04;
    if (this.cashRegisterImg && this.cashRegisterImg.complete && this.cashRegisterImg.naturalHeight > 0) {
      aspect = this.cashRegisterImg.naturalWidth / this.cashRegisterImg.naturalHeight;
    }

    // Grand size: 215px height so it spans properly across reception area!
    const imgH = Math.round(215 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(30 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 85 * scale, 28 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    if (this.cashRegisterImg && this.cashRegisterImg.complete && this.cashRegisterImg.naturalWidth > 0) {
      ctx.drawImage(this.cashRegisterImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 4. Styling Station with Illuminated Mirror & Barber Chair
  public getBarberStationSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `styling_station_3d_v2_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.76;
    if (this.salonChairImg && this.salonChairImg.complete && this.salonChairImg.naturalHeight > 0) {
      aspect = this.salonChairImg.naturalWidth / this.salonChairImg.naturalHeight;
    }

    const imgH = Math.round(190 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(30 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx - 15 * scale, cy + 2 * scale, 56 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + 25 * scale, cy + 4 * scale, 34 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    if (this.salonChairImg && this.salonChairImg.complete && this.salonChairImg.naturalWidth > 0) {
      ctx.drawImage(this.salonChairImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 5. Clean Luxury Velvet Waiting Armchair
  public getWaitingSofaSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `waiting_sofa_clean_v2_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.755;
    if (this.waitingSofaImg && this.waitingSofaImg.complete && this.waitingSofaImg.naturalHeight > 0) {
      aspect = this.waitingSofaImg.naturalWidth / this.waitingSofaImg.naturalHeight;
    }

    const imgH = Math.round(135 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(25 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    // Contact drop shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 45 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    if (this.waitingSofaImg && this.waitingSofaImg.complete && this.waitingSofaImg.naturalWidth > 0) {
      ctx.drawImage(this.waitingSofaImg, cx - imgW / 2, cy - imgH + 2 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 6. Salon Entrance Door
  public getSalonDoorSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `salon_door_3d_v1_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.75;
    if (this.salonDoorImg && this.salonDoorImg.complete && this.salonDoorImg.naturalHeight > 0) {
      aspect = this.salonDoorImg.naturalWidth / this.salonDoorImg.naturalHeight;
    }

    const imgH = Math.round(155 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(25 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 48 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.fill();

    if (this.salonDoorImg && this.salonDoorImg.complete && this.salonDoorImg.naturalWidth > 0) {
      ctx.drawImage(this.salonDoorImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 7. Retail Display Shelf
  public getRetailShelfSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `retail_shelf_3d_v1_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.65;
    if (this.productShelfImg && this.productShelfImg.complete && this.productShelfImg.naturalHeight > 0) {
      aspect = this.productShelfImg.naturalWidth / this.productShelfImg.naturalHeight;
    }

    const imgH = Math.round(165 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(25 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 48 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.fill();

    if (this.productShelfImg && this.productShelfImg.complete && this.productShelfImg.naturalWidth > 0) {
      ctx.drawImage(this.productShelfImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 8. Hair Wash Station
  public getHairWashStationSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `hair_wash_3d_v1_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.91;
    if (this.hairWashImg && this.hairWashImg.complete && this.hairWashImg.naturalHeight > 0) {
      aspect = this.hairWashImg.naturalWidth / this.hairWashImg.naturalHeight;
    }

    const imgH = Math.round(145 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(25 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 52 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    if (this.hairWashImg && this.hairWashImg.complete && this.hairWashImg.naturalWidth > 0) {
      ctx.drawImage(this.hairWashImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 9. Warehouse Storage Rack
  public getWarehouseShelfSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `warehouse_shelf_3d_v1_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.78;
    if (this.warehouseShelfImg && this.warehouseShelfImg.complete && this.warehouseShelfImg.naturalHeight > 0) {
      aspect = this.warehouseShelfImg.naturalWidth / this.warehouseShelfImg.naturalHeight;
    }

    const imgH = Math.round(160 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(25 * scale);
    const h = imgH + Math.round(25 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 54 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    if (this.warehouseShelfImg && this.warehouseShelfImg.complete && this.warehouseShelfImg.naturalWidth > 0) {
      ctx.drawImage(this.warehouseShelfImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 10. Stylist Employee 3D Character (Walk cycle with stride, working pose, or idle)
  public getStylistEmployeeSprite(
    avatarColor: string = '#e879f9',
    isWalking: boolean = false,
    walkAnimPhase: number = 0,
    scale: number = 1,
    isWorking: boolean = false,
    facingLeft: boolean = false
  ): HTMLCanvasElement {
    let frameIdx = 1;
    if (isWalking) {
      const normalizedPhase = ((walkAnimPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      frameIdx = Math.floor((normalizedPhase / (Math.PI * 2)) * 4) % 4;
    }

    const qScale = this.quantizeScale(scale);
    const key = `stylist_anim_${isWalking ? 'walk_' + frameIdx : isWorking ? 'work' : 'idle'}_${facingLeft}_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const img = this.stylistWalkImgs[frameIdx] || this.stylistWalkImgs[0];
    let aspect = 0.416;
    if (img && img.complete && img.naturalHeight > 0) {
      aspect = img.naturalWidth / img.naturalHeight;
    }

    const imgH = Math.round(118 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(20 * scale);
    const h = imgH + Math.round(20 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    // Contact drop shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15 * scale, 6.5 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fill();

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      if (facingLeft) {
        ctx.scale(-1, 1);
      }
      // Subtle heel strike compression
      const walkDip = isWalking ? Math.sin(walkAnimPhase * 2) * 1.5 * scale : 0;
      ctx.drawImage(img, -imgW / 2, -imgH + 2 * scale + walkDip, imgW, imgH);
      ctx.restore();
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 11. Customer 3D Character (Walk cycle with stride, seated pose, or idle)
  public getCustomerAnimFrame(
    avatarColor: string = '#f72585',
    isWalking: boolean = false,
    walkAnimPhase: number = 0,
    scale: number = 1,
    hairColorOverride?: string,
    isSeated: boolean = false,
    facingLeft: boolean = false
  ): HTMLCanvasElement {
    let frameIdx = 1;
    if (isWalking) {
      const normalizedPhase = ((walkAnimPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      frameIdx = Math.floor((normalizedPhase / (Math.PI * 2)) * 4) % 4;
    }

    const qScale = this.quantizeScale(scale);
    const stateKey = isSeated ? 'seated' : isWalking ? `walk_${frameIdx}` : 'idle';
    const key = `customer_anim_${stateKey}_${facingLeft}_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const img = isSeated
      ? (this.custSeatedImg || this.custWalkImgs[0])
      : (this.custWalkImgs[frameIdx] || this.custWalkImgs[0]);

    let aspect = isSeated ? 0.58 : 0.347;
    if (img && img.complete && img.naturalHeight > 0) {
      aspect = img.naturalWidth / img.naturalHeight;
    }

    // Seated is upper-body height (~72px), standing is full height (~115px)
    const imgH = isSeated ? Math.round(72 * scale) : Math.round(114 * scale);
    const imgW = Math.round(imgH * aspect);
    const w = imgW + Math.round(20 * scale);
    const h = imgH + Math.round(20 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.88;

    // Contact drop shadow (only when standing / walking)
    if (!isSeated) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fill();
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      if (facingLeft) {
        ctx.scale(-1, 1);
      }
      const walkDip = isWalking ? Math.sin(walkAnimPhase * 2) * 1.5 * scale : 0;
      ctx.drawImage(img, -imgW / 2, -imgH + 2 * scale + walkDip, imgW, imgH);
      ctx.restore();
    }

    this.cache.set(key, canvas);
    return canvas;
  }
}
