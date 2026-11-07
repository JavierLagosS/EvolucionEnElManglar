import { EvolutionPhase, FoodType, PhasePhysicsConfig } from '../core/types/GameTypes';

export interface PhaseDefinition {
  phase: EvolutionPhase;
  displayName: string;
  targetFood: FoodType;
  foodRequired: number;
  physics: PhasePhysicsConfig;
  placeholderColor: number;
}

export const EVOLUTION_CHAIN: Record<EvolutionPhase, EvolutionPhase | null> = {
  [EvolutionPhase.MUSHROOM]: EvolutionPhase.TADPOLE,
  [EvolutionPhase.TADPOLE]: EvolutionPhase.FROG,
  [EvolutionPhase.FROG]: EvolutionPhase.DRAGONFLY,
  [EvolutionPhase.DRAGONFLY]: EvolutionPhase.SHARK,
  [EvolutionPhase.SHARK]: null
};

export const PHASE_CONFIGURATIONS: Record<EvolutionPhase, PhaseDefinition> = {
  [EvolutionPhase.MUSHROOM]: {
    phase: EvolutionPhase.MUSHROOM,
    displayName: 'Hongo del Manglar',
    targetFood: FoodType.FLY,
    foodRequired: 4,
    placeholderColor: 0xff6b35,
    physics: {
      gravityY: 960,
      allowGravity: true,
      dragX: 380, // Drag equilibrado que permite que la parábola complete su trayectoria
      dragY: 0,
      maxVelocityX: 380,
      maxVelocityY: 800,
      bounceX: 0,
      bounceY: 0.05,
      hitboxWidth: 36,
      hitboxHeight: 42,
      hitboxOffsetX: 0,
      hitboxOffsetY: 0
    }
  },

  [EvolutionPhase.TADPOLE]: {
    phase: EvolutionPhase.TADPOLE,
    displayName: 'Renacuajo de Ciénaga',
    targetFood: FoodType.FISH,
    foodRequired: 5,
    placeholderColor: 0x2ec4b6,
    physics: {
      gravityY: 0,
      allowGravity: false,
      dragX: 300,
      dragY: 300,
      maxVelocityX: 320,
      maxVelocityY: 320,
      bounceX: 0.2,
      bounceY: 0.2,
      hitboxWidth: 40,
      hitboxHeight: 24,
      hitboxOffsetX: 0,
      hitboxOffsetY: 0
    }
  },

  [EvolutionPhase.FROG]: {
    phase: EvolutionPhase.FROG,
    displayName: 'Rana Arborícola',
    targetFood: FoodType.BIG_FLY,
    foodRequired: 4,
    placeholderColor: 0x38b000,
    physics: {
      gravityY: 960,
      allowGravity: true,
      dragX: 420,
      dragY: 0,
      maxVelocityX: 380,
      maxVelocityY: 820,
      bounceX: 0,
      bounceY: 0.1,
      hitboxWidth: 40,
      hitboxHeight: 36,
      hitboxOffsetX: 0,
      hitboxOffsetY: 0
    }
  },

  [EvolutionPhase.DRAGONFLY]: {
    phase: EvolutionPhase.DRAGONFLY,
    displayName: 'Libélula Depredadora',
    targetFood: FoodType.WASP,
    foodRequired: 6,
    placeholderColor: 0x70e000,
    physics: {
      gravityY: 0,
      allowGravity: false,
      dragX: 380,
      dragY: 380,
      maxVelocityX: 520,
      maxVelocityY: 520,
      bounceX: 0.15,
      bounceY: 0.15,
      hitboxWidth: 46,
      hitboxHeight: 30,
      hitboxOffsetX: 0,
      hitboxOffsetY: 0
    }
  },

  [EvolutionPhase.SHARK]: {
    phase: EvolutionPhase.SHARK,
    displayName: 'Tiburón Soberano',
    targetFood: FoodType.FISH,
    foodRequired: 6,
    placeholderColor: 0x48cae4,
    physics: {
      gravityY: 0,
      allowGravity: false,
      dragX: 320,
      dragY: 320,
      maxVelocityX: 560,
      maxVelocityY: 560,
      bounceX: 0.1,
      bounceY: 0.1,
      hitboxWidth: 64,
      hitboxHeight: 46,
      hitboxOffsetX: 0,
      hitboxOffsetY: 0
    }
  }
};
