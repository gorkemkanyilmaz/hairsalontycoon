import * as THREE from 'three';

export type CharacterState = 'idle' | 'walk' | 'sit_sofa' | 'sit_chair' | 'service';

export class Character3DRenderer {
  private static instance: Character3DRenderer;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;

  // Character 3D hierarchy
  private characterRoot: THREE.Group;
  private shadowMesh: THREE.Mesh;
  private hips: THREE.Group;
  private pelvisMesh: THREE.Mesh;
  private torsoGroup: THREE.Group;
  private chestMesh: THREE.Mesh;
  private innerShirtMesh: THREE.Mesh;
  private cardiganButtons: THREE.Mesh[];
  private apronMesh: THREE.Mesh;
  private apronPocket: THREE.Mesh;
  private apronEmblem: THREE.Mesh;

  // Head & Realistic Facial Features
  private headGroup: THREE.Group;
  private headCranium: THREE.Mesh;
  private jawMesh: THREE.Mesh;
  private chinMesh: THREE.Mesh;
  private neckMesh: THREE.Mesh;

  // Realistic Eyes (Natural almond shape with sclera, hazel/brown iris, fine upper lash line)
  private leftSclera: THREE.Mesh;
  private rightSclera: THREE.Mesh;
  private leftIris: THREE.Mesh;
  private rightIris: THREE.Mesh;
  private leftPupil: THREE.Mesh;
  private rightPupil: THREE.Mesh;
  private leftEyeliner: THREE.Mesh;
  private rightEyeliner: THREE.Mesh;
  private leftGlint: THREE.Mesh;
  private rightGlint: THREE.Mesh;

  // Realistic 3D Nose & Natural Lips
  private noseBridge: THREE.Mesh;
  private noseTip: THREE.Mesh;
  private upperLip: THREE.Mesh;
  private lowerLip: THREE.Mesh;
  private browL: THREE.Mesh;
  private browR: THREE.Mesh;

  // Realistic Layered Hair (Curtain bangs framing forehead, parted crown, flowing shoulder waves)
  private hairGroup: THREE.Group;
  private hairCapMesh: THREE.Mesh;
  private hairBackMesh: THREE.Mesh;
  private hairCurtainLeft: THREE.Mesh;
  private hairCurtainRight: THREE.Mesh;
  private hairSideWaveL: THREE.Mesh;
  private hairSideWaveR: THREE.Mesh;
  private hairStrandL: THREE.Mesh;
  private hairStrandR: THREE.Mesh;
  private stylistBunMesh: THREE.Mesh;
  private stylistPinMesh: THREE.Mesh;

  // Limbs
  private leftArmGroup: THREE.Group;
  private leftUpperArm: THREE.Mesh;
  private leftLowerArmGroup: THREE.Group;
  private leftLowerArm: THREE.Mesh;
  private leftHand: THREE.Mesh;
  private combMesh: THREE.Mesh;

  private rightArmGroup: THREE.Group;
  private rightUpperArm: THREE.Mesh;
  private rightLowerArmGroup: THREE.Group;
  private rightLowerArm: THREE.Mesh;
  private rightHand: THREE.Mesh;
  private scissorsGroup: THREE.Group;
  private scissorBlade1: THREE.Mesh;
  private scissorBlade2: THREE.Mesh;

  private leftLegGroup: THREE.Group;
  private leftThigh: THREE.Mesh;
  private leftShinGroup: THREE.Group;
  private leftShin: THREE.Mesh;
  private leftShoe: THREE.Mesh;
  private leftShoeSole: THREE.Mesh;

  private rightLegGroup: THREE.Group;
  private rightThigh: THREE.Mesh;
  private rightShinGroup: THREE.Group;
  private rightShin: THREE.Mesh;
  private rightShoe: THREE.Mesh;
  private rightShoeSole: THREE.Mesh;

  // Realistic Materials
  private skinMaterial: THREE.MeshStandardMaterial;
  private scleraMaterial: THREE.MeshBasicMaterial;
  private irisMaterial: THREE.MeshBasicMaterial;
  private pupilMaterial: THREE.MeshBasicMaterial;
  private eyelinerMaterial: THREE.MeshBasicMaterial;
  private lipMaterial: THREE.MeshStandardMaterial;
  private eyebrowMaterial: THREE.MeshBasicMaterial;
  private hairMaterial: THREE.MeshStandardMaterial;
  private cardiganMaterial: THREE.MeshStandardMaterial;
  private innerShirtMaterial: THREE.MeshStandardMaterial;
  private jeansMaterial: THREE.MeshStandardMaterial;
  private shoeMaterial: THREE.MeshStandardMaterial;
  private shoeSoleMaterial: THREE.MeshStandardMaterial;
  private shoeStripeMaterial: THREE.MeshStandardMaterial;
  private apronMaterial: THREE.MeshStandardMaterial;
  private goldMaterial: THREE.MeshStandardMaterial;
  private darkMetalMaterial: THREE.MeshStandardMaterial;
  private shadowMaterial: THREE.MeshBasicMaterial;

