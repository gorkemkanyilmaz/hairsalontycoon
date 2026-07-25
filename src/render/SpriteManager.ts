// Commercial Studio-Grade 2D Isometric SVG & Canvas Asset Engine

export class SpriteManager {
  private static instance: SpriteManager;
  private cache: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  // 1. Soft Pastel Cream & Blush Pink Marble Floor Tile
  public getParquetTileSprite(isAlternate: boolean, scale: number = 1): HTMLCanvasElement {
    const key = `pastel_marble_tile_${isAlternate}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const tw = Math.round(72 * scale);
    const th = Math.round(36 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th + 12 * scale;
    const ctx = canvas.getContext('2d')!;

    const cx = tw / 2;
    const cy = th / 2;

    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(tw, cy);
    ctx.lineTo(cx, th);
    ctx.lineTo(0, cy);
    ctx.closePath();

    const tileGrad = ctx.createLinearGradient(0, 0, tw, th);
    if (isAlternate) {
      tileGrad.addColorStop(0, '#ffffff');
      tileGrad.addColorStop(0.6, '#fcf5f8'); // Soft Pastel Cream
      tileGrad.addColorStop(1, '#fae8ff');
    } else {
      tileGrad.addColorStop(0, '#fdf2f8');
      tileGrad.addColorStop(0.6, '#fbcfe8'); // Pastel Blush Pink
      tileGrad.addColorStop(1, '#f472b6');
    }
    ctx.fillStyle = tileGrad;
    ctx.fill();

    // Subtle Pastel Veins
    ctx.beginPath();
    ctx.moveTo(cx - 18 * scale, cy - 6 * scale);
    ctx.lineTo(cx - 2 * scale, cy + 8 * scale);
    ctx.lineTo(cx + 20 * scale, cy - 2 * scale);
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.25)';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(cx, th);
    ctx.lineTo(cx, th + 8 * scale);
    ctx.lineTo(0, cy + 8 * scale);
    ctx.closePath();
    ctx.fillStyle = isAlternate ? '#fbcfe8' : '#f472b6';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, th);
    ctx.lineTo(tw, cy);
    ctx.lineTo(tw, cy + 8 * scale);
    ctx.lineTo(cx, th + 8 * scale);
    ctx.closePath();
    ctx.fillStyle = isAlternate ? '#f472b6' : '#e879f9';
    ctx.fill();

    this.cache.set(key, canvas);
    return canvas;
  }

  // 2. Decorative Potted Plants (Monstera, Rose Vase, Golden Palm)
  public getPottedPlantSprite(type: 'MONSTERA' | 'ROSE_VASE' | 'GOLDEN_PALM' = 'MONSTERA', scale: number = 1): HTMLCanvasElement {
    const key = `plant_${type}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(90 * scale);
    const h = Math.round(110 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.82;

    // Drop Shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 22 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    if (type === 'MONSTERA') {
      // White Marble Pot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 14 * scale, cy - 26 * scale, 28 * scale, 26 * scale);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(cx - 14 * scale, cy - 26 * scale, 28 * scale, 26 * scale);

      // Lush Monstera Leaves
      ctx.fillStyle = '#10b981';
      [-12, 0, 12].forEach((ox) => {
        ctx.beginPath();
        ctx.arc(cx + ox * scale, cy - 42 * scale, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    } else if (type === 'ROSE_VASE') {
      // Gold Vase
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 16 * scale, 12 * scale, 16 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Pink Roses
      ctx.fillStyle = '#f472b6';
      [-10, 0, 10].forEach((ox, i) => {
        ctx.beginPath();
        ctx.arc(cx + ox * scale, cy - 36 * scale - (i % 2) * 6 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    } else { // GOLDEN_PALM
      // Ceramic Pink Pot
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(cx - 12 * scale, cy - 24 * scale, 24 * scale, 24 * scale);

      // Palm Fronds
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3 * scale;
      [-15, 0, 15].forEach((angle) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 24 * scale);
        ctx.lineTo(cx + angle * scale, cy - 50 * scale);
        ctx.stroke();
      });
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // 3. Studio 3D Women's Styling Chair
  public getBarberChairSprite(scale: number = 1): HTMLCanvasElement {
    const key = `styling_chair_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(140 * scale);
    const h = Math.round(160 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.76;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 6 * scale, 36 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // Rose Gold Base Disc
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8 * scale, 28 * scale, 14 * scale, 0, 0, Math.PI * 2);
    const baseGrad = ctx.createLinearGradient(cx - 25, cy, cx + 25, cy);
    baseGrad.addColorStop(0, '#fde2e4');
    baseGrad.addColorStop(0.4, '#ffb5a7');
    baseGrad.addColorStop(0.8, '#c97064');
    baseGrad.addColorStop(1, '#68322b');
    ctx.fillStyle = baseGrad;
    ctx.fill();
    ctx.strokeStyle = '#fde2e4';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 6 * scale, cy - 30 * scale, 12 * scale, 22 * scale);
    ctx.fillStyle = '#ffb5a7';
    ctx.fillRect(cx - 24 * scale, cy - 16 * scale, 48 * scale, 5 * scale);

    // Velvet Magenta Cushion Seat
    ctx.beginPath();
    ctx.ellipse(cx, cy - 38 * scale, 28 * scale, 14 * scale, 0, 0, Math.PI * 2);
    const seatGrad = ctx.createLinearGradient(cx - 20, cy - 45, cx + 20, cy - 30);
    seatGrad.addColorStop(0, '#f72585');
    seatGrad.addColorStop(0.6, '#b5179e');
    seatGrad.addColorStop(1, '#7209b7');
    ctx.fillStyle = seatGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff758f';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#ffb5a7';
    ctx.fillRect(cx - 34 * scale, cy - 60 * scale, 10 * scale, 24 * scale);
    ctx.fillRect(cx + 24 * scale, cy - 60 * scale, 10 * scale, 24 * scale);

    ctx.beginPath();
    ctx.roundRect(cx - 22 * scale, cy - 92 * scale, 44 * scale, 48 * scale, 10 * scale);
    const backGrad = ctx.createLinearGradient(cx - 20, cy - 90, cx + 20, cy - 45);
    backGrad.addColorStop(0, '#f72585');
    backGrad.addColorStop(0.5, '#b5179e');
    backGrad.addColorStop(1, '#7209b7');
    ctx.fillStyle = backGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff758f';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    this.cache.set(key, canvas);
    return canvas;
  }

  // 4. Reception Counter
  public getReceptionDeskSprite(scale: number = 1): HTMLCanvasElement {
    const key = `reception_desk_female_chic_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(170 * scale);
    const h = Math.round(160 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.75;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 10 * scale, 60 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const deskW = 100 * scale;
    const deskH = 54 * scale;

    ctx.fillStyle = '#3b0764';
    ctx.fillRect(cx - deskW / 2, cy - deskH, deskW, deskH);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - deskW / 2 + 8 * scale, cy - deskH + 10 * scale, deskW - 16 * scale, deskH - 18 * scale);
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeRect(cx - deskW / 2 + 8 * scale, cy - deskH + 10 * scale, deskW - 16 * scale, deskH - 18 * scale);

    ctx.beginPath();
    ctx.ellipse(cx, cy - deskH, deskW / 2 + 8 * scale, 16 * scale, 0, 0, Math.PI * 2);
    const topGrad = ctx.createLinearGradient(cx - 50, cy - deskH, cx + 50, cy - deskH);
    topGrad.addColorStop(0, '#ffffff');
    topGrad.addColorStop(0.5, '#fde2e4');
    topGrad.addColorStop(1, '#f472b6');
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 8 * scale, cy - deskH - 20 * scale, 16 * scale, 12 * scale);

    ctx.beginPath();
    ctx.roundRect(cx - 20 * scale, cy - deskH - 38 * scale, 40 * scale, 24 * scale, 4 * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#f72585';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#b5179e';
    ctx.fillRect(cx - 18 * scale, cy - deskH - 36 * scale, 36 * scale, 20 * scale);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${9 * scale}px sans-serif`;
    ctx.fillText('₺ CASH', cx - 14 * scale, cy - deskH - 22 * scale);

    // Rose Gold Vase with Pink Orchid Flowers
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx + 28 * scale, cy - deskH - 14 * scale, 12 * scale, 14 * scale);

    ctx.beginPath();
    ctx.moveTo(cx + 34 * scale, cy - deskH - 14 * scale);
    ctx.quadraticCurveTo(cx + 40 * scale, cy - deskH - 30 * scale, cx + 30 * scale, cy - deskH - 38 * scale);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    [
      { x: cx + 34 * scale, y: cy - deskH - 24 * scale },
      { x: cx + 38 * scale, y: cy - deskH - 32 * scale },
      { x: cx + 30 * scale, y: cy - deskH - 38 * scale }
    ].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    this.cache.set(key, canvas);
    return canvas;
  }

  // 5. Mirror Station
  public getBarberStationSprite(scale: number = 1): HTMLCanvasElement {
    const key = `styling_station_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(140 * scale);
    const h = Math.round(190 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h - 20 * scale;

    const frameW = 90 * scale;
    const frameH = 145 * scale;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(cx - frameW / 2, cy - frameH, frameW, frameH);
    ctx.strokeStyle = '#ffb5a7';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(cx - frameW / 2, cy - frameH, frameW, frameH);

    const mirrorW = frameW - 16 * scale;
    const mirrorH = frameH - 44 * scale;
    const mirrorX = cx - mirrorW / 2;
    const mirrorY = cy - frameH + 10 * scale;

    ctx.fillStyle = 'rgba(247, 37, 133, 0.25)';
    ctx.fillRect(mirrorX - 6, mirrorY - 6, mirrorW + 12, mirrorH + 12);

    const glassGrad = ctx.createLinearGradient(mirrorX, mirrorY, mirrorX + mirrorW, mirrorY + mirrorH);
    glassGrad.addColorStop(0, 'rgba(255, 240, 245, 0.95)');
    glassGrad.addColorStop(0.4, 'rgba(251, 207, 232, 0.6)');
    glassGrad.addColorStop(1, 'rgba(244, 114, 182, 0.3)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(mirrorX, mirrorY, mirrorW, mirrorH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(mirrorX, mirrorY, mirrorW, mirrorH);

    const shelfY = mirrorY + mirrorH + 4 * scale;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - frameW / 2 - 6 * scale, shelfY, frameW + 12 * scale, 16 * scale);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(cx - frameW / 2 - 6 * scale, shelfY, frameW + 12 * scale, 16 * scale);

    ctx.fillStyle = '#f72585';
    ctx.fillRect(cx - 32 * scale, shelfY - 14 * scale, 8 * scale, 14 * scale);
    ctx.fillStyle = '#ef476f';
    ctx.fillRect(cx + 18 * scale, shelfY - 12 * scale, 14 * scale, 7 * scale);

    this.cache.set(key, canvas);
    return canvas;
  }

  // 6. Velvet Lounge Waiting Sofa
  public getWaitingSofaSprite(scale: number = 1): HTMLCanvasElement {
    const key = `waiting_sofa_female_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(130 * scale);
    const h = Math.round(110 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.72;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 8 * scale, 46 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    ctx.fillStyle = '#ffb5a7';
    ctx.fillRect(cx - 38 * scale, cy - 4 * scale, 6 * scale, 12 * scale);
    ctx.fillRect(cx + 32 * scale, cy - 4 * scale, 6 * scale, 12 * scale);

    ctx.beginPath();
    ctx.roundRect(cx - 42 * scale, cy - 28 * scale, 84 * scale, 28 * scale, 8 * scale);
    const cushionGrad = ctx.createLinearGradient(cx - 40, cy - 25, cx + 40, cy - 10);
    cushionGrad.addColorStop(0, '#f72585');
    cushionGrad.addColorStop(0.5, '#b5179e');
    cushionGrad.addColorStop(1, '#7209b7');
    ctx.fillStyle = cushionGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff758f';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(cx - 40 * scale, cy - 60 * scale, 80 * scale, 36 * scale, 10 * scale);
    ctx.fillStyle = '#b5179e';
    ctx.fill();
    ctx.stroke();

    this.cache.set(key, canvas);
    return canvas;
  }

  // 7. Female Customer Character Sprite System
  public getCustomerAnimFrame(
    avatarColor: string = '#f72585',
    isWalking: boolean = false,
    walkAnimPhase: number = 0,
    scale: number = 1
  ): HTMLCanvasElement {
    const phaseKey = isWalking ? Math.floor((walkAnimPhase % (Math.PI * 2)) * 5) : 'idle';
    const key = `female_cust_${avatarColor}_${isWalking}_${phaseKey}_${scale}`;
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

    ctx.beginPath();
    ctx.arc(cx, cy - 76 * scale, 16 * scale, Math.PI * 0.7, Math.PI * 2.3);
    ctx.fillStyle = '#271206';
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(cx - 17 * scale, cy - 76 * scale, 8 * scale, 28 * scale, 4 * scale);
    ctx.roundRect(cx + 9 * scale, cy - 76 * scale, 8 * scale, 28 * scale, 4 * scale);
    ctx.fillStyle = '#271206';
    ctx.fill();

    this.cache.set(key, canvas);
    return canvas;
  }

  // 8. 3D Retail Display Shelf (Shampoos, Oils, Waxes)
  public getRetailShelfSprite(scale: number = 1): HTMLCanvasElement {
    const key = `retail_shelf_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    const w = Math.round(130 * scale);
    const h = Math.round(170 * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h * 0.78;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 6 * scale, 44 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const shelfW = 84 * scale;
    const shelfH = 120 * scale;

    ctx.fillStyle = '#3b0764';
    ctx.fillRect(cx - shelfW / 2, cy - shelfH, shelfW, shelfH);
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeRect(cx - shelfW / 2, cy - shelfH, shelfW, shelfH);

    // Shelves
    [0.3, 0.6, 0.9].forEach((ratio) => {
      const sy = cy - shelfH + shelfH * ratio;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - shelfW / 2 + 4 * scale, sy, shelfW - 8 * scale, 6 * scale);

      // Shampoos / Bottles on shelf
      [-24, -8, 8, 24].forEach((ox, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#f72585' : '#38bdf8';
        ctx.fillRect(cx + ox * scale - 4 * scale, sy - 14 * scale, 8 * scale, 14 * scale);
      });
    });

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
