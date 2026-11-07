import { BasePlayerState } from '../../../core/state-machine/BasePlayerState';
import { IPlayer } from '../../../core/interfaces/IPlayer';
import { EvolutionPhase, FoodType, PlayerInput } from '../../../core/types/GameTypes';

/**
 * Fase 5 (Nivel 3): Tiburón Soberano del Abismo.
 * Física: Nado subacuático de máxima agilidad y velocidad.
 * Capaz de surcar el agua con impulsos hidrodinámicos y embestidas depredadoras.
 * Alimento objetivo: Peces del manglar.
 */
export class SharkState extends BasePlayerState {
  public readonly phase = EvolutionPhase.SHARK;
  public readonly targetFood = FoodType.FISH;

  private readonly SWIM_ACCELERATION = 720;
  private readonly DASH_BOOST = 400;
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

    if (moveX !== 0 && moveY !== 0) {
      const invMag = 1 / Math.SQRT2;
      moveX *= invMag;
      moveY *= invMag;
    }

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

    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
    }

    if (input.jumpJustDown && this.dashCooldownTimer <= 0) {
      this.executeSwimDash(player, moveX, moveY);
    }
  }

  private executeSwimDash(player: IPlayer, dirX: number, dirY: number): void {
    const boostDirX = dirX !== 0 ? dirX : player.facingDirection;
    const boostDirY = dirY !== 0 ? dirY : 0;

    player.setVelocity(
      player.body.velocity.x + boostDirX * this.DASH_BOOST,
      player.body.velocity.y + boostDirY * this.DASH_BOOST
    );

    player.triggerSquashAndStretch(1.4, 0.7, 160);
    this.dashCooldownTimer = 400;
  }
}
