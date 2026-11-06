import { PhasePhysicsConfig } from '../types/GameTypes';

/**
 * Contrato público del jugador expuesto a los estados de la FSM.
 * Evita el acoplamiento directo con la clase concreta Player o Phaser internals.
 */
export interface IPlayer {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly isGrounded: boolean;
  readonly isInWater: boolean;
  readonly facingDirection: 1 | -1;

  // Acceso al cuerpo físico de Arcade
  readonly body: Phaser.Physics.Arcade.Body;

  // Modificación de dinámica física
  applyImpulse(vx: number, vy: number): void;
  setVelocity(vx: number, vy: number): void;
  setVelocityX(vx: number): void;
  setVelocityY(vy: number): void;
  setFacingDirection(direction: 1 | -1): void;
  applyPhysicsConfig(config: PhasePhysicsConfig): void;

  // Game Feel (Desacoplado de la hitbox física)
  triggerSquashAndStretch(scaleX: number, scaleY: number, durationMs?: number): void;
  setVisualTexture(textureKey: string): void;
  setVisualTint(tint: number): void;

  // Estado del jugador
  setInWater(inWater: boolean): void;
}