  private canvasWidth: number = 220;
  private canvasHeight: number = 280;

  private constructor() {
    // 1. Offscreen WebGL renderer with alpha transparency
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.canvasWidth, this.canvasHeight, false);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    // 2. Isometric Orthographic Camera
    const frustumSize = 2.45;
    const aspect = this.canvasWidth / this.canvasHeight;
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.set(3.2, 3.3, 3.2);
    this.camera.lookAt(0, 0.04, 0);

    // 3. Studio 3-Point Lighting (Natural, flattering soft illumination)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(4, 7, 3);
    this.scene.add(keyLight);

    const fillLight = new THREE.AmbientLight(0xfff5f5, 1.45);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfce7f3, 1.35);
    rimLight.position.set(-3.5, 4.5, -4);
    this.scene.add(rimLight);

    // 4. Realistic Materials Setup
    this.skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdfcb, // Natural warm porcelain skin tone
      roughness: 0.50,
      metalness: 0.03
    });

    this.scleraMaterial = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.irisMaterial = new THREE.MeshBasicMaterial({ color: 0x451a03 }); // Rich warm hazel-brown iris
    this.pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x09090b }); // Dark pupil
    this.eyelinerMaterial = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

    this.lipMaterial = new THREE.MeshStandardMaterial({
      color: 0xbe185d, // Natural rose lip tint with subtle satin gloss
      roughness: 0.25,
      metalness: 0.06
    });

    this.eyebrowMaterial = new THREE.MeshBasicMaterial({ color: 0x24140e });

    this.hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b1d11, // Rich glossy chestnut brown hair
      roughness: 0.32,
      metalness: 0.14
    });

    this.cardiganMaterial = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Designer Rose/Pink Cardigan
      roughness: 0.65,
      metalness: 0.04
    });

    this.innerShirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pure white inner top
      roughness: 0.72,
      metalness: 0.02
    });

    this.jeansMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Classic Indigo Denim Blue
      roughness: 0.75,
      metalness: 0.04
    });

    this.shoeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White leather sneaker upper
      roughness: 0.36,
      metalness: 0.08
    });

    this.shoeSoleMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean light-grey rubber sole
      roughness: 0.6,
      metalness: 0.05
    });

    this.shoeStripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.4,
      metalness: 0.15
    });

    this.apronMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Professional matte black/charcoal salon apron
      roughness: 0.55,
      metalness: 0.06
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Polished gold hardware & shears
      roughness: 0.20,
      metalness: 0.90
    });

    this.darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.5
    });

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22
    });

    // 5. Build Realistic 3D Character Model
    this.characterRoot = new THREE.Group();
    this.scene.add(this.characterRoot);

    // Ground Contact Drop Shadow
    const shadowGeom = new THREE.CircleGeometry(0.24, 16);
    this.shadowMesh = new THREE.Mesh(shadowGeom, this.shadowMaterial);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = -0.71;
    this.characterRoot.add(this.shadowMesh);

    this.hips = new THREE.Group();
    this.characterRoot.add(this.hips);

    // Pelvis (natural feminine hips)
    const pelvisGeom = new THREE.CylinderGeometry(0.17, 0.15, 0.15, 16);
    this.pelvisMesh = new THREE.Mesh(pelvisGeom, this.jeansMaterial);
    this.pelvisMesh.position.y = 0;
    this.hips.add(this.pelvisMesh);

    // Torso Group
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 0.075;
    this.hips.add(this.torsoGroup);

    // Inner White Camisole / Tee
    const innerShirtGeom = new THREE.CylinderGeometry(0.18, 0.16, 0.34, 16);
    this.innerShirtMesh = new THREE.Mesh(innerShirtGeom, this.innerShirtMaterial);
    this.innerShirtMesh.position.y = 0.17;
    this.torsoGroup.add(this.innerShirtMesh);

    // Fitted Cardigan / Jacket
    const chestGeom = new THREE.CylinderGeometry(0.195, 0.175, 0.33, 16, 1, false, -Math.PI * 0.44, Math.PI * 0.88);
    this.chestMesh = new THREE.Mesh(chestGeom, this.cardiganMaterial);
    this.chestMesh.position.y = 0.17;
    this.torsoGroup.add(this.chestMesh);

    // Cardigan Gold Buttons
    this.cardiganButtons = [];
    for (let i = 0; i < 3; i++) {
      const btnGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 8);
      const btn = new THREE.Mesh(btnGeom, this.goldMaterial);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.10 + i * 0.07, 0.19);
      this.torsoGroup.add(btn);
      this.cardiganButtons.push(btn);
    }

    // Stylist Apron Overlay
    const apronGeom = new THREE.CylinderGeometry(0.20, 0.18, 0.35, 16);
    this.apronMesh = new THREE.Mesh(apronGeom, this.apronMaterial);
    this.apronMesh.position.y = 0.17;
    this.apronMesh.visible = false;
    this.torsoGroup.add(this.apronMesh);

    const pocketGeom = new THREE.BoxGeometry(0.17, 0.09, 0.02);
    this.apronPocket = new THREE.Mesh(pocketGeom, this.apronMaterial); // matching apron material
    this.apronPocket.position.set(0, 0.11, 0.195);
    this.apronPocket.visible = false;
    this.torsoGroup.add(this.apronPocket);

    const emblemGeom = new THREE.SphereGeometry(0.022, 8, 8);
    this.apronEmblem = new THREE.Mesh(emblemGeom, this.goldMaterial);
    this.apronEmblem.position.set(0, 0.25, 0.195);
    this.apronEmblem.visible = false;
    this.torsoGroup.add(this.apronEmblem);

    // Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.41;
    this.torsoGroup.add(this.headGroup);

    // Natural Slender Neck
    const neckGeom = new THREE.CylinderGeometry(0.065, 0.078, 0.13, 14);
    this.neckMesh = new THREE.Mesh(neckGeom, this.skinMaterial);
    this.neckMesh.position.y = -0.01;
    this.headGroup.add(this.neckMesh);

    // Realistic Head Sculpt (Oval cranium + tapered jaw + delicate chin)
    const craniumGeom = new THREE.SphereGeometry(0.185, 20, 18);
    craniumGeom.scale(1.0, 1.10, 1.0);
    this.headCranium = new THREE.Mesh(craniumGeom, this.skinMaterial);
    this.headCranium.position.set(0, 0.14, 0.01);
    this.headGroup.add(this.headCranium);

    const jawGeom = new THREE.CylinderGeometry(0.165, 0.105, 0.14, 16);
    this.jawMesh = new THREE.Mesh(jawGeom, this.skinMaterial);
    this.jawMesh.position.set(0, 0.055, 0.025);
    this.headGroup.add(this.jawMesh);

    const chinGeom = new THREE.SphereGeometry(0.062, 12, 10);
    this.chinMesh = new THREE.Mesh(chinGeom, this.skinMaterial);
    this.chinMesh.position.set(0, -0.01, 0.085);
    this.headGroup.add(this.chinMesh);

    // 6. Realistic Almond-Shaped Human Eyes
    const scleraGeom = new THREE.SphereGeometry(0.033, 14, 12);
    scleraGeom.scale(1.22, 0.78, 0.65);

    this.leftSclera = new THREE.Mesh(scleraGeom, this.scleraMaterial);
    this.leftSclera.position.set(0.072, 0.142, 0.176);
    this.headGroup.add(this.leftSclera);

    this.rightSclera = new THREE.Mesh(scleraGeom, this.scleraMaterial);
    this.rightSclera.position.set(-0.072, 0.142, 0.176);
    this.headGroup.add(this.rightSclera);

    // Natural Iris & Pupil
    const irisGeom = new THREE.CircleGeometry(0.020, 14);
    this.leftIris = new THREE.Mesh(irisGeom, this.irisMaterial);
    this.leftIris.position.set(0, 0, 0.023);
    this.leftSclera.add(this.leftIris);

    this.rightIris = new THREE.Mesh(irisGeom, this.irisMaterial);
    this.rightIris.position.set(0, 0, 0.023);
    this.rightSclera.add(this.rightIris);

    const pupilGeom = new THREE.CircleGeometry(0.010, 10);
    this.leftPupil = new THREE.Mesh(pupilGeom, this.pupilMaterial);
    this.leftPupil.position.set(0, 0, 0.002);
    this.leftIris.add(this.leftPupil);

    this.rightPupil = new THREE.Mesh(pupilGeom, this.pupilMaterial);
    this.rightPupil.position.set(0, 0, 0.002);
    this.rightIris.add(this.rightPupil);

    // Subtle natural cornea gleam
    const glintGeom = new THREE.CircleGeometry(0.0045, 8);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.leftGlint = new THREE.Mesh(glintGeom, glintMat);
    this.leftGlint.position.set(0.005, 0.005, 0.003);
    this.leftPupil.add(this.leftGlint);

    this.rightGlint = new THREE.Mesh(glintGeom, glintMat);
    this.rightGlint.position.set(0.005, 0.005, 0.003);
    this.rightPupil.add(this.rightGlint);

    // Upper Eyelid / Lash Line (defines realistic eye contour)
    const lashGeom = new THREE.TorusGeometry(0.036, 0.0045, 4, 12, Math.PI * 0.7);
    this.leftEyeliner = new THREE.Mesh(lashGeom, this.eyelinerMaterial);
    this.leftEyeliner.rotation.x = Math.PI / 2 + 0.15;
    this.leftEyeliner.rotation.z = -0.15;
    this.leftEyeliner.position.set(0.072, 0.158, 0.177);
    this.headGroup.add(this.leftEyeliner);

    this.rightEyeliner = new THREE.Mesh(lashGeom, this.eyelinerMaterial);
    this.rightEyeliner.rotation.x = Math.PI / 2 + 0.15;
    this.rightEyeliner.rotation.z = 0.15;
    this.rightEyeliner.position.set(-0.072, 0.158, 0.177);
    this.headGroup.add(this.rightEyeliner);

    // Refined Natural Eyebrows (tapered at outer edges)
    const browGeom = new THREE.CylinderGeometry(0.0045, 0.0022, 0.072, 6);
    this.browL = new THREE.Mesh(browGeom, this.eyebrowMaterial);
    this.browL.rotation.z = -0.18;
    this.browL.position.set(0.072, 0.192, 0.183);
    this.headGroup.add(this.browL);

    this.browR = new THREE.Mesh(browGeom, this.eyebrowMaterial);
    this.browR.rotation.z = 0.18;
    this.browR.position.set(-0.072, 0.192, 0.183);
    this.headGroup.add(this.browR);

    // 7. Realistic 3D Nose Bridge & Tip
    const noseBridgeGeom = new THREE.CylinderGeometry(0.009, 0.017, 0.075, 8);
    this.noseBridge = new THREE.Mesh(noseBridgeGeom, this.skinMaterial);
    this.noseBridge.rotation.x = -0.18;
    this.noseBridge.position.set(0, 0.095, 0.188);
    this.headGroup.add(this.noseBridge);

    const noseTipGeom = new THREE.SphereGeometry(0.015, 8, 8);
    this.noseTip = new THREE.Mesh(noseTipGeom, this.skinMaterial);
    this.noseTip.position.set(0, 0.052, 0.198);
    this.headGroup.add(this.noseTip);

    // 8. Realistic Natural Lips
    const upperLipGeom = new THREE.TorusGeometry(0.026, 0.007, 6, 12, Math.PI * 0.72);
    this.upperLip = new THREE.Mesh(upperLipGeom, this.lipMaterial);
    this.upperLip.rotation.x = Math.PI / 2 + 0.25;
    this.upperLip.position.set(0, 0.020, 0.178);
    this.headGroup.add(this.upperLip);

    const lowerLipGeom = new THREE.CapsuleGeometry(0.009, 0.032, 6, 10);
    this.lowerLip = new THREE.Mesh(lowerLipGeom, this.lipMaterial);
    this.lowerLip.rotation.z = Math.PI / 2;
    this.lowerLip.position.set(0, 0.005, 0.174);
    this.headGroup.add(this.lowerLip);

    // 9. Realistic Hair Architecture (Curtain bangs, natural parted crown, flowing waves)
    this.hairGroup = new THREE.Group();
    this.headGroup.add(this.hairGroup);

    // Hair Cap hugging cranium naturally with center parting
    const hairCapGeom = new THREE.SphereGeometry(0.20, 22, 18);
    hairCapGeom.scale(1.04, 1.08, 1.02);
    this.hairCapMesh = new THREE.Mesh(hairCapGeom, this.hairMaterial);
    this.hairCapMesh.position.set(0, 0.165, 0.01);
    this.hairGroup.add(this.hairCapMesh);

    // Back Hair Volume flowing behind shoulders
    const hairBackGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.32, 16);
    this.hairBackMesh = new THREE.Mesh(hairBackGeom, this.hairMaterial);
    this.hairBackMesh.position.set(0, 0.06, -0.06);
    this.hairGroup.add(this.hairBackMesh);

    // Gorgeous Curtain Bangs (frames the forehead gracefully, eliminates bare forehead!)
    const curtainGeom = new THREE.CapsuleGeometry(0.040, 0.16, 8, 12);
    this.hairCurtainLeft = new THREE.Mesh(curtainGeom, this.hairMaterial);
    this.hairCurtainLeft.position.set(0.065, 0.22, 0.165);
    this.hairCurtainLeft.rotation.set(-0.25, 0.15, -0.45);
    this.hairGroup.add(this.hairCurtainLeft);

    this.hairCurtainRight = new THREE.Mesh(curtainGeom, this.hairMaterial);
    this.hairCurtainRight.position.set(-0.065, 0.22, 0.165);
    this.hairCurtainRight.rotation.set(-0.25, -0.15, 0.45);
    this.hairGroup.add(this.hairCurtainRight);

    // Flowing Side Waves (draping past the ears and cheekbones)
    const sideWaveGeom = new THREE.CapsuleGeometry(0.060, 0.24, 8, 12);
    this.hairSideWaveL = new THREE.Mesh(sideWaveGeom, this.hairMaterial);
    this.hairSideWaveL.position.set(0.16, 0.11, 0.07);
    this.hairSideWaveL.rotation.set(0.10, 0, -0.22);
    this.hairGroup.add(this.hairSideWaveL);

    this.hairSideWaveR = new THREE.Mesh(sideWaveGeom, this.hairMaterial);
    this.hairSideWaveR.position.set(-0.16, 0.11, 0.07);
    this.hairSideWaveR.rotation.set(0.10, 0, 0.22);
    this.hairGroup.add(this.hairSideWaveR);

    // Front Shoulder Strands (natural forward drape)
    const strandGeom = new THREE.CapsuleGeometry(0.042, 0.22, 6, 10);
    this.hairStrandL = new THREE.Mesh(strandGeom, this.hairMaterial);
    this.hairStrandL.position.set(0.14, -0.03, 0.08);
    this.hairStrandL.rotation.z = -0.10;
    this.hairGroup.add(this.hairStrandL);

    this.hairStrandR = new THREE.Mesh(strandGeom, this.hairMaterial);
    this.hairStrandR.position.set(-0.14, -0.03, 0.08);
    this.hairStrandR.rotation.z = 0.10;
    this.hairGroup.add(this.hairStrandR);

    // Stylist Professional Updo / Chignon Bun
    const bunGeom = new THREE.SphereGeometry(0.125, 16, 14);
    this.stylistBunMesh = new THREE.Mesh(bunGeom, this.hairMaterial);
    this.stylistBunMesh.position.set(0, 0.40, -0.07);
    this.stylistBunMesh.visible = false;
    this.hairGroup.add(this.stylistBunMesh);

    const pinGeom = new THREE.CylinderGeometry(0.007, 0.007, 0.22, 8);
    this.stylistPinMesh = new THREE.Mesh(pinGeom, this.goldMaterial);
    this.stylistPinMesh.position.set(0, 0.40, -0.07);
    this.stylistPinMesh.rotation.z = Math.PI * 0.35;
    this.stylistPinMesh.visible = false;
    this.hairGroup.add(this.stylistPinMesh);

    // 10. Limbs & Skeleton
    // Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(0.23, 0.30, 0);
    this.torsoGroup.add(this.leftArmGroup);

    const armGeom = new THREE.CylinderGeometry(0.052, 0.046, 0.22, 10);
    this.leftUpperArm = new THREE.Mesh(armGeom, this.cardiganMaterial);
    this.leftUpperArm.position.y = -0.11;
    this.leftArmGroup.add(this.leftUpperArm);

    this.leftLowerArmGroup = new THREE.Group();
    this.leftLowerArmGroup.position.y = -0.22;
    this.leftArmGroup.add(this.leftLowerArmGroup);

    const lowerArmGeom = new THREE.CylinderGeometry(0.044, 0.038, 0.20, 10);
    this.leftLowerArm = new THREE.Mesh(lowerArmGeom, this.skinMaterial);
    this.leftLowerArm.position.y = -0.10;
    this.leftLowerArmGroup.add(this.leftLowerArm);

    const handGeom = new THREE.SphereGeometry(0.042, 10, 10);
    this.leftHand = new THREE.Mesh(handGeom, this.skinMaterial);
    this.leftHand.position.y = -0.21;
    this.leftLowerArmGroup.add(this.leftHand);

    // Stylist Comb
    const combGeom = new THREE.BoxGeometry(0.026, 0.15, 0.010);
    this.combMesh = new THREE.Mesh(combGeom, this.darkMetalMaterial);
    this.combMesh.position.set(0, -0.22, 0.05);
    this.combMesh.visible = false;
    this.leftLowerArmGroup.add(this.combMesh);

    // Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(-0.23, 0.30, 0);
    this.torsoGroup.add(this.rightArmGroup);

    this.rightUpperArm = new THREE.Mesh(armGeom, this.cardiganMaterial);
    this.rightUpperArm.position.y = -0.11;
    this.rightArmGroup.add(this.rightUpperArm);

    this.rightLowerArmGroup = new THREE.Group();
    this.rightLowerArmGroup.position.y = -0.22;
    this.rightArmGroup.add(this.rightLowerArmGroup);

    this.rightLowerArm = new THREE.Mesh(lowerArmGeom, this.skinMaterial);
    this.rightLowerArm.position.y = -0.10;
    this.rightLowerArmGroup.add(this.rightLowerArm);

    this.rightHand = new THREE.Mesh(handGeom, this.skinMaterial);
    this.rightHand.position.y = -0.21;
    this.rightLowerArmGroup.add(this.rightHand);

    // Stylist Scissors (Golden Salon Shears)
    this.scissorsGroup = new THREE.Group();
    this.scissorsGroup.position.set(0, -0.22, 0.05);
    this.scissorsGroup.visible = false;
    this.rightLowerArmGroup.add(this.scissorsGroup);

    const bladeGeom = new THREE.BoxGeometry(0.014, 0.17, 0.010);
    this.scissorBlade1 = new THREE.Mesh(bladeGeom, this.goldMaterial);
    this.scissorBlade1.rotation.z = 0.26;
    this.scissorBlade2 = new THREE.Mesh(bladeGeom, this.goldMaterial);
    this.scissorBlade2.rotation.z = -0.26;
    this.scissorsGroup.add(this.scissorBlade1);
    this.scissorsGroup.add(this.scissorBlade2);

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(0.095, -0.06, 0);
    this.hips.add(this.leftLegGroup);

    const thighGeom = new THREE.CylinderGeometry(0.072, 0.058, 0.32, 12);
    this.leftThigh = new THREE.Mesh(thighGeom, this.jeansMaterial);
    this.leftThigh.position.y = -0.16;
    this.leftLegGroup.add(this.leftThigh);

    this.leftShinGroup = new THREE.Group();
    this.leftShinGroup.position.y = -0.32;
    this.leftLegGroup.add(this.leftShinGroup);

    const shinGeom = new THREE.CylinderGeometry(0.058, 0.048, 0.32, 12);
    this.leftShin = new THREE.Mesh(shinGeom, this.jeansMaterial);
    this.leftShin.position.y = -0.16;
    this.leftShinGroup.add(this.leftShin);

    // White Sneaker with Clean Sole & Accent Stripe
    const shoeGeom = new THREE.BoxGeometry(0.090, 0.075, 0.18);
    this.leftShoe = new THREE.Mesh(shoeGeom, this.shoeMaterial);
    this.leftShoe.position.set(0, -0.33, 0.04);
    this.leftShinGroup.add(this.leftShoe);

    const soleGeom = new THREE.BoxGeometry(0.094, 0.020, 0.185);
    this.leftShoeSole = new THREE.Mesh(soleGeom, this.shoeSoleMaterial);
    this.leftShoeSole.position.set(0, -0.37, 0.04);
    this.leftShinGroup.add(this.leftShoeSole);

    const stripeGeom = new THREE.BoxGeometry(0.094, 0.020, 0.11);
    const leftStripe = new THREE.Mesh(stripeGeom, this.shoeStripeMaterial);
    leftStripe.position.set(0, -0.32, 0.03);
    this.leftShinGroup.add(leftStripe);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(-0.095, -0.06, 0);
    this.hips.add(this.rightLegGroup);

    this.rightThigh = new THREE.Mesh(thighGeom, this.jeansMaterial);
    this.rightThigh.position.y = -0.16;
    this.rightLegGroup.add(this.rightThigh);

    this.rightShinGroup = new THREE.Group();
    this.rightShinGroup.position.y = -0.32;
    this.rightLegGroup.add(this.rightShinGroup);

    this.rightShin = new THREE.Mesh(shinGeom, this.jeansMaterial);
    this.rightShin.position.y = -0.16;
    this.rightShinGroup.add(this.rightShin);

    this.rightShoe = new THREE.Mesh(shoeGeom, this.shoeMaterial);
    this.rightShoe.position.set(0, -0.33, 0.04);
    this.rightShinGroup.add(this.rightShoe);

    this.rightShoeSole = new THREE.Mesh(soleGeom, this.shoeSoleMaterial);
    this.rightShoeSole.position.set(0, -0.37, 0.04);
    this.rightShinGroup.add(this.rightShoeSole);

    const rightStripe = new THREE.Mesh(stripeGeom, this.shoeStripeMaterial);
    rightStripe.position.set(0, -0.32, 0.03);
    this.rightShinGroup.add(rightStripe);
  }

  public static getInstance(): Character3DRenderer {
    if (!Character3DRenderer.instance) {
      Character3DRenderer.instance = new Character3DRenderer();
    }
    return Character3DRenderer.instance;
  }

  public renderCharacter(
    state: CharacterState,
    walkPhase: number = 0,
    walkAngleRad: number = 0,
    isStylist: boolean = false,
    hairColorHex?: string,
    avatarColorHex?: string
  ): HTMLCanvasElement {
    // 1. Reset Transforms
    this.hips.position.set(0, 0, 0);
    this.torsoGroup.rotation.set(0, 0, 0);
    this.headGroup.position.set(0, 0.41, 0);
    this.headGroup.rotation.set(0, 0, 0);

    this.leftArmGroup.rotation.set(0, 0, 0);
    this.leftLowerArmGroup.rotation.set(0, 0, 0);
    this.rightArmGroup.rotation.set(0, 0, 0);
    this.rightLowerArmGroup.rotation.set(0, 0, 0);

    this.leftLegGroup.position.set(0.095, -0.06, 0);
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.leftShinGroup.rotation.set(0, 0, 0);

    this.rightLegGroup.position.set(-0.095, -0.06, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);
    this.rightShinGroup.rotation.set(0, 0, 0);

    this.chestMesh.scale.set(1, 1, 1);
    this.shadowMesh.visible = (state !== 'sit_sofa' && state !== 'sit_chair');

    // 2. Configure Role & Outfit
    if (isStylist) {
      this.apronMesh.visible = true;
      this.apronPocket.visible = true;
      this.apronEmblem.visible = true;
      this.stylistBunMesh.visible = true;
      this.stylistPinMesh.visible = true;
      this.scissorsGroup.visible = (state === 'service');
      this.combMesh.visible = (state === 'service');

      this.hairStrandL.visible = false;
      this.hairStrandR.visible = false;
      this.hairBackMesh.visible = false; // hair is up in bun
      this.cardiganButtons.forEach(b => b.visible = false);

      // Stylist professional sleek dark espresso hair & matte charcoal apron
      this.hairMaterial.color.set(0x24140e);
      this.eyebrowMaterial.color.set(0x24140e);
      this.chestMesh.material = this.apronMaterial;
      this.pelvisMesh.material = this.apronMaterial;
      this.leftThigh.material = this.apronMaterial;
      this.rightThigh.material = this.apronMaterial;
      this.leftShin.material = this.apronMaterial;
      this.rightShin.material = this.apronMaterial;
      this.leftUpperArm.material = this.apronMaterial;
      this.rightUpperArm.material = this.apronMaterial;
    } else {
      this.apronMesh.visible = false;
      this.apronPocket.visible = false;
      this.apronEmblem.visible = false;
      this.stylistBunMesh.visible = false;
      this.stylistPinMesh.visible = false;
      this.scissorsGroup.visible = false;
      this.combMesh.visible = false;

      this.hairStrandL.visible = true;
      this.hairStrandR.visible = true;
      this.hairBackMesh.visible = true;
      this.cardiganButtons.forEach(b => b.visible = true);

      this.chestMesh.material = this.cardiganMaterial;
      this.pelvisMesh.material = this.jeansMaterial;
      this.leftThigh.material = this.jeansMaterial;
      this.rightThigh.material = this.jeansMaterial;
      this.leftShin.material = this.jeansMaterial;
      this.rightShin.material = this.jeansMaterial;
      this.leftUpperArm.material = this.cardiganMaterial;
      this.rightUpperArm.material = this.cardiganMaterial;

      if (avatarColorHex) {
        this.cardiganMaterial.color.set(avatarColorHex);
        this.shoeStripeMaterial.color.set(avatarColorHex);
      } else {
        this.cardiganMaterial.color.set(0xf472b6);
        this.shoeStripeMaterial.color.set(0xf472b6);
      }

      if (hairColorHex) {
        this.hairMaterial.color.set(hairColorHex);
        this.eyebrowMaterial.color.set(hairColorHex);
      } else {
        this.hairMaterial.color.set(0x3b1d11);
        this.eyebrowMaterial.color.set(0x3b1d11);
      }
    }

    // 3. Apply 3D Directional Orientation & Animation State
    if (state === 'walk') {
      // 3D DIRECTIONAL WALKING: Character physically turns to face movement vector!
      this.characterRoot.rotation.y = (3 * Math.PI / 4) - walkAngleRad;

      const p = walkPhase;
      const stride = 0.54;

      // Realistic leg stride
      this.leftLegGroup.rotation.x = Math.sin(p) * stride;
      this.rightLegGroup.rotation.x = -Math.sin(p) * stride;

      // Natural knee flexion on backswing
      this.leftShinGroup.rotation.x = Math.max(0, -Math.sin(p) * 0.68);
      this.rightShinGroup.rotation.x = Math.max(0, Math.sin(p) * 0.68);

      // Natural counter-arm swinging
      this.leftArmGroup.rotation.x = -Math.sin(p) * 0.44;
      this.rightArmGroup.rotation.x = Math.sin(p) * 0.44;

      // Subtle elbow flex
      this.leftLowerArmGroup.rotation.x = Math.max(0, -Math.sin(p) * 0.32);
      this.rightLowerArmGroup.rotation.x = Math.max(0, Math.sin(p) * 0.32);

      // Torso pelvic sway and heel-strike vertical bounce
      this.hips.position.y = -Math.abs(Math.sin(p * 2)) * 0.035;
      this.torsoGroup.rotation.z = Math.sin(p) * 0.035;
      this.headGroup.rotation.y = -Math.sin(p) * 0.025;
    } else if (state === 'sit_sofa') {
      // FULL-BODY CROSSED-LEGS SEATING ON WAITING SOFA ARMCHAIR
      // Sofa armchair faces towards the front-right of the salon room
      this.characterRoot.rotation.y = Math.PI * 0.58;

      // Lower hips onto the plush velvet cushion
      this.hips.position.y = -0.22;

      // Left leg: bent forward at 90 deg, resting on chair
      this.leftLegGroup.rotation.x = -Math.PI * 0.48;
      this.leftLegGroup.rotation.y = -0.14;
      this.leftShinGroup.rotation.x = Math.PI * 0.48;

      // Right leg: ELEGANTLY CROSSED OVER LEFT KNEE ("bacak bacak üstüne atma")
      this.rightLegGroup.position.set(-0.03, 0.04, 0.06);
      this.rightLegGroup.rotation.x = -Math.PI * 0.46;
      this.rightLegGroup.rotation.z = -0.38;
      this.rightShinGroup.rotation.x = Math.PI * 0.42;
      this.rightShinGroup.rotation.z = 0.22;

      // Upper body: relaxed posture with hands resting peacefully in lap
      this.torsoGroup.rotation.x = 0.06;
      this.leftArmGroup.rotation.set(-0.58, 0.24, 0.22);
      this.leftLowerArmGroup.rotation.set(-0.25, 0.42, 0);

      this.rightArmGroup.rotation.set(-0.58, -0.24, -0.22);
      this.rightLowerArmGroup.rotation.set(-0.25, -0.42, 0);

      this.headGroup.rotation.set(0.04, 0.10, 0.05);
    } else if (state === 'sit_chair') {
      // FULL-BODY SEATING ON HAIRDRESSER HYDRAULIC CHAIR
      // Facing top-left diagonal (sol üst çapraz) towards the station mirror
      this.characterRoot.rotation.y = -Math.PI * 0.56;

      // Lower hips squarely onto the hydraulic chair cushion
      this.hips.position.y = -0.22;

      // Natural upright seated salon posture facing the styling mirror
      // Left leg: bent 90 deg forward onto footrest under styling counter
      this.leftLegGroup.position.set(0.08, -0.06, 0);
      this.leftLegGroup.rotation.set(-Math.PI * 0.48, -0.06, 0);
      this.leftShinGroup.rotation.set(Math.PI * 0.48, 0, 0);

      // Right leg: bent 90 deg forward onto footrest under styling counter
      this.rightLegGroup.position.set(-0.08, -0.06, 0);
      this.rightLegGroup.rotation.set(-Math.PI * 0.48, 0.06, 0);
      this.rightShinGroup.rotation.set(Math.PI * 0.48, 0, 0);

      // Upright back posture for haircut consultation
      this.torsoGroup.rotation.set(0.03, 0, 0);

      // Relaxed arms resting on salon chair armrests / lap
      this.leftArmGroup.rotation.set(-0.48, 0.16, 0.18);
      this.leftLowerArmGroup.rotation.set(-0.35, 0.28, 0);

      this.rightArmGroup.rotation.set(-0.48, -0.16, -0.18);
      this.rightLowerArmGroup.rotation.set(-0.35, -0.28, 0);

      // Head upright, looking straight ahead into the mirror
      this.headGroup.rotation.set(0.02, 0.02, 0);
    } else if (state === 'service') {
      // Stylist active hairdressing pose with scissors & comb
      this.characterRoot.rotation.y = Math.PI * 0.85; // facing customer in chair
      const snip = Math.sin(walkPhase * 14);

      this.rightArmGroup.rotation.set(-1.18, -0.25, -0.32);
      this.rightLowerArmGroup.rotation.set(-0.42, -0.32, 0);
      this.scissorBlade1.rotation.z = 0.20 + snip * 0.25;
      this.scissorBlade2.rotation.z = -0.20 - snip * 0.25;

      this.leftArmGroup.rotation.set(-0.88, 0.35, 0.25);
      this.leftLowerArmGroup.rotation.set(-0.52, 0.42, 0);

      this.torsoGroup.rotation.y = Math.sin(walkPhase * 3) * 0.06;
    } else {
      // Idle standing
      this.characterRoot.rotation.y = Math.PI * 0.15;
      const breathe = Math.sin(walkPhase * 2) * 0.015;
      this.chestMesh.scale.set(1 + breathe, 1, 1 + breathe);
      this.headGroup.position.y = 0.41 + breathe * 0.4;
    }

    // 4. Render to transparent canvas
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }
}
