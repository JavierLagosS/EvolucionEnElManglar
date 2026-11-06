import Phaser from 'phaser';
import { IPlayer } from '../../core/interfaces/IPlayer';
import { EvolutionPhase, PhasePhysicsConfig, PlayerInput } from '../../core/types/GameTypes';
import { PlayerStateMachine } from '../../core/state-machine/PlayerStateMachine';
import { MushroomState } from './states/MushroomState';
import { TadpoleState } from './states/TadpoleState';
import { FrogState } from './states/FrogState';
import { DragonflyState } from './states/DragonflyState';

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
  private squashTween: Phaser.Tweens.Tween | null = null;
  private groundedGraceTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Inicializar el cuerpo físico nativo en Arcade
    super(scene, x, y, 'player_mushroom');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // Ocultar el sprite base: el renderizado visual lo hace visualSprite
    this.setVisible(false);

    // Sprite visual desacoplado que replica la posición pero puede deformarse sin alterar la física
    this.visualSprite = scene.add.sprite(x, y, 'player_mushroom');
    this.visualSprite.setOrigin(0.5, 0.5);

    // Inicializar FSM evolutiva
    this.stateMachine = new PlayerStateMachine(this);
    this.stateMachine
      .registerState(new MushroomState())
      .registerState(new TadpoleState())
      .registerState(new FrogState())
      .registerState(new DragonflyState());

    this.stateMachine.start(EvolutionPhase.MUSHROOM);
  }

  // --- Detección de Suelo ---

  public get isGrounded(): boolean {
    return (
      this.groundedGraceTimer > 0 ||
      this.body.blocked.down ||
      this.body.touching.down ||
      this.body.wasTouching.down
    );
  }

  public get isInWater(): boolean {
    return this._isInWater;
  }

  public get facingDirection(): 1 | -1 {
    return this._facingDirection;
  }

  public markGrounded(graceMs: number = 150): void {
    this.groundedGraceTimer = graceMs;
  }

  public getStateMachine(): PlayerStateMachine {
    return this.stateMachine;
  }

  // --- Métodos de Control Físico ---

  public applyImpulse(vx: number, vy: number): void {
    this.setVelocity(this.body.velocity.x + vx, this.body.velocity.y + vy);
  }

  public override setVelocity(vx: number, vy: number): this {
    return super.setVelocity(vx, vy);
  }

  public override setVelocityX(vx: number): this {
    return super.setVelocityX(vx);
  }

  public override setVelocityY(vy: number): this {
    return super.setVelocityY(vy);
  }

  public setFacingDirection(direction: 1 | -1): void {
    this._facingDirection = direction;
    this.visualSprite.setFlipX(direction === -1);
  }

  public applyPhysicsConfig(config: PhasePhysicsConfig): void {
    this.body.setAllowGravity(config.allowGravity);
    this.body.setGravityY(config.gravityY);
    this.body.setDrag(config.dragX, config.dragY);
    this.body.setMaxVelocity(config.maxVelocityX, config.maxVelocityY);
    this.body.setBounce(config.bounceX, config.bounceY);

    // Hitbox física fija matemática (nunca se deforma con tweens)
    this.body.setSize(config.hitboxWidth, config.hitboxHeight);
  }

  // --- Game Feel & Efectos Visuales (Desacoplados de la Hitbox) ---

  public triggerSquashAndStretch(scaleX: number, scaleY: number, durationMs: number = 150): void {
    if (this.squashTween) {
      this.squashTween.stop();
    }

    this.visualSprite.setScale(scaleX, scaleY);

    this.squashTween = this.scene.tweens.add({
      targets: this.visualSprite,
      scaleX: 1,
      scaleY: 1,
      duration: durationMs,
      ease: 'Back.easeOut',
      easeParams: [2.5]
    });
  }

  public setVisualTexture(textureKey: string): void {
    if (this.scene.textures.exists(textureKey)) {
      this.visualSprite.setTexture(textureKey);
      this.visualSprite.clearTint();
    }
  }

  public setVisualTint(tint: number): void {
    if (tint !== 0xffffff && tint !== 0) {
      this.visualSprite.setTint(tint);
    } else {
      this.visualSprite.clearTint();
    }
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

    // Sincronizar el sprite visual con la posición del cuerpo físico
    this.visualSprite.setPosition(this.x, this.y);

    this.stateMachine.update(time, delta);
  }

  public override destroy(fromScene?: boolean): void {
    if (this.visualSprite) {
      this.visualSprite.destroy();
    }
    super.destroy(fromScene);
  }
}
