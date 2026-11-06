import { BasePlayerState } from '../../../core/state-machine/BasePlayerState';
import { IPlayer } from '../../../core/interfaces/IPlayer';
import { EvolutionPhase, FoodType, PlayerInput } from '../../../core/types/GameTypes';
import { EventBus } from '../../../core/events/EventBus';

/**
 * Fase 1: Hongo del Manglar.
 * Física: Terrestre. No camina de forma continua; se desplaza exclusivamente
 * mediante saltos parabólicos e impulsos elásticos (ejes X e Y).
 * Alimento objetivo: Mosca.
 */
export class MushroomState extends BasePlayerState {
  public readonly phase = EvolutionPhase.MUSHROOM;
  public readonly targetFood = FoodType.FLY;

  // Impulsos calibrados para máxima responsividad y altura
  private readonly HIGH_JUMP_IMPULSE_Y = -620; // Gran salto vertical/parabólico
  private readonly HIGH_JUMP_IMPULSE_X = 310;
  private readonly HOP_IMPULSE_Y = -420;      // Salto ágil direccional
  private readonly HOP_IMPULSE_X = 260;

  private autoHopTimer: number = 0;
  private readonly AUTO_HOP_INTERVAL = 260; // Cadencia rápida al mantener pulsada la dirección

  public override enter(player: IPlayer): void {
    super.enter(player);
    player.setVelocityX(0);
    this.autoHopTimer = 0;
  }

  public override onWaterEnter(player: IPlayer): void {
    // Reducción de gravedad a un 25% y resistencia hidrodinámica
    player.body.setGravityY(this.physicsConfig.gravityY * 0.25);
    player.body.setDrag(320, 320);
    player.body.setMaxVelocity(this.physicsConfig.maxVelocityX, 360);
  }

  public override onWaterExit(player: IPlayer): void {
    // Restaurar física terrestre original
    player.applyPhysicsConfig(this.physicsConfig);
  }

  public handleInput(player: IPlayer, input: PlayerInput, delta: number): void {
    // Si está en el Estrato Acuático (y > 1550 o inWater), permitir nado multidireccional fluido sin requerir suelo
    if (player.isInWater || player.y > 1550) {
      this.handleWaterInput(player, input);
      return;
    }

    if (this.autoHopTimer > 0) {
      this.autoHopTimer -= delta;
    }

    // 1. Buffer de salto alto (Espacio / Arriba / W)
    if (input.jumpJustDown) {
      this.jumpBufferTimer = this.JUMP_BUFFER_DURATION;
    }

    // 2. Salto alto con buffer y coyote time
    if (this.jumpBufferTimer > 0 && this.canExecuteJump(player)) {
      this.executeParabolicJump(player, input, this.HIGH_JUMP_IMPULSE_Y, this.HIGH_JUMP_IMPULSE_X);
      this.consumeJumpTriggers();
      this.autoHopTimer = this.AUTO_HOP_INTERVAL;
      return;
    }

    // 3. Salto direccional ágil en tierra (Izquierda / Derecha / A / D)
    const wantsLeft = input.leftJustDown || (input.left && this.autoHopTimer <= 0);
    const wantsRight = input.rightJustDown || (input.right && this.autoHopTimer <= 0);

    if (player.isGrounded) {
      if (wantsLeft) {
        player.setFacingDirection(-1);
        player.setVelocity(-this.HOP_IMPULSE_X, this.HOP_IMPULSE_Y);
        player.triggerSquashAndStretch(0.75, 1.35, 160);
        EventBus.emit('player:jump', { phase: this.phase, x: player.x, y: player.y });
        this.autoHopTimer = this.AUTO_HOP_INTERVAL;
        return;
      } else if (wantsRight) {
        player.setFacingDirection(1);
        player.setVelocity(this.HOP_IMPULSE_X, this.HOP_IMPULSE_Y);
        player.triggerSquashAndStretch(0.75, 1.35, 160);
        EventBus.emit('player:jump', { phase: this.phase, x: player.x, y: player.y });
        this.autoHopTimer = this.AUTO_HOP_INTERVAL;
        return;
      }

      // Detención limpia en tierra al soltar controles
      if (Math.abs(player.body.velocity.x) < 30) {
        player.setVelocityX(0);
      }
    } else {
      // 4. En el aire: Control de trayectoria aéreo ágil (Kirby feel)
      if (input.left) {
        player.setVelocityX(-this.HIGH_JUMP_IMPULSE_X * 0.85);
        player.setFacingDirection(-1);
      } else if (input.right) {
        player.setVelocityX(this.HIGH_JUMP_IMPULSE_X * 0.85);
        player.setFacingDirection(1);
      }
    }
  }

  public override update(player: IPlayer, time: number, delta: number): void {
    super.update(player, time, delta);

    // Animación de impacto al aterrizar
    if (!this.wasGroundedLastFrame && player.isGrounded) {
      player.triggerSquashAndStretch(1.35, 0.65, 150);
      EventBus.emit('player:land', { phase: this.phase, x: player.x, y: player.y });
    }
  }

  private executeParabolicJump(player: IPlayer, input: PlayerInput, impulseY: number, impulseX: number): void {
    let vx = 0;

    if (input.left) {
      vx = -impulseX;
      player.setFacingDirection(-1);
    } else if (input.right) {
      vx = impulseX;
      player.setFacingDirection(1);
    } else {
      // Salto vertical limpio
      vx = 0;
    }

    player.setVelocity(vx, impulseY);
    player.triggerSquashAndStretch(0.7, 1.45, 180);
    EventBus.emit('player:jump', { phase: this.phase, x: player.x, y: player.y });
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

    // Nado multidireccional continuo en agua sin depender del suelo
    if (input.up || input.jump) {
      moveY -= 1;
    }
    if (input.down) {
      moveY += 1;
    }

    const swimSpeedX = 260;
    const swimSpeedY = 240;

    if (moveX !== 0) {
      player.setVelocityX(moveX * swimSpeedX);
    }
    if (moveY !== 0) {
      player.setVelocityY(moveY * swimSpeedY);
    }

    if (input.jumpJustDown) {
      player.setVelocityY(-340);
      player.triggerSquashAndStretch(0.8, 1.25, 140);
    }
  }
}
