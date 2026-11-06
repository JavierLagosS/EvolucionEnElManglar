import { IPlayer } from '../interfaces/IPlayer';
import { IPlayerState } from '../interfaces/IPlayerState';
import { EvolutionPhase, FoodType, PhasePhysicsConfig, PlayerInput } from '../types/GameTypes';
import { PHASE_CONFIGURATIONS } from '../../config/evolutionConfig';

/**
 * Clase base abstracta para los estados evolutivos del jugador.
 * Implementa utilidades transversales de Game Feel (Kirby style):
 * - Input Buffering (retiene la intención de salto antes de tocar tierra).
 * - Coyote Time (ventana de gracia al caer de bordes).
 * - Desacople estricto entre Hitbox física y representación visual.
 */
export abstract class BasePlayerState implements IPlayerState {
  public abstract readonly phase: EvolutionPhase;
  public abstract readonly targetFood: FoodType;

  // Timers de Game Feel (en milisegundos)
  protected readonly JUMP_BUFFER_DURATION: number = 140;
  protected readonly COYOTE_TIME_DURATION: number = 110;

  protected jumpBufferTimer: number = 0;
  protected coyoteTimer: number = 0;
  protected wasGroundedLastFrame: boolean = false;

  public get physicsConfig(): PhasePhysicsConfig {
    return PHASE_CONFIGURATIONS[this.phase].physics;
  }

  public enter(player: IPlayer): void {
    // 1. Aplicar la física definida para esta fase
    player.applyPhysicsConfig(this.physicsConfig);

    // 2. Aplicar texturas visuales
    player.setVisualTexture(`player_${this.phase.toLowerCase()}`);

    // 3. Efecto de Game Feel al transformar (Squash & Stretch)
    player.triggerSquashAndStretch(1.3, 0.7, 180);

    // 4. Reiniciar buffers
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.wasGroundedLastFrame = player.isGrounded;
  }

  public exit(_player: IPlayer): void {
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
  }

  public abstract handleInput(player: IPlayer, input: PlayerInput, delta: number): void;

  public update(player: IPlayer, _time: number, delta: number): void {
    this.updateGameFeelTimers(player, delta);
  }

  public onWaterEnter?(_player: IPlayer): void {}
  public onWaterExit?(_player: IPlayer): void {}

  /**
   * Actualiza los temporizadores de Coyote Time y Jump Buffer para garantizar
   * la responsividad y fluidez de control (estilo Kirby).
   */
  protected updateGameFeelTimers(player: IPlayer, delta: number): void {
    // Reducir buffer de salto
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    // Gestionar Coyote Time: si estaba en el suelo y ahora cae sin saltar
    if (player.isGrounded) {
      this.coyoteTimer = this.COYOTE_TIME_DURATION;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= delta;
    }

    this.wasGroundedLastFrame = player.isGrounded;
  }

  /**
   * Comprueba si el jugador puede ejecutar un salto considerando Coyote Time.
   */
  protected canExecuteJump(player: IPlayer): boolean {
    return player.isGrounded || this.coyoteTimer > 0;
  }

  /**
   * Consume el buffer de salto y el coyote time tras ejecutar una maniobra.
   */
  protected consumeJumpTriggers(): void {
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
  }
}
