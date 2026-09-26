import * as THREE from 'three';
import { CharacterAssetManager } from './CharacterAssetManager';
import { SalonCharacter } from './SalonCharacter';
import { CharacterAnimState, Direction8, HairStyleType } from './CharacterTypes';

export class CharacterPreviewScene {
  private static instance: CharacterPreviewScene | null = null;

  private container: HTMLElement;
  private canvasContainer: HTMLElement;
  private uiContainer: HTMLElement;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;

  private characters: SalonCharacter[] = [];
  private directionTestCharacters: SalonCharacter[] = [];
  private selectedCharacterIndex: number = -1; // -1 = All Characters

  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private show8DirectionCompass: boolean = false;

  private cameraZoomFrustum: number = 5.2;

  constructor() {
    this.clock = new THREE.Clock();

    // 1. Create DOM Overlay Container
    this.container = document.createElement('div');
    this.container.id = 'character-preview-overlay';
    this.container.className = 'character-preview-overlay hidden';

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.id = 'preview-canvas-container';
    this.canvasContainer.className = 'preview-canvas-container';
    this.container.appendChild(this.canvasContainer);

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'preview-ui-panel';
    this.uiContainer.className = 'preview-ui-panel';
    this.container.appendChild(this.uiContainer);

    document.body.appendChild(this.container);

    // 2. Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x130e24); // Luxury dark plum studio backdrop

    // 3. True Isometric Orthographic Camera (Phase 4)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.cameraZoomFrustum * aspect,
      this.cameraZoomFrustum * aspect,
      this.cameraZoomFrustum,
      -this.cameraZoomFrustum,
      0.1,
      500
    );

    // True Isometric Vector: Camera at (20, 22, 20) looking at scene center
    this.camera.position.set(18, 20, 18);
    this.camera.lookAt(0, 0.7, 0);

    // 4. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvasContainer.appendChild(this.renderer.domElement);

    // 5. Lighting Setup (Studio 3-Point Lighting)
    this.setupLighting();

    // 6. Studio Floor Platform & Grid
    this.setupFloor();

