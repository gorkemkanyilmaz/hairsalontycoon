import cashRegisterUrl from '../../assets/cash_register.png';
import productShelfUrl from '../../assets/product_shelf.png';
import salonFloorUrl from '../../assets/salon_floor_tile.png';
import waitingSofaUrl from '../../assets/waiting_sofa.png';
import salonChairUrl from '../../assets/salon_chair.png';
import pottedPlantUrl from '../../assets/potted_plant.png';
import salonDoorUrl from '../../assets/salon_door.png';

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

  private constructor() {
    this.loadCashRegisterImage();
    this.loadProductShelfImage();
    this.loadSalonFloorImage();
    this.loadWaitingSofaImage();
    this.loadSalonChairImage();
    this.loadPottedPlantImage();
    this.loadSalonDoorImage();
  }

  private quantizeScale(scale: number): number {
    return Math.round(scale * 20) / 20;
  }

  private loadCashRegisterImage(): void {
    if (this.cashRegisterImg) return;
    const img = new Image();
    img.src = cashRegisterUrl;
    img.onload = () => {
      this.cashRegisterImg = img;
      this.cache.clear();
    };
  }

  private loadProductShelfImage(): void {
    if (this.productShelfImg) return;
    const img = new Image();
    img.src = productShelfUrl;
    img.onload = () => {
      this.productShelfImg = img;
      this.cache.clear();
    };
  }

  private loadSalonFloorImage(): void {
    if (this.salonFloorImg) return;
    const img = new Image();
    img.src = salonFloorUrl;
    img.onload = () => {
      this.salonFloorImg = img;
      this.cache.clear();
    };
  }

  private loadWaitingSofaImage(): void {
    if (this.waitingSofaImg) return;
    const img = new Image();
    img.src = waitingSofaUrl;
    img.onload = () => {
      this.waitingSofaImg = img;
      this.cache.clear();
    };
  }

  private loadSalonChairImage(): void {
    if (this.salonChairImg) return;
    const img = new Image();
    img.src = salonChairUrl;
    img.onload = () => {
      this.salonChairImg = img;
      this.cache.clear();
    };
  }

  private loadPottedPlantImage(): void {
    if (this.pottedPlantImg) return;
    const img = new Image();
    img.src = pottedPlantUrl;
    img.onload = () => {
      this.pottedPlantImg = img;
      this.cache.clear();
    };
  }

  private loadSalonDoorImage(): void {
    if (this.salonDoorImg) return;
    const img = new Image();
    img.src = salonDoorUrl;
    img.onload = () => {
      this.salonDoorImg = img;
      this.cache.clear();
    };
  }

  public static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  // 1. High-Definition Luxury Pink & White Marble Floor Tile
  public getParquetTileSprite(isAlternate: boolean, scale: number = 1, tileX: number = 0, tileY: number = 0): HTMLCanvasElement {
    const tw = Math.max(2, Math.round(56 * scale));
    const th = Math.max(2, Math.round(38 * scale));
    const key = `pink_marble_tile_${isAlternate}_${tileX % 2}_${tileY % 2}_${tw}_${th}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d')!;

    if (this.salonFloorImg && this.salonFloorImg.complete && this.salonFloorImg.naturalWidth > 0) {
      // Map 1 marble tile image over 2x2 grid tiles for seamless high-res marble veining
      const srcW = this.salonFloorImg.naturalWidth / 2;
      const srcH = this.salonFloorImg.naturalHeight / 2;
      const sx = ((tileX % 2 + 2) % 2) * srcW;
      const sy = ((tileY % 2 + 2) % 2) * srcH;

      ctx.drawImage(this.salonFloorImg, sx, sy, srcW, srcH, 0, 0, tw, th);
    } else {
      const tileGrad = ctx.createLinearGradient(0, 0, tw, th);
      if (isAlternate) {
        tileGrad.addColorStop(0, '#ffffff');
        tileGrad.addColorStop(0.6, '#fcf5f8');
        tileGrad.addColorStop(1, '#fae8ff');
      } else {
        tileGrad.addColorStop(0, '#fdf2f8');
        tileGrad.addColorStop(0.6, '#fbcfe8');
        tileGrad.addColorStop(1, '#f472b6');
      }
      ctx.fillStyle = tileGrad;
      ctx.fillRect(0, 0, tw, th);

      ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)';
      ctx.lineWidth = Math.max(1, 1 * scale);
      ctx.strokeRect(0, 0, tw, th);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 2. Decorative Potted Plants (Pink Flower Pot on Metal Stand - Exact Aspect Ratio)
  public getPottedPlantSprite(type: 'MONSTERA' | 'ROSE_VASE' | 'GOLDEN_PALM' = 'MONSTERA', scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `potted_plant_flower_v4_${type}_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 1.8347; // 677 / 369
    if (this.pottedPlantImg && this.pottedPlantImg.complete && this.pottedPlantImg.naturalHeight > 0) {
      aspect = this.pottedPlantImg.naturalWidth / this.pottedPlantImg.naturalHeight;
    }

    const imgH = Math.round(110 * scale);
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
    const cy = h * 0.86;

    // Soft oval shadow under metal stand base
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 34 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
    ctx.restore();

    if (this.pottedPlantImg && this.pottedPlantImg.complete && this.pottedPlantImg.naturalWidth > 0) {
      ctx.drawImage(this.pottedPlantImg, cx - imgW / 2, cy - imgH + 4 * scale, imgW, imgH);
    } else {
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(cx - 14 * scale, cy - 26 * scale, 28 * scale, 26 * scale);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 3. Barber Chair Placeholder (Included in 3D Styling Station Image 2)
  public getBarberChairSprite(scale: number = 1): HTMLCanvasElement {
    const key = `styling_chair_v2_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(90 * scale);
    const h = Math.round(90 * scale);
    canvas.width = w;
    canvas.height = h;
    this.cache.set(key, canvas);
    return canvas;
  }

  // 4. Reception Counter (Pink Executive Desk - No Shadow)
  public getReceptionDeskSprite(scale: number = 1): HTMLCanvasElement {
    const qScale = this.quantizeScale(scale);
    const key = `reception_desk_pink_noshadow_v9_${qScale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.724; // 425 / 587
    if (this.cashRegisterImg && this.cashRegisterImg.complete && this.cashRegisterImg.naturalHeight > 0) {
      aspect = this.cashRegisterImg.naturalWidth / this.cashRegisterImg.naturalHeight;
    }

    const imgH = Math.round(230 * scale);
    const imgW = Math.round(imgH * aspect);

    const w = Math.round(210 * scale);
    const h = Math.round(250 * scale);

    const supersample = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * supersample;
    canvas.height = h * supersample;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(supersample, supersample);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.86;

    if (this.cashRegisterImg && this.cashRegisterImg.complete && this.cashRegisterImg.naturalWidth > 0) {
      ctx.drawImage(this.cashRegisterImg, cx - imgW / 2, cy - imgH + 10 * scale, imgW, imgH);
    } else {
      const deskW = 150 * scale;
      const deskH = 80 * scale;

      ctx.fillStyle = '#3b0764';
      ctx.fillRect(cx - deskW / 2, cy - deskH, deskW, deskH);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - deskW / 2 + 8 * scale, cy - deskH + 10 * scale, deskW - 16 * scale, deskH - 18 * scale);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5 * scale;
      ctx.strokeRect(cx - deskW / 2 + 8 * scale, cy - deskH + 10 * scale, deskW - 16 * scale, deskH - 18 * scale);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 5. Hairdresser Styling Station (Pink Pearl Mirror + Pink Barber Chair)
  public getBarberStationSprite(scale: number = 1): HTMLCanvasElement {
    const key = `styling_station_v3_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(150 * scale);
    const h = Math.round(210 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.86;

    // Drop Shadow for circular gold chair base and table legs
    ctx.save();
    // 1. Wide soft shadow for table legs & frame structure
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8 * scale, 52 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fill();

    // 2. Main shadow for circular gold chair base
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 42 * scale, 17 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fill();

    // 3. Crisp contact shadow under the gold base plate
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 28 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
    ctx.restore();

    if (this.salonChairImg && this.salonChairImg.complete && this.salonChairImg.naturalWidth > 0) {
      const imgW = w - 10 * scale;
      const imgH = h - 15 * scale;
      ctx.drawImage(this.salonChairImg, cx - imgW / 2, cy - imgH + 10 * scale, imgW, imgH);
    } else {
      const frameW = 90 * scale;
      const frameH = 145 * scale;
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - frameW / 2, cy - frameH, frameW, frameH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 6. Velvet Lounge Waiting Armchair (1.5x Smaller, Preserved Aspect Ratio)
  public getWaitingSofaSprite(scale: number = 1): HTMLCanvasElement {
    const key = `waiting_sofa_v4_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 1.8347; // 677 / 369
    if (this.waitingSofaImg && this.waitingSofaImg.complete && this.waitingSofaImg.naturalHeight > 0) {
      aspect = this.waitingSofaImg.naturalWidth / this.waitingSofaImg.naturalHeight;
    }

    const imgH = Math.round(100 * scale);
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
    const cy = h * 0.84;

    // Drop Shadow under wooden legs
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 68 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
    ctx.restore();

    if (this.waitingSofaImg && this.waitingSofaImg.complete && this.waitingSofaImg.naturalWidth > 0) {
      ctx.drawImage(this.waitingSofaImg, cx - imgW / 2, cy - imgH + 8 * scale, imgW, imgH);
    } else {
      ctx.fillStyle = '#ffb5a7';
      ctx.fillRect(cx - 50 * scale, cy - 6 * scale, 8 * scale, 16 * scale);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 12. Pink Isometric Entrance Door (Height matches NPC height, crisp aspect ratio)
  public getSalonDoorSprite(scale: number = 1): HTMLCanvasElement {
    const key = `salon_door_v1_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    let aspect = 0.4276; // 127 / 297
    if (this.salonDoorImg && this.salonDoorImg.complete && this.salonDoorImg.naturalHeight > 0) {
      aspect = this.salonDoorImg.naturalWidth / this.salonDoorImg.naturalHeight;
    }

    // Door height matches NPC height (120 * scale)
    const imgH = Math.round(120 * scale);
    const imgW = Math.round(imgH * aspect);

    const w = Math.round(70 * scale);
    const h = Math.round(140 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cx = w / 2;
    const cy = h * 0.86;

    // Ground shadow under door frame
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 28 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.fill();
    ctx.restore();

    if (this.salonDoorImg && this.salonDoorImg.complete && this.salonDoorImg.naturalWidth > 0) {
      ctx.drawImage(this.salonDoorImg, cx - imgW / 2, cy - imgH, imgW, imgH);
    } else {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx - 15 * scale, cy - imgH, 30 * scale, imgH);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 7. Female Customer Character Sprite System
  public getCustomerAnimFrame(
    avatarColor: string = '#f72585',
    isWalking: boolean = false,
    walkAnimPhase: number = 0,
    scale: number = 1,
    hairColorOverride?: string
  ): HTMLCanvasElement {
    const phaseKey = isWalking ? Math.floor((walkAnimPhase % (Math.PI * 2)) * 5) : 'idle';
    const hairKey = hairColorOverride || 'default';
    const key = `female_cust_${avatarColor}_${hairKey}_${isWalking}_${phaseKey}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(90 * scale);
    const h = Math.round(120 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const bobY = isWalking ? Math.abs(Math.sin(walkAnimPhase)) * 6 * scale : 0;
    const cy = h * 0.86 - bobY;

    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.88, 18 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const legAngle = isWalking ? Math.sin(walkAnimPhase) * 12 * scale : 0;

    ctx.fillStyle = '#fdba74';
    ctx.save();
    ctx.translate(cx - 5 * scale, cy - 28 * scale);
    ctx.rotate((legAngle * Math.PI) / 180);
    ctx.fillRect(-3 * scale, 0, 6 * scale, 24 * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4 * scale, 22 * scale, 8 * scale, 5 * scale);
    ctx.restore();

    ctx.fillStyle = '#fdba74';
    ctx.save();
    ctx.translate(cx + 5 * scale, cy - 28 * scale);
    ctx.rotate((-legAngle * Math.PI) / 180);
    ctx.fillRect(-3 * scale, 0, 6 * scale, 24 * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-3 * scale, 22 * scale, 8 * scale, 5 * scale);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(cx - 14 * scale, cy - 60 * scale);
    ctx.lineTo(cx + 14 * scale, cy - 60 * scale);
    ctx.lineTo(cx + 18 * scale, cy - 30 * scale);
    ctx.lineTo(cx - 18 * scale, cy - 30 * scale);
    ctx.closePath();
    ctx.fillStyle = avatarColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.fillStyle = '#fdba74';
    ctx.fillRect(cx - 4 * scale, cy - 66 * scale, 8 * scale, 8 * scale);

    ctx.beginPath();
    ctx.arc(cx, cy - 74 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#fdba74';
    ctx.fill();

    const hairColor = hairColorOverride || '#271206';

    ctx.beginPath();
    ctx.arc(cx, cy - 76 * scale, 16 * scale, Math.PI * 0.7, Math.PI * 2.3);
    ctx.fillStyle = hairColor;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx - 17 * scale, cy - 76 * scale, 8 * scale, 28 * scale, 4 * scale);
    ctx.roundRect(cx + 9 * scale, cy - 76 * scale, 8 * scale, 28 * scale, 4 * scale);
    ctx.fillStyle = hairColor;
    ctx.fill();

    this.cache.set(key, canvas);
    return canvas;
  }

  // 8. 3D Retail Display Shelf (Shampoos, Oils, Waxes)
  public getRetailShelfSprite(scale: number = 1): HTMLCanvasElement {
    const key = `retail_shelf_v2_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(160 * scale);
    const h = Math.round(200 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.82;

    // Drop Shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 52 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
    ctx.restore();

    if (this.productShelfImg && this.productShelfImg.complete && this.productShelfImg.naturalWidth > 0) {
      const imgW = w - 10 * scale;
      const imgH = h - 20 * scale;
      ctx.drawImage(this.productShelfImg, cx - imgW / 2, cy - imgH + 10 * scale, imgW, imgH);
    } else {
      const shelfW = 84 * scale;
      const shelfH = 120 * scale;

      ctx.fillStyle = '#3b0764';
      ctx.fillRect(cx - shelfW / 2, cy - shelfH, shelfW, shelfH);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5 * scale;
      ctx.strokeRect(cx - shelfW / 2, cy - shelfH, shelfW, shelfH);

      [0.3, 0.6, 0.9].forEach((ratio) => {
        const sy = cy - shelfH + shelfH * ratio;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - shelfW / 2 + 4 * scale, sy, shelfW - 8 * scale, 6 * scale);

        [-24, -8, 8, 24].forEach((ox, i) => {
          ctx.fillStyle = i % 2 === 0 ? '#f72585' : '#38bdf8';
          ctx.fillRect(cx + ox * scale - 4 * scale, sy - 14 * scale, 8 * scale, 14 * scale);
        });
      });
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 9. Stylist Employee Character Sprite
  public getStylistEmployeeSprite(
    avatarColor: string = '#e879f9',
    isWalking: boolean = false,
    walkAnimPhase: number = 0,
    scale: number = 1
  ): HTMLCanvasElement {
    const phaseKey = isWalking ? Math.floor((walkAnimPhase % (Math.PI * 2)) * 5) : 'idle';
    const key = `stylist_emp_${avatarColor}_${isWalking}_${phaseKey}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(90 * scale);
    const h = Math.round(120 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const bobY = isWalking ? Math.abs(Math.sin(walkAnimPhase)) * 6 * scale : 0;
    const cy = h * 0.86 - bobY;

    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.88, 18 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const legAngle = isWalking ? Math.sin(walkAnimPhase) * 12 * scale : 0;

    ctx.fillStyle = '#fdba74';
    ctx.save();
    ctx.translate(cx - 5 * scale, cy - 28 * scale);
    ctx.rotate((legAngle * Math.PI) / 180);
    ctx.fillRect(-3 * scale, 0, 6 * scale, 24 * scale);
    ctx.restore();

    ctx.fillStyle = '#fdba74';
    ctx.save();
    ctx.translate(cx + 5 * scale, cy - 28 * scale);
    ctx.rotate((-legAngle * Math.PI) / 180);
    ctx.fillRect(-3 * scale, 0, 6 * scale, 24 * scale);
    ctx.restore();

    // Stylist Apron
    ctx.beginPath();
    ctx.moveTo(cx - 14 * scale, cy - 60 * scale);
    ctx.lineTo(cx + 14 * scale, cy - 60 * scale);
    ctx.lineTo(cx + 16 * scale, cy - 28 * scale);
    ctx.lineTo(cx - 16 * scale, cy - 28 * scale);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b'; // Dark Apron
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Scissors Icon on Apron
    ctx.fillStyle = '#fbbf24';
    ctx.font = `${10 * scale}px sans-serif`;
    ctx.fillText('✂️', cx - 5 * scale, cy - 40 * scale);

    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 74 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#fdba74';
    ctx.fill();

    // Stylist Bun Hair
    this.cache.set(key, canvas);
    return canvas;
  }

  // 10. 3D Hair Wash Basin Station (Reclining Chair + Ceramic Sink)
  public getHairWashStationSprite(scale: number = 1): HTMLCanvasElement {
    const key = `hair_wash_station_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(140 * scale);
    const h = Math.round(160 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.76;

    // Drop Shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6 * scale, 48 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Reclining Black Leather Chair
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(cx - 30 * scale, cy - 36 * scale, 60 * scale, 30 * scale);
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(cx - 30 * scale, cy - 36 * scale, 60 * scale, 30 * scale);

    // Ceramic White Sink Basin behind head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 54 * scale, 26 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    // Inner Basin Water Dip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 54 * scale, 18 * scale, 9 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rose Gold Faucet
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 4 * scale, cy - 74 * scale, 8 * scale, 12 * scale);

    this.cache.set(key, canvas);
    return canvas;
  }

  // 11. 3D Warehouse Cargo Box Shelf (Tile 12, 2)
  public getWarehouseShelfSprite(scale: number = 1): HTMLCanvasElement {
    const key = `warehouse_shelf_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(130 * scale);
    const h = Math.round(160 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.78;

    // Drop Shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6 * scale, 44 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Metallic Rack Legs & Shelves
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 38 * scale, cy - 80 * scale, 6 * scale, 84 * scale);
    ctx.fillRect(cx + 32 * scale, cy - 80 * scale, 6 * scale, 84 * scale);

    // Shelves
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 40 * scale, cy - 40 * scale, 80 * scale, 8 * scale);
    ctx.fillRect(cx - 40 * scale, cy - 75 * scale, 80 * scale, 8 * scale);

    // Cardboard Cargo Stock Boxes
    ctx.fillStyle = '#d97706'; // Cardboard Brown
    ctx.fillRect(cx - 32 * scale, cy - 35 * scale, 28 * scale, 22 * scale);
    ctx.fillRect(cx + 2 * scale, cy - 35 * scale, 30 * scale, 22 * scale);
    ctx.fillRect(cx - 20 * scale, cy - 70 * scale, 40 * scale, 24 * scale);

    // Box Tape
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 32 * scale, cy - 26 * scale, 28 * scale, 4 * scale);
    ctx.fillRect(cx + 2 * scale, cy - 26 * scale, 30 * scale, 4 * scale);
    ctx.fillRect(cx - 20 * scale, cy - 60 * scale, 40 * scale, 4 * scale);

    this.cache.set(key, canvas);
    return canvas;
  }
}
