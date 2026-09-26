import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { HairStyleType, ISalonCharacterConfig } from './CharacterTypes';
import { SalonCharacter } from './SalonCharacter';

export class CharacterAssetManager {
  private static instance: CharacterAssetManager;
  private loader: GLTFLoader;

  private baseModelTemplate: THREE.Group | null = null;
  private hairTemplates: Map<HairStyleType, THREE.Object3D> = new Map();
  private animationClips: THREE.AnimationClip[] = [];
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  // Canonical character height in world units (Phase 6)
  public static readonly CANONICAL_HEIGHT: number = 1.8;

  private constructor() {
    this.loader = new GLTFLoader();
  }

  public static getInstance(): CharacterAssetManager {
    if (!CharacterAssetManager.instance) {
      CharacterAssetManager.instance = new CharacterAssetManager();
    }
    return CharacterAssetManager.instance;
  }

  public async loadAllAssets(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      console.log('📦 Loading Quaternius 3D Character Pipeline Assets...');

      const baseGltfUrl = new URL('../../assets/characters/quaternius/base/Female_Base.gltf', import.meta.url).href;
      const animGlbUrl = new URL('../../assets/characters/quaternius/animations/UAL1_Standard.glb', import.meta.url).href;

      const hairUrls: Record<HairStyleType, string> = {
        [HairStyleType.LONG]: new URL('../../assets/characters/quaternius/hair/Hair_Long.gltf', import.meta.url).href,
        [HairStyleType.BUNS]: new URL('../../assets/characters/quaternius/hair/Hair_Buns.gltf', import.meta.url).href,
        [HairStyleType.SIMPLE_PARTED]: new URL('../../assets/characters/quaternius/hair/Hair_SimpleParted.gltf', import.meta.url).href,
        [HairStyleType.BUZZED]: new URL('../../assets/characters/quaternius/hair/Hair_BuzzedFemale.gltf', import.meta.url).href,
      };

      // 1. Load Base Female Character
      const baseGltf = await this.loader.loadAsync(baseGltfUrl);
      this.baseModelTemplate = baseGltf.scene;

      // Enable shadows and setup materials on base template
      this.baseModelTemplate.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).roughness = 0.55;
          }
        }
      });

      // 2. Load Animations
      const animGlb = await this.loader.loadAsync(animGlbUrl);
      this.animationClips = animGlb.animations;
      console.log(`🎬 Loaded ${this.animationClips.length} animation clips from UAL1_Standard.glb`);

      // 3. Load Hair Styles
      for (const [type, url] of Object.entries(hairUrls)) {
        try {
          const hairGltf = await this.loader.loadAsync(url);
          const hairMesh = hairGltf.scene;
          hairMesh.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
            }
          });
          this.hairTemplates.set(type as HairStyleType, hairMesh);
        } catch (e) {
          console.warn(`Could not load hairstyle ${type}:`, e);
        }
      }

      this.isLoaded = true;
      console.log('✅ Quaternius 3D Character Pipeline Loaded Successfully!');
    })();

    return this.loadPromise;
  }

  public createCharacter(config: ISalonCharacterConfig): SalonCharacter {
    if (!this.baseModelTemplate) {
      throw new Error('Character assets not loaded yet. Call loadAllAssets() first.');
    }

    // 1. Rigged Model Cloning via SkeletonUtils (Phase 8)
    const clonedRoot = SkeletonUtils.clone(this.baseModelTemplate) as THREE.Group;

    // 2. Normalize Character Scale to Canonical Height (Phase 6)
    this.normalizeCharacterScale(clonedRoot);

    // 3. Create dedicated AnimationMixer for this cloned instance
    const mixer = new THREE.AnimationMixer(clonedRoot);

    // 4. Instantiation of SalonCharacter wrapper
    const character = new SalonCharacter(
      config.id,
      config.name,
      clonedRoot,
      mixer,
      this.animationClips,
      this.hairTemplates
    );

    // 5. Apply Initial Customizations
    character.setHairStyle(config.hairStyle);
    character.setHairColor(config.hairColor);
    character.setOutfitColor(config.outfitColor);

    if (config.position) {
      character.setPosition(config.position.x, config.position.y, config.position.z);
    }
    if (config.initialDirection) {
      character.faceDirection(config.initialDirection, true);
    }
    if (config.initialAnimation) {
      character.playAnimation(config.initialAnimation);
    }

    return character;
  }

  // Phase 6: Canonical Character Height Normalization
  private normalizeCharacterScale(model: THREE.Object3D): void {
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const currentHeight = size.y;

    if (currentHeight > 0) {
      const scale = CharacterAssetManager.CANONICAL_HEIGHT / currentHeight;
      model.scale.set(scale, scale, scale);
    }
  }

  public getAnimationClips(): THREE.AnimationClip[] {
    return this.animationClips;
  }
}
