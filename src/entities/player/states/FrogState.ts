import { BasePlayerState } from '../../../core/state-machine/BasePlayerState';
import { IPlayer } from '../../../core/interfaces/IPlayer';
import { EvolutionPhase, FoodType, PlayerInput } from '../../../core/types/GameTypes';
import { EventBus } from '../../../core/events/EventBus';

/**
 * Fase 3: Rana Arborícola.
 * Física: Anfibia / Híbrida. Salto terrestre de gran potencia y capacidad de nado
 * al entrar en cuerpos de agua.
 * Alimento objetivo: Moscas grandes.
 */
export class FrogState extends BasePlayerState {
  public readonly phase = EvolutionPhase.FROG;
  public readonly targetFood = FoodType.BIG_FLY;

  // Parámetros terrestres
  private readonly LAND_RUN_SPEED = 260;
  private readonly LAND_JUMP_FORCE = -620;

  // Parámetros acuáticos
  private readonly WATER_SWIM_FORCE = 320;
  private readonly WATER_DRAG = 350;

  public handleInput(player: IPlayer, input: PlayerInput, delta: number): void {
    if (player.isInWater || player.y > 1550) {
      this.handleWaterInput(player, input);
    } else {
      this.handleLandInput(player, input, delta);
    }
  }

  private handleLandInput(player: IPlayer, input: PlayerInput, _delta: number): void {
    // Movimiento horizontal en tierra
    if (input.left) {
      player.setVelocityX(-this.LAND_RUN_SPEED);
      player.setFacingDirection(-1);
    } else if (input.right) {
      player.setVelocityX(this.LAND_RUN_SPEED);
      player.setFacingDirection(1);
    } else if (player.isGrounded) {
      // Dejar que el drag actúe suavemente
      player.body.setAccelerationX(0);
    }

    // Salto terrestre con Buffer y Coyote Time
    if (input.jumpJustDown) {
      this.jumpBufferTimer = this.JUMP_BUFFER_DURATION;
    }

    if (this.jumpBufferTimer > 0 && this.canExecuteJump(player)) {
      player.setVelocityY(this.LAND_JUMP_FORCE);
      player.triggerSquashAndStretch(0.8, 1.3, 160);
      EventBus.emit('player:jump', { phase: this.phase, x: player.x, y: player.y });
      this.consumeJumpTriggers();
    }
  }

  private handleWaterInput(player: IPlayer, input: PlayerInput): void {
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
    // Permite nadar continuamente pulsando Espacio / W / Up o Flechas sin depender del suelo
    if (input.up || input.jump) moveY -= 1;
    if (input.down) moveY += 1;

    // Nado multidireccional reactivo
    if (moveX !== 0) {
      player.setVelocityX(moveX * this.WATER_SWIM_FORCE);
    }
    if (moveY !== 0) {
      player.setVelocityY(moveY * this.WATER_SWIM_FORCE);
    }

    // Impulso de patada de nado al presionar salto
    if (input.jumpJustDown) {
      const impulseY = moveY !== 0 ? moveY * (this.WATER_SWIM_FORCE * 1.25) : -this.WATER_SWIM_FORCE * 1.25;
      const impulseX = moveX !== 0 ? moveX * (this.WATER_SWIM_FORCE * 1.25) : player.facingDirection * 180;
      player.setVelocity(impulseX, impulseY);
      player.triggerSquashAndStretch(1.2, 0.8, 140);
    }
  }

  public override onWaterEnter(player: IPlayer): void {
    // Reducir la gravedad a un 25% y aplicar fricción acuática
    player.body.setGravityY(this.physicsConfig.gravityY * 0.25);
    player.body.setDrag(this.WATER_DRAG, this.WATER_DRAG);
    player.body.setMaxVelocity(this.physicsConfig.maxVelocityX, 380);
    player.triggerSquashAndStretch(1.2, 0.8, 160);
  }

  public override onWaterExit(player: IPlayer): void {
    // Restaurar física terrestre original de la rana
    player.applyPhysicsConfig(this.physicsConfig);
  }
}
