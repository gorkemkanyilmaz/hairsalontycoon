import * as THREE from 'three';

export enum Direction8 {
  NORTH = 'NORTH',
  NORTH_EAST = 'NORTH_EAST',
  EAST = 'EAST',
  SOUTH_EAST = 'SOUTH_EAST',
  SOUTH = 'SOUTH',
  SOUTH_WEST = 'SOUTH_WEST',
  WEST = 'WEST',
  NORTH_WEST = 'NORTH_WEST'
}

export enum HairStyleType {
  LONG = 'LONG',
  BUNS = 'BUNS',
  SIMPLE_PARTED = 'SIMPLE_PARTED',
  BUZZED = 'BUZZED'
}

export enum CharacterAnimState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  SIT = 'SIT',
  STAND = 'STAND',
  TALK = 'TALK',
  INTERACT = 'INTERACT'
}

export interface ISalonCharacterConfig {
  id: string;
  name: string;
  hairStyle: HairStyleType;
  hairColor: string | number;
  outfitColor: string | number;
  position?: THREE.Vector3;
  initialDirection?: Direction8;
  initialAnimation?: CharacterAnimState;
}
