import * as THREE from 'three';
import { Direction8 } from './CharacterTypes';

export class CharacterOrientationController {
  private target: THREE.Object3D;
  private currentDirection: Direction8 = Direction8.SOUTH;
  private targetAngleRad: number = 0;
  private turnSpeed: number = 14; // rad/sec for smooth rotation

  // Direction to angle (radians) mapping based on Model Rest Pose (+Z = Forward)
  private static readonly DIRECTION_ANGLES: Record<Direction8, number> = {
    [Direction8.SOUTH]: 0,
    [Direction8.SOUTH_EAST]: -Math.PI * 0.25,
    [Direction8.EAST]: -Math.PI * 0.5,
    [Direction8.NORTH_EAST]: -Math.PI * 0.75,
    [Direction8.NORTH]: Math.PI,
    [Direction8.NORTH_WEST]: Math.PI * 0.75,
    [Direction8.WEST]: Math.PI * 0.5,
    [Direction8.SOUTH_WEST]: Math.PI * 0.25
  };

  constructor(target: THREE.Object3D) {
    this.target = target;
    this.setFacingDirection(Direction8.SOUTH, true);
  }

  public setFacingDirection(direction: Direction8, immediate: boolean = false): void {
    this.currentDirection = direction;
    this.targetAngleRad = CharacterOrientationController.DIRECTION_ANGLES[direction] ?? 0;

    if (immediate) {
      this.target.rotation.y = this.targetAngleRad;
    }
  }

  public faceMovementDirection(directionVector: THREE.Vector3, immediate: boolean = false): void {
    if (directionVector.lengthSq() < 0.0001) return;

    // In Three.js: Forward is +Z, Right is +X.
    // atan2(dx, dz) gives 0 when dx=0, dz>0 (+Z / South), PI/2 when dx>0, dz=0 (+X / East), etc.
    const angle = Math.atan2(directionVector.x, directionVector.z);
    this.targetAngleRad = angle;

    // Also map to closest Direction8 for state tracking
    this.currentDirection = this.getClosestDirection8(angle);

    if (immediate) {
      this.target.rotation.y = this.targetAngleRad;
    }
  }

  public getClosestDirection8(angleRad: number): Direction8 {
    let normalized = angleRad % (Math.PI * 2);
    if (normalized < -Math.PI) normalized += Math.PI * 2;
    if (normalized > Math.PI) normalized -= Math.PI * 2;

    let closest = Direction8.SOUTH;
    let minDiff = Infinity;

    for (const [dir, angle] of Object.entries(CharacterOrientationController.DIRECTION_ANGLES)) {
      let diff = Math.abs(normalized - angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        closest = dir as Direction8;
      }
    }
    return closest;
  }

  public update(deltaSec: number): void {
    let current = this.target.rotation.y;
    let target = this.targetAngleRad;

    // Find shortest angular path
    let diff = (target - current) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;

    if (Math.abs(diff) > 0.001) {
      const step = Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed * deltaSec);
      this.target.rotation.y += step;
    } else {
      this.target.rotation.y = target;
    }
  }

  public getFacingDirection(): Direction8 {
    return this.currentDirection;
  }

  public getTargetAngle(): number {
    return this.targetAngleRad;
  }
}
