import { BasePlayerState } from '../../../core/state-machine/BasePlayerState';
import { IPlayer } from '../../../core/interfaces/IPlayer';
import { EvolutionPhase, FoodType, PlayerInput } from '../../../core/types/GameTypes';

/**
 * Fase 4 (Final): Libélula Depredadora.
 * Física: Aérea. Ignora la gravedad global (allowGravity = false),
 * permitiendo vuelo libre multidireccional de alta velocidad con desaceleración suave.
 * Alimento objetivo: Avispa.
 */
export class DragonflyState extends BasePlayerState {
  public readonly phase = EvolutionPhase.DRAGONFLY;
  public readonly targetFood = FoodType.WASP;

  private readonly FLIGHT_ACCELERATION = 680;
  private readonly BURST_BOOST = 350;
  private burstCooldownTimer: number = 0;

  public override enter(player: IPlayer): void {
    super.enter(player);
    this.burstCooldownTimer = 0;
  }

  public handleInput(player: IPlayer, input: PlayerInput, delta: number): void {
    let moveX = 0;
    let moveY = 0;

    if (input.left) {
      moveX -= 1;
      player.setFacingDirection(-1);
    }
    if (input.right) {
      moveX += 1;
      player.setFacingDirection(1);
    }
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    // Normalizar vector para que el vuelo diagonal no sea más rápido
    if (moveX !== 0 && moveY !== 0) {
      const invMag = 1 / Math.SQRT2;
      moveX *= invMag;
      moveY *= invMag;
    }

    // Aceleración de vuelo (desaceleración suave manejada por el drag Arcade de 420)
    if (moveX !== 0) {
      player.body.setAccelerationX(moveX * this.FLIGHT_ACCELERATION);
    } else {
      player.body.setAccelerationX(0);
    }

    if (moveY !== 0) {
      player.body.setAccelerationY(moveY * this.FLIGHT_ACCELERATION);
    } else {
      player.body.setAccelerationY(0);
    }

    // Aceleración súbita de caza (Turbo / Burst) con botón de salto o acción
    if (this.burstCooldownTimer > 0) {
      this.burstCooldownTimer -= delta;
    }

    if (input.jumpJustDown && this.burstCooldownTimer <= 0) {
      this.executeFlightBurst(player, moveX, moveY);
    }
  }

  private executeFlightBurst(player: IPlayer, dirX: number, dirY: number): void {
    const boostDirX = dirX !== 0 ? dirX : player.facingDirection;
    const boostDirY = dirY !== 0 ? dirY : 0;

    player.setVelocity(
      player.body.velocity.x + boostDirX * this.BURST_BOOST,
      player.body.velocity.y + boostDirY * this.BURST_BOOST
    );

    // Game feel: Efecto de dardo aerodinámico
    player.triggerSquashAndStretch(1.5, 0.5, 120);
    this.burstCooldownTimer = 350;
  }
}
