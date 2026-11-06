import { BasePlayerState } from '../../../core/state-machine/BasePlayerState';
import { IPlayer } from '../../../core/interfaces/IPlayer';
import { EvolutionPhase, FoodType, PlayerInput } from '../../../core/types/GameTypes';

/**
 * Fase 2: Renacuajo de Ciénaga.
 * Física: Acuática. Gravedad anulada con movimiento multidireccional fluido,
 * aplicando fricción hidrodinámica (drag) constante.
 * Alimento objetivo: Pez.
 */
export class TadpoleState extends BasePlayerState {
  public readonly phase = EvolutionPhase.TADPOLE;
  public readonly targetFood = FoodType.FISH;

  private readonly SWIM_ACCELERATION = 420;
  private readonly DASH_BOOST = 280;
  private dashCooldownTimer: number = 0;

  public override enter(player: IPlayer): void {
    super.enter(player);
    this.dashCooldownTimer = 0;
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

    // Normalizar vector direccional para movimiento fluido diagonal
    if (moveX !== 0 && moveY !== 0) {
      const invMag = 1 / Math.SQRT2;
      moveX *= invMag;
      moveY *= invMag;
    }

    // Aceleración hidrodinámica reactiva (drag se encarga de la desaceleración suave)
    if (moveX !== 0) {
      player.body.setAccelerationX(moveX * this.SWIM_ACCELERATION);
    } else {
      player.body.setAccelerationX(0);
    }

    if (moveY !== 0) {
      player.body.setAccelerationY(moveY * this.SWIM_ACCELERATION);
    } else {
      player.body.setAccelerationY(0);
    }

    // Mecánica de coletazo (Dash / Impulso acuático rápido)
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
    }

    if (input.jumpJustDown && this.dashCooldownTimer <= 0) {
      this.executeTailDash(player, moveX, moveY);
    }
  }

  private executeTailDash(player: IPlayer, dirX: number, dirY: number): void {
    // Si no tiene dirección seleccionada, dash en dirección que mira
    const boostX = (dirX !== 0 ? dirX : player.facingDirection) * this.DASH_BOOST;
    const boostY = dirY * this.DASH_BOOST;

    player.setVelocity(player.body.velocity.x + boostX, player.body.velocity.y + boostY);
    player.triggerSquashAndStretch(1.4, 0.6, 140);
    this.dashCooldownTimer = 450; // Cooldown corto para no spamear dash infinito
  }
}
