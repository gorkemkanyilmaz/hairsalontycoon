import * as THREE from 'three';
import { CharacterAnimState, Direction8, HairStyleType } from './CharacterTypes';
import { CharacterOrientationController } from './CharacterOrientationController';

export class SalonCharacter {
  public readonly id: string;
  public readonly name: string;
  public readonly model: THREE.Group;
  public readonly mixer: THREE.AnimationMixer;

  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimName: string = '';

  private currentHairStyle: HairStyleType = HairStyleType.LONG;
  private currentHairColor: string | number = '#4a2c11';
  private currentOutfitColor: string | number = '#ffffff';

  private currentHairMesh: THREE.Object3D | null = null;
  private headBone: THREE.Object3D | null = null;
  private orientationController: CharacterOrientationController;

  private hairTemplates: Map<HairStyleType, THREE.Object3D>;

  // Animation mapping from enum to clip name in UAL1_Standard.glb
  private static readonly ANIMATION_MAP: Record<CharacterAnimState, string> = {
    [CharacterAnimState.IDLE]: 'Idle_Loop',
    [CharacterAnimState.WALK]: 'Walk_Loop',
    [CharacterAnimState.SIT]: 'Sitting_Idle_Loop',
    [CharacterAnimState.STAND]: 'Idle_Loop',
    [CharacterAnimState.TALK]: 'Idle_Talking_Loop',
    [CharacterAnimState.INTERACT]: 'Interact'
  };

  constructor(
    id: string,
    name: string,
    model: THREE.Group,
    mixer: THREE.AnimationMixer,
    animationClips: THREE.AnimationClip[],
    hairTemplates: Map<HairStyleType, THREE.Object3D>
  ) {
    this.id = id;
    this.name = name;
    this.model = model;
    this.mixer = mixer;
    this.hairTemplates = hairTemplates;

    // Find Head Bone for hair attachment
    this.headBone = this.model.getObjectByName('Head') || null;

    // Initialize all animation clips into mixer actions
    animationClips.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });

    // Initialize Orientation Controller (Phase 4 & 5)
    this.orientationController = new CharacterOrientationController(this.model);
  }

  public playAnimation(animInput: CharacterAnimState | string, crossFadeDuration: number = 0.25): void {
    const targetClipName = SalonCharacter.ANIMATION_MAP[animInput as CharacterAnimState] || animInput;
    const nextAction = this.actions.get(targetClipName);

    if (!nextAction) {
      console.warn(`[SalonCharacter] Animation '${targetClipName}' not found on character '${this.name}'`);
      return;
    }

    if (this.currentAction === nextAction) {
      return;
    }

    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);

    if (this.currentAction) {
      this.currentAction.crossFadeTo(nextAction, crossFadeDuration, true);
      nextAction.reset().play();
    } else {
      nextAction.play();
    }

    this.currentAction = nextAction;
    this.currentAnimName = targetClipName;
  }

  public setHairStyle(style: HairStyleType): void {
    this.currentHairStyle = style;

    // 1. Remove previous hair mesh if any
    if (this.currentHairMesh) {
      if (this.currentHairMesh.parent) {
        this.currentHairMesh.parent.remove(this.currentHairMesh);
      }
      this.currentHairMesh = null;
    }

    const template = this.hairTemplates.get(style);
    if (!template) {
      console.warn(`[SalonCharacter] Hair template '${style}' not found.`);
      return;
    }

    // 2. Clone hair template
    const newHair = template.clone(true);
    this.currentHairMesh = newHair;

    // 3. Attach hair to character
    if (this.headBone) {
      // In Three.js, Object3D.attach preserves world transform while making it child of bone!
      this.model.add(newHair);
      this.headBone.attach(newHair);
    } else {
      this.model.add(newHair);
    }

    // 4. Re-apply current hair color to the new mesh
    this.applyHairColorToMesh(newHair, this.currentHairColor);
  }

  public setHairColor(color: string | number): void {
    this.currentHairColor = color;
    if (this.currentHairMesh) {
      this.applyHairColorToMesh(this.currentHairMesh, color);
    }

    // Also tint eyebrows to match hair color
    const eyebrows = this.model.getObjectByName('Eyebrows');
    if (eyebrows && (eyebrows as THREE.Mesh).isMesh) {
      const mesh = eyebrows as THREE.Mesh;
      mesh.material = (mesh.material as THREE.Material).clone();
      (mesh.material as THREE.MeshStandardMaterial).color.set(color);
    }
  }

  private applyHairColorToMesh(hairObj: THREE.Object3D, color: string | number): void {
    hairObj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = (mesh.material as THREE.Material).clone();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(color);
        mat.roughness = 0.45;
        mat.metalness = 0.05;
      }
    });
  }

  public setOutfitColor(color: string | number): void {
    this.currentOutfitColor = color;
    this.model.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.name === 'Superhero_Female') {
          mesh.material = (mesh.material as THREE.Material).clone();
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.set(color);
        }
      }
    });
  }

  public faceDirection(direction: Direction8, immediate: boolean = false): void {
    this.orientationController.setFacingDirection(direction, immediate);
  }

  public faceMovementDirection(directionVector: THREE.Vector3, immediate: boolean = false): void {
    this.orientationController.faceMovementDirection(directionVector, immediate);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.model.position.set(x, y, z);
  }

  public update(deltaSec: number): void {
    this.mixer.update(deltaSec);
    this.orientationController.update(deltaSec);
  }

  // Getters
  public get facingDirection(): Direction8 {
    return this.orientationController.getFacingDirection();
  }

  public get hairStyle(): HairStyleType {
    return this.currentHairStyle;
  }

  public get hairColor(): string | number {
    return this.currentHairColor;
  }

  public get outfitColor(): string | number {
    return this.currentOutfitColor;
  }

  public get currentAnimation(): string {
    return this.currentAnimName;
  }
}
