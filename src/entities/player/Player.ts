import Phaser from 'phaser';
import { IPlayer } from '../../core/interfaces/IPlayer';
import { EvolutionPhase, PhasePhysicsConfig, PlayerInput } from '../../core/types/GameTypes';
import { PlayerStateMachine } from '../../core/state-machine/PlayerStateMachine';
import { MushroomState } from './states/MushroomState';
import { TadpoleState } from './states/TadpoleState';
import { FrogState } from './states/FrogState';
import { DragonflyState } from './states/DragonflyState';
import { SharkState } from './states/SharkState';
import { EventBus } from '../../core/events/EventBus';

/**
 * Entidad principal del Jugador.
 * Implementa IPlayer utilizando un cuerpo Arcade Sprite nativo (física)
 * y un sprite de renderizado independiente (visual).
 * 
 * Este patrón evita que las interpolaciones de Squash & Stretch expandan
 * la hitbox física contra el suelo, lo que causaba la anulación del salto.
 */
export class Player extends Phaser.Physics.Arcade.Sprite implements IPlayer {
  public declare body: Phaser.Physics.Arcade.Body;

  private readonly visualSprite: Phaser.GameObjects.Sprite;
  private readonly stateMachine: PlayerStateMachine;
  private _isInWater: boolean = false;
  private _facingDirection: 1 | -1 = 1;
  public facingRight: boolean = true;
  private squashTween: Phaser.Tweens.Tween | null = null;
  private baseScaleX: number = 1;
  private baseScaleY: number = 1;
  private groundedGraceTimer: number = 0;
  private invulnerableTimer: number = 0;
  private currentConfig?: PhasePhysicsConfig;

  // Estado de impulso / embestida activa
  public isDashing: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Inicializar el cuerpo físico nativo en Arcade
    super(scene, x, y, 'player_mushroom');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // Ocultar el sprite base: el renderizado visual lo hace visualSprite
    this.setVisible(false);

    // Anclaje inferior/central (0.5 horizontal, 1.0 vertical) para que los pies toquen exactamente el suelo
    this.setOrigin(0.5, 1.0);

    // Sprite visual desacoplado que replica la posición pero puede deformarse sin alterar la física
    this.visualSprite = scene.add.sprite(x, y, 'player_mushroom');
    this.visualSprite.setOrigin(0.5, 1.0);

    // Inicializar FSM evolutiva
    this.stateMachine = new PlayerStateMachine(this);
    this.stateMachine
      .registerState(new MushroomState())
      .registerState(new TadpoleState())
      .registerState(new FrogState())
      .registerState(new DragonflyState())
      .registerState(new SharkState());

