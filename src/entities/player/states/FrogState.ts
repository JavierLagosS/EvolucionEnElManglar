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
    if (player.isInWater) {
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
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    // Impulso de nado estilo braza de rana al presionar salto en agua
    if (input.jumpJustDown) {
      const impulseY = moveY !== 0 ? moveY * this.WATER_SWIM_FORCE : -this.WATER_SWIM_FORCE;
      const impulseX = moveX !== 0 ? moveX * this.WATER_SWIM_FORCE : player.facingDirection * 150;
      player.setVelocity(impulseX, impulseY);
      player.triggerSquashAndStretch(1.2, 0.8, 140);
    } else {
      // Movimiento continuo suave en agua
      if (moveX !== 0) player.body.setAccelerationX(moveX * this.WATER_SWIM_FORCE);
      if (moveY !== 0) player.body.setAccelerationY(moveY * this.WATER_SWIM_FORCE);
    }
  }

  public override onWaterEnter(player: IPlayer): void {
    player.setInWater(true);
    // Cambiar dinámicamente propiedades físicas para nado
    player.body.setAllowGravity(false);
    player.body.setDrag(this.WATER_DRAG, this.WATER_DRAG);
    player.triggerSquashAndStretch(1.2, 0.8, 200);
  }

  public override onWaterExit(player: IPlayer): void {
    player.setInWater(false);
    // Restaurar física terrestre original de la rana
    player.applyPhysicsConfig(this.physicsConfig);
  }
}
