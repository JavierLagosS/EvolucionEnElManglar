import Phaser from 'phaser';

export type BossState = 'PATROL' | 'DIVE_TELEGRAPH' | 'DIVING' | 'RECOVERING';

/**
 * Jefe Final del Manglar: Martín Pescador Gigante (Ave Depredadora del Dosel).
 * Posee 5 HP, patrulla el dosel aéreo a gran velocidad y se lanza en picada
 * voraz cada 3 segundos hacia la posición de la Libélula.
 */
export class BossKingfisher extends Phaser.GameObjects.Container {
  public declare body: Phaser.Physics.Arcade.Body;
  public hp: number = 5;
  public readonly maxHp: number = 5;
  public state: BossState = 'PATROL';

  private visualSprite: Phaser.GameObjects.Sprite;
  private patrolSpeed: number = 220;
  private patrolMinX: number = 160;
  private patrolMaxX: number = 1120;
  private patrolBaseY: number = 300;
  private diveTimer: number = 0;
  private readonly DIVE_INTERVAL_MS: number = 3000;
  private diveTarget: { x: number; y: number } = { x: 0, y: 0 };
  private invulnerableTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number = 640, y: number = 300) {
    super(scene, x, y);
    this.visualSprite = scene.add.sprite(0, 0, 'boss_kingfisher');
    this.add(this.visualSprite);

    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setSize(90, 50);
    this.body.setOffset(-45, -25);
    this.setDepth(300);

    this.body.setVelocityX(this.patrolSpeed);
  }

  public isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  public takeDamage(amount: number = 1): number {
    if (this.isInvulnerable() || this.hp <= 0) return this.hp;

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 28; // ~450ms de invulnerabilidad temporal

    // Flash blanco y parpadeo
    this.visualSprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(160, () => {
      this.visualSprite.clearTint();
    });

    // Rebote y retroceso tras el impacto
    const bounceDir = this.body.velocity.x > 0 ? -1 : 1;
    this.body.setVelocity(bounceDir * 320, -280);

    return this.hp;
  }

  public updateBoss(delta: number, playerX: number, playerY: number): void {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer--;
    }

    if (this.hp <= 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    switch (this.state) {
      case 'PATROL':
        this.diveTimer += delta;

        // Patrullaje horizontal en el dosel aéreo
        if (this.x <= this.patrolMinX) {
          this.body.setVelocityX(this.patrolSpeed);
          this.visualSprite.setFlipX(false);
        } else if (this.x >= this.patrolMaxX) {
          this.body.setVelocityX(-this.patrolSpeed);
          this.visualSprite.setFlipX(true);
        }

        // Oscilación sinusoidal de vuelo
        const wave = Math.sin(this.scene.time.now * 0.005) * 20;
        this.y = this.patrolBaseY + wave;

        // Cada 3 segundos ejecuta una picada hacia la Libélula
        if (this.diveTimer >= this.DIVE_INTERVAL_MS) {
          this.diveTimer = 0;
          this.state = 'DIVE_TELEGRAPH';
          this.diveTarget = { x: playerX, y: Math.min(1500, Math.max(360, playerY)) };
          this.body.setVelocity(0, -50);

          // Aviso visual previo a la embestida
          this.scene.tweens.add({
            targets: this.visualSprite,
            scaleX: 1.25,
            scaleY: 0.8,
            duration: 180,
            yoyo: true,
            onComplete: () => {
              if (this.hp > 0) {
                this.state = 'DIVING';
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);
                const diveSpeed = 620;
                this.body.setVelocity(Math.cos(angle) * diveSpeed, Math.sin(angle) * diveSpeed);
                this.visualSprite.setFlipX(this.diveTarget.x < this.x);
              }
            }
          });
        }
        break;

      case 'DIVING':
        // Al descender cerca de la posición objetivo o profundidad límite
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);
        if (dist < 70 || this.y >= this.diveTarget.y || this.y > 1520) {
          this.state = 'RECOVERING';
          this.body.setVelocity(this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed, -420);
        }
        break;

      case 'RECOVERING':
        // Regresa suavemente hacia el dosel aéreo (y = 300)
        if (this.y <= this.patrolBaseY + 25) {
          this.y = this.patrolBaseY;
          this.state = 'PATROL';
          this.body.setVelocity(this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed, 0);
        }
        break;
    }
  }
}