    // 7. Resize handling
    window.addEventListener('resize', () => this.onResize());
  }

  public static getInstance(): CharacterPreviewScene {
    if (!CharacterPreviewScene.instance) {
      CharacterPreviewScene.instance = new CharacterPreviewScene();
    }
    return CharacterPreviewScene.instance;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(15, 25, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    const shadowD = 12;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-15, 18, -12);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfce7f3, 1.0);
    rimLight.position.set(0, 15, -18);
    this.scene.add(rimLight);
  }

  private setupFloor(): void {
    // Elegant Marble Studio Pedestal
    const floorGeo = new THREE.CylinderGeometry(8.5, 8.8, 0.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x241438,
      roughness: 0.35,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Decorative Gold Trim Ring
    const ringGeo = new THREE.RingGeometry(8.45, 8.65, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.8,
      roughness: 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    this.scene.add(ringMesh);

    // World Grid Helper
    const gridHelper = new THREE.GridHelper(16, 16, 0xf472b6, 0x3b1d54);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  public async open(): Promise<void> {
    this.container.classList.remove('hidden');
    this.isRunning = true;

    // Load assets if not yet loaded
    const assetMgr = CharacterAssetManager.getInstance();
    await assetMgr.loadAllAssets();

    // Spawn 5 Customers side-by-side if not spawned
    if (this.characters.length === 0) {
      this.spawnPreviewCustomers();
      this.spawn8DirectionCompassCharacters();
    }

    // Build Interactive UI Panel
    this.buildUI();

    // Start Render Loop
    this.clock.start();
    this.animate();
  }

  public close(): void {
    this.container.classList.add('hidden');
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // Phase 2: Create the 5 visually different female customers side by side
  private spawnPreviewCustomers(): void {
    const assetMgr = CharacterAssetManager.getInstance();

    const variants = [
      {
        id: 'cust_A',
        name: 'Customer_A (Brown Waves)',
        hairStyle: HairStyleType.LONG,
        hairColor: '#451a03', // Rich Chestnut Brown
        outfitColor: '#0ea5e9', // Vibrant Sky/Teal Blue
        pos: new THREE.Vector3(-4.0, 0, 0),
        dir: Direction8.SOUTH
      },
      {
        id: 'cust_B',
        name: 'Customer_B (Blonde Waves)',
        hairStyle: HairStyleType.LONG,
        hairColor: '#facc15', // Radiant Golden Blonde
        outfitColor: '#ec4899', // Chic Rose Pink
        pos: new THREE.Vector3(-2.0, 0, 0),
        dir: Direction8.SOUTH
      },
      {
        id: 'cust_C',
        name: 'Customer_C (Black Parted)',
        hairStyle: HairStyleType.SIMPLE_PARTED,
        hairColor: '#171717', // Espresso Black
        outfitColor: '#8b5cf6', // Elegant Violet
        pos: new THREE.Vector3(0, 0, 0),
        dir: Direction8.SOUTH
      },
      {
        id: 'cust_D',
        name: 'Customer_D (Auburn Buns)',
        hairStyle: HairStyleType.BUNS,
        hairColor: '#b91c1c', // Auburn / Red Hair
        outfitColor: '#f59e0b', // Polished Gold/Amber
        pos: new THREE.Vector3(2.0, 0, 0),
        dir: Direction8.SOUTH
      },
      {
        id: 'cust_E',
        name: 'Customer_E (Brunette Bob)',
        hairStyle: HairStyleType.BUZZED,
        hairColor: '#78350f', // Warm Mocha
        outfitColor: '#10b981', // Emerald Mint Green
        pos: new THREE.Vector3(4.0, 0, 0),
        dir: Direction8.SOUTH
      }
    ];

    variants.forEach((v) => {
      const char = assetMgr.createCharacter({
        id: v.id,
        name: v.name,
        hairStyle: v.hairStyle,
        hairColor: v.hairColor,
        outfitColor: v.outfitColor,
        position: v.pos,
        initialDirection: v.dir,
        initialAnimation: CharacterAnimState.IDLE
      });

      this.scene.add(char.model);
      this.characters.push(char);

      // Create floating 3D text/pedestal label above character
      this.createPedestalBadge(char.name, v.pos.x, 2.2, v.pos.z);
    });
  }

  // Phase 5: 8-Direction Walk Compass Test
  private spawn8DirectionCompassCharacters(): void {
    const assetMgr = CharacterAssetManager.getInstance();

    const radius = 3.6;
    const compassDirections: { dir: Direction8; angle: number } = [
      { dir: Direction8.NORTH, angle: -Math.PI / 2 },
      { dir: Direction8.NORTH_EAST, angle: -Math.PI / 4 },
      { dir: Direction8.EAST, angle: 0 },
      { dir: Direction8.SOUTH_EAST, angle: Math.PI / 4 },
      { dir: Direction8.SOUTH, angle: Math.PI / 2 },
      { dir: Direction8.SOUTH_WEST, angle: 3 * Math.PI / 4 },
      { dir: Direction8.WEST, angle: Math.PI },
      { dir: Direction8.NORTH_WEST, angle: -3 * Math.PI / 4 }
    ] as any;

    compassDirections.forEach((item: any, idx: number) => {
      // In Three.js: X is East/West, Z is South/North
      // Vector pointing toward the direction
      const posX = Math.sin(item.angle) * radius;
      const posZ = Math.cos(item.angle) * radius;

      const char = assetMgr.createCharacter({
        id: `compass_char_${idx}`,
        name: item.dir,
        hairStyle: HairStyleType.LONG,
        hairColor: '#fde047',
        outfitColor: '#a855f7',
        position: new THREE.Vector3(posX, 0, posZ),
        initialDirection: item.dir,
        initialAnimation: CharacterAnimState.WALK
      });

      char.model.visible = false; // Hidden by default until 8-Direction test is toggled
      this.scene.add(char.model);
      this.directionTestCharacters.push(char);
    });
  }

  private createPedestalBadge(text: string, x: number, y: number, z: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 70;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 10, 28, 0.85)';
    ctx.roundRect(10, 10, 300, 50, 12);
    ctx.fill();
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 35);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.5, 0.35, 1);
    this.scene.add(sprite);
  }

  private buildUI(): void {
    this.uiContainer.innerHTML = `
      <div class="preview-card">
        <div class="preview-header">
          <div class="title-wrap">
            <span class="badge-tag">QUATERNIUS PIPELINE</span>
            <h2>🎭 3D Karakter Stüdyosu (Preview)</h2>
          </div>
          <button id="btn-close-preview" class="btn-close">&times;</button>
        </div>

        <div class="preview-body">
          <!-- Character Selector -->
          <div class="section-group">
            <label class="group-title">👤 Hedef Karakter:</label>
            <div class="selector-chips">
              <button class="chip-btn active" data-char="-1">Tümü (5 Müşteri)</button>
              <button class="chip-btn" data-char="0">Müşteri A</button>
              <button class="chip-btn" data-char="1">Müşteri B</button>
              <button class="chip-btn" data-char="2">Müşteri C</button>
              <button class="chip-btn" data-char="3">Müşteri D</button>
              <button class="chip-btn" data-char="4">Müşteri E</button>
            </div>
          </div>

          <!-- Phase 3: Animation Test Buttons -->
          <div class="section-group">
            <label class="group-title">🎬 Animasyonlar (AnimationMixer):</label>
            <div class="anim-btn-grid">
              <button class="action-btn anim-btn active" data-anim="IDLE">🧍 Idle (Bekleme)</button>
              <button class="action-btn anim-btn" data-anim="WALK">🚶 Walk (Yürüme)</button>
              <button class="action-btn anim-btn" data-anim="SIT">🪑 Sit (Oturma)</button>
              <button class="action-btn anim-btn" data-anim="STAND">🧍 Stand (Ayağa Kalk)</button>
              <button class="action-btn anim-btn" data-anim="TALK">💬 Talk (Konuşma)</button>
              <button class="action-btn anim-btn" data-anim="INTERACT">✂️ Interact (Hizmet)</button>
            </div>
          </div>

          <!-- Phase 4 & 5: Orientation Direction Controls -->
          <div class="section-group">
            <label class="group-title">🧭 Yönelim & Rotasyon (8 Yön Dünya Açısı):</label>
            <div class="compass-grid">
              <button class="compass-btn" data-dir="NORTH_WEST">↖️ KB</button>
              <button class="compass-btn" data-dir="NORTH">⬆️ K (Kuzey)</button>
              <button class="compass-btn" data-dir="NORTH_EAST">↗️ KD</button>
              <button class="compass-btn" data-dir="WEST">⬅️ B (Batı)</button>
              <button class="compass-btn active" data-dir="SOUTH">⬇️ G (Güney)</button>
              <button class="compass-btn" data-dir="EAST">➡️ D (Doğu)</button>
              <button class="compass-btn" data-dir="SOUTH_WEST">↙️ GB</button>
              <button class="compass-btn" data-dir="SOUTH_EAST">↘️ GD</button>
            </div>
          </div>

          <!-- Phase 5 Special Test: 8-Direction Walk Compass -->
          <div class="section-group">
            <button id="btn-toggle-8dir-test" class="special-test-btn">
              🧭 8-Yön Yürüme Pusulası Testini Aç / Kapat
            </button>
          </div>

          <!-- Hair Style & Hair Color Quick Customizer -->
          <div class="section-group">
            <label class="group-title">💇‍♀️ Saç Modeli & Rengi Değiştirici:</label>
            <div class="style-btn-row">
              <button class="sub-btn hair-style-btn" data-style="LONG">Uzun Dalgalı</button>
              <button class="sub-btn hair-style-btn" data-style="BUNS">Çift Topuz</button>
              <button class="sub-btn hair-style-btn" data-style="SIMPLE_PARTED">Yandan Ayrık</button>
              <button class="sub-btn hair-style-btn" data-style="BUZZED">Kısa Bob</button>
            </div>
            <div class="color-swatches-row">
              <span class="swatch-label">Renk:</span>
              <button class="color-swatch" style="background:#451a03" data-color="#451a03" title="Kestane/Kahve"></button>
              <button class="color-swatch" style="background:#facc15" data-color="#facc15" title="Sarı/Platin"></button>
              <button class="color-swatch" style="background:#171717" data-color="#171717" title="Siyah/Kömür"></button>
              <button class="color-swatch" style="background:#b91c1c" data-color="#b91c1c" title="Kızıl/Bakır"></button>
              <button class="color-swatch" style="background:#ec4899" data-color="#ec4899" title="Pastel Pembe"></button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Event Listeners
    document.getElementById('btn-close-preview')?.addEventListener('click', () => this.close());

    // Character Selector
    const charChips = this.uiContainer.querySelectorAll('.chip-btn');
    charChips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        charChips.forEach((c) => c.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.selectedCharacterIndex = parseInt((e.currentTarget as HTMLElement).dataset.char || '-1', 10);
      });
    });

    // Animation Buttons
    const animButtons = this.uiContainer.querySelectorAll('.anim-btn');
    animButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        animButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        const animName = (e.currentTarget as HTMLElement).dataset.anim as CharacterAnimState;
        this.playAnimationOnSelection(animName);
      });
    });

    // Direction Buttons
    const dirButtons = this.uiContainer.querySelectorAll('.compass-btn');
    dirButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        dirButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        const dir = (e.currentTarget as HTMLElement).dataset.dir as Direction8;
        this.faceDirectionOnSelection(dir);
      });
    });

    // 8-Direction Walk Compass Test Toggle
    document.getElementById('btn-toggle-8dir-test')?.addEventListener('click', () => {
      this.show8DirectionCompass = !this.show8DirectionCompass;
      const btn = document.getElementById('btn-toggle-8dir-test');
      if (btn) {
        btn.classList.toggle('active', this.show8DirectionCompass);
      }

      // Toggle visibility of compass characters vs line characters
      this.directionTestCharacters.forEach((c) => {
        c.model.visible = this.show8DirectionCompass;
        if (this.show8DirectionCompass) {
          c.playAnimation(CharacterAnimState.WALK);
        }
      });

      this.characters.forEach((c) => {
        c.model.visible = !this.show8DirectionCompass;
      });
    });

    // Hair Style Buttons
    const hairButtons = this.uiContainer.querySelectorAll('.hair-style-btn');
    hairButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const style = (e.currentTarget as HTMLElement).dataset.style as HairStyleType;
        this.setHairStyleOnSelection(style);
      });
    });

    // Color Swatches
    const colorSwatches = this.uiContainer.querySelectorAll('.color-swatch');
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        const color = (e.currentTarget as HTMLElement).dataset.color || '#451a03';
        this.setHairColorOnSelection(color);
      });
    });
  }

  private playAnimationOnSelection(animState: CharacterAnimState): void {
    if (this.selectedCharacterIndex === -1) {
      this.characters.forEach((c) => c.playAnimation(animState));
    } else if (this.characters[this.selectedCharacterIndex]) {
      this.characters[this.selectedCharacterIndex].playAnimation(animState);
    }
  }

  private faceDirectionOnSelection(dir: Direction8): void {
    if (this.selectedCharacterIndex === -1) {
      this.characters.forEach((c) => c.faceDirection(dir));
    } else if (this.characters[this.selectedCharacterIndex]) {
      this.characters[this.selectedCharacterIndex].faceDirection(dir);
    }
  }

  private setHairStyleOnSelection(style: HairStyleType): void {
    if (this.selectedCharacterIndex === -1) {
      this.characters.forEach((c) => c.setHairStyle(style));
    } else if (this.characters[this.selectedCharacterIndex]) {
      this.characters[this.selectedCharacterIndex].setHairStyle(style);
    }
  }

  private setHairColorOnSelection(color: string): void {
    if (this.selectedCharacterIndex === -1) {
      this.characters.forEach((c) => c.setHairColor(color));
    } else if (this.characters[this.selectedCharacterIndex]) {
      this.characters[this.selectedCharacterIndex].setHairColor(color);
    }
  }

  private onResize(): void {
    if (!this.isRunning) return;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -this.cameraZoomFrustum * aspect;
    this.camera.right = this.cameraZoomFrustum * aspect;
    this.camera.top = this.cameraZoomFrustum;
    this.camera.bottom = -this.cameraZoomFrustum;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();

    // Update character animation mixers & orientations
    this.characters.forEach((c) => c.update(delta));
    this.directionTestCharacters.forEach((c) => {
      if (c.model.visible) {
        c.update(delta);
      }
    });

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.animate);
  };
}
