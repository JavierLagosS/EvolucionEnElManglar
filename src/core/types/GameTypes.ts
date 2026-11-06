/**
 * Enumeración de las fases evolutivas del jugador.
 */
export enum EvolutionPhase {
  MUSHROOM = 'MUSHROOM',
  TADPOLE = 'TADPOLE',
  FROG = 'FROG',
  DRAGONFLY = 'DRAGONFLY'
}

/**
 * Enumeración de los tipos de alimentos/presas del manglar.
 */
export enum FoodType {
  FLY = 'FLY',
  FISH = 'FISH',
  BIG_FLY = 'BIG_FLY',
  WASP = 'WASP'
}

/**
 * Representación normalizada de las entradas del jugador (Input Agnostic).
 */
export interface PlayerInput {
  left: boolean;
  leftJustDown: boolean;
  right: boolean;
  rightJustDown: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpJustDown: boolean;
  action: boolean;
  actionJustDown: boolean;
}

/**
 * Propiedades de física Arcade configurables dinámicamente por fase evolutiva.
 */
export interface PhasePhysicsConfig {
  gravityY: number;
  allowGravity: boolean;
  dragX: number;
  dragY: number;
  maxVelocityX: number;
  maxVelocityY: number;
  bounceX: number;
  bounceY: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
}

/**
 * Datos asociados a la evolución entre fases.
 */
export interface EvolutionTransitionData {
  previousPhase: EvolutionPhase;
  newPhase: EvolutionPhase;
  targetFood: FoodType;
  timestamp: number;
}