    this.stateMachine.start(EvolutionPhase.MUSHROOM);
  }

  // --- Detección de Suelo ---

  public get isGrounded(): boolean {
    return (
      this.groundedGraceTimer > 0 ||
      this.body.blocked.down ||
      this.body.touching.down
    );
  }

  public markGrounded(coyoteTimeMs: number = 140): void {
    this.groundedGraceTimer = coyoteTimeMs;
  }

  // --- Configuración Dinámica de Físicas Arcade ---

  public applyPhysicsConfig(config: PhasePhysicsConfig): void {
    this.currentConfig = config;
    this.body.setAllowGravity(config.allowGravity);
    this.body.setGravityY(config.gravityY);
    this.body.setDrag(config.dragX, config.dragY);
    this.body.setMaxVelocity(config.maxVelocityX, config.maxVelocityY);
    this.body.setBounce(config.bounceX, config.bounceY);

    // Hitbox física desacoplada de la textura
    this.body.setSize(config.hitboxWidth, config.hitboxHeight);
    this.body.setOffset(
      (this.width - config.hitboxWidth) / 2,
      this.height - config.hitboxHeight
    );
  }

  public applyImpulse(vx: number, vy: number): void {
    this.body.velocity.x += vx;
    this.body.velocity.y += vy;
  }

  // --- Delegación a FSM ---

  public get currentPhase(): EvolutionPhase {
    return this.stateMachine.getCurrentPhase() ?? EvolutionPhase.MUSHROOM;
  }

  public get isInWater(): boolean {
    return this._isInWater;
  }

  public get facingDirection(): 1 | -1 {
    return this._facingDirection;
  }

  public setFacingDirection(dir: 1 | -1): void {
    this._facingDirection = dir;
    this.facingRight = (dir === 1);
    this.updateFacing();
  }

  public updateFacing(): void {
    const phase = this.currentPhase;

    // Tabla explícita de orientación nativa (nativeFacing):
    // Sprites que en su archivo PNG miran hacia la IZQUIERDA (nativeFacing = 'left'):
    // - TADPOLE (pez_celeste.png)
    // - DRAGONFLY (libelula.png)
    // Regla: DERECHA (facingRight = true) -> flipX = true | IZQUIERDA (facingRight = false) -> flipX = false
    //
    // Sprites que en su archivo PNG miran hacia la DERECHA (nativeFacing = 'right'):
    // - FROG (rana.png)
    // - SHARK (tiburon.png)
    // Regla: DERECHA (facingRight = true) -> flipX = false | IZQUIERDA (facingRight = false) -> flipX = true
    //
    // Vista frontal / simétrica: MUSHROOM (hongo.png) -> flipX = false
    if (phase === EvolutionPhase.MUSHROOM) {
      this.visualSprite.setFlipX(false);
      return;
    }

    const nativeFacingLeft = (
      phase === EvolutionPhase.TADPOLE ||
      phase === EvolutionPhase.DRAGONFLY
    );

    if (nativeFacingLeft) {
      this.visualSprite.setFlipX(this.facingRight);
    } else {
      this.visualSprite.setFlipX(!this.facingRight);
    }
  }

  public getStateMachine(): PlayerStateMachine {
    return this.stateMachine;
  }

  // --- Animación Procedural y Feedback Visual ---

  public triggerSquashAndStretch(scaleX: number, scaleY: number, duration: number = 180): void {
    if (this.squashTween) {
      this.squashTween.stop();
    }
    this.visualSprite.setScale(this.baseScaleX * scaleX, this.baseScaleY * scaleY);
    this.squashTween = this.scene.tweens.add({
      targets: this.visualSprite,
      scaleX: this.baseScaleX,
      scaleY: this.baseScaleY,
      duration: duration,
      ease: 'Back.easeOut',
      easeParams: [2.5],
      onComplete: () => {
        this.squashTween = null;
      }
    });
  }

  public setVisualTexture(textureKey: string): void {
    this.setTexture(textureKey);
    this.visualSprite.setTexture(textureKey);

    // Ajustar dimensiones óptimas de renderizado según el sprite
    switch (textureKey) {
      case 'player_mushroom':
      case 'sprite_hongo':
        this.visualSprite.setDisplaySize(58, 56);
        break;
      case 'player_tadpole':
      case 'sprite_pez_celeste':
        this.visualSprite.setDisplaySize(62, 58);
        break;
      case 'player_frog':
      case 'sprite_rana':
        this.visualSprite.setDisplaySize(68, 58);
        break;
      case 'player_dragonfly':
      case 'sprite_libelula':
        this.visualSprite.setDisplaySize(72, 60);
        break;
      case 'player_shark':
      case 'sprite_tiburon':
        this.visualSprite.setDisplaySize(88, 70);
        break;
      default:
        break;
    }
    this.baseScaleX = Math.abs(this.visualSprite.scaleX);
    this.baseScaleY = Math.abs(this.visualSprite.scaleY);
    this.updateFacing();

    // Sincronizar hitbox con las dimensiones del nuevo frame
    if (this.currentConfig) {
      this.applyPhysicsConfig(this.currentConfig);
    }
  }

  public get visualCenter(): { x: number; y: number } {
    return {
      x: this.x,
      y: (this.y + 4) - this.visualSprite.displayHeight / 2
    };
  }

  public get visualRadius(): number {
    return Math.max(this.visualSprite.displayWidth, this.visualSprite.displayHeight) / 2;
  }

  public updateVisualTexture(textureKey: string): void {
    this.setVisualTexture(textureKey);
  }

  public setVisualTint(color: number): void {
    this.visualSprite.setTint(color);
  }

  public clearVisualTint(): void {
    this.visualSprite.clearTint();
  }

  public isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  /**
   * Inicia un estado de embestida activa (usado por la Libélula).
   */
  public startDash(durationMs: number = 380): void {
    this.isDashing = true;
    this.invulnerableTimer = Math.ceil(durationMs / 16.666);
    this.scene.time.delayedCall(durationMs, () => {
      this.isDashing = false;
    });
  }

  public takeDamage(fromX: number, _fromY: number): void {
    if (this.invulnerableTimer > 0) return;
    this.invulnerableTimer = 60; // 60 frames (~1000ms de invulnerabilidad)

    // Knockback: alejar al jugador con fuerza del depredador
    const dirX = this.x >= fromX ? 1 : -1;
    this.setVelocity(dirX * 360, -320);

    // Feedback visual: Squash & Stretch y parpadeo rojo brillante
    this.triggerSquashAndStretch(0.7, 1.4, 180);
    this.setVisualTint(0xff1e1e);

    this.scene.tweens.add({
      targets: this.visualSprite,
      alpha: 0.25,
      yoyo: true,
      repeat: 5,
      duration: 80,
      onComplete: () => {
        this.visualSprite.setAlpha(1);
        this.clearVisualTint();
      }
    });

    EventBus.emit('player:damaged', { x: this.x, y: this.y });
  }

  public setInWater(inWater: boolean): void {
    if (this._isInWater !== inWater) {
      this._isInWater = inWater;
      if (inWater) {
        this.stateMachine.onWaterEnter();
      } else {
        this.stateMachine.onWaterExit();
      }
    }
  }

  // --- Ciclo de Vida ---

  public handleInput(input: PlayerInput, delta: number): void {
    this.stateMachine.handleInput(input, delta);
  }

  public override update(time: number, delta: number): void {
    if (this.groundedGraceTimer > 0) {
      this.groundedGraceTimer -= delta;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= (delta / 16.666);
      if (this.invulnerableTimer <= 0) {
        this.invulnerableTimer = 0;
        this.clearVisualTint();
        this.visualSprite.setAlpha(1);
      }
    }

    // Guardar siempre la última dirección válida según la velocidad horizontal
    if (this.body.velocity.x > 0.1) {
      this.facingRight = true;
      this._facingDirection = 1;
      this.updateFacing();
    } else if (this.body.velocity.x < -0.1) {
      this.facingRight = false;
      this._facingDirection = -1;
      this.updateFacing();
    }

    // Sincronizar el sprite visual con la posición del cuerpo físico (+4px de hundimiento en musgo)
    this.visualSprite.setPosition(this.x, this.y + 4);

    this.stateMachine.update(time, delta);
  }

  public override destroy(fromScene?: boolean): void {
    if (this.visualSprite) {
      this.visualSprite.destroy();
    }
    super.destroy(fromScene);
  }
}
