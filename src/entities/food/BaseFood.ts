import Phaser from 'phaser';
import { IFood } from '../../core/interfaces/IFood';
import { FoodType } from '../../core/types/GameTypes';

/**
 * Clase base para todas las presas del ecosistema del manglar.
 * Proporciona movimiento sinusoidal orgánico (aleteo/nado) e interacción física.
 */
export abstract class BaseFood extends Phaser.GameObjects.Container implements IFood {
  public declare body: Phaser.Physics.Arcade.Body;

  public readonly id: string;
  public abstract readonly type: FoodType;
  public abstract readonly nutritionalValue: number;

  protected visualSprite: Phaser.GameObjects.Sprite;
  private _isActive: boolean = true;

  // Variables para movimiento sinusoidal orgánico
  public baseX: number;
  public baseY: number;
  public timeOffset: number;
  public floatSpeed: number = 0.003;
  public floatAmplitudeY: number = 6;
  public floatAmplitudeX: number = 3;
  public looksLeftOriginally: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, hitboxRadius: number = 14) {
    super(scene, x, y);
    this.id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.baseX = x;
    this.baseY = y;
    this.timeOffset = Math.random() * 1000;

    // Componente visual
    this.visualSprite = scene.add.sprite(0, 0, textureKey);
    this.add(this.visualSprite);

    // Habilitar Arcade Physics
    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setCircle(hitboxRadius, -hitboxRadius, -hitboxRadius);

    this.initBehavior();
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get visualCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public get visualRadius(): number {
    return Math.max(this.visualSprite.displayWidth, this.visualSprite.displayHeight) / 2;
  }

  /**
   * Configura micro-animaciones (vibración de alas, aleteo elástico).
   */
  protected initBehavior(): void {
    // Aleteo / vibración elástica continua en el contenedor
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.92,
      scaleX: 1.08,
      duration: 140 + Math.random() * 60,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Ciclo de actualización: calcula el desplazamiento sinusoidal fluido.
   */
  public override update(time: number, _delta: number): void {
    if (!this._isActive) return;

    const t = (time + this.timeOffset) * this.floatSpeed;
    const offsetY = Math.sin(t) * this.floatAmplitudeY;
    const offsetX = Math.cos(t * 0.7) * this.floatAmplitudeX;

    this.setPosition(this.baseX + offsetX, this.baseY + offsetY);

    // Orientación automática según dirección horizontal de avance
    const vx = -Math.sin(t * 0.7);
    if (this.looksLeftOriginally) {
      this.visualSprite.setFlipX(vx > 0);
    } else {
      this.visualSprite.setFlipX(vx < 0);
    }
  }

  /**
   * Consume la presa: desactiva colisiones y ejecuta tween de recolección elástica.
   */
  public consume(): number {
    if (!this._isActive) return 0;
    this._isActive = false;

    this.body.enable = false;

    // Feedback visual estilo Kirby (Squash hacia afuera y desaparición con chispas)
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      y: this.y - 25,
      duration: 200,
      ease: 'Back.easeOut',
      easeParams: [2],
      onComplete: () => {
        this.despawn();
      }
    });

    return this.nutritionalValue;
  }

  public despawn(): void {
    this.destroy(true);
  }
}
