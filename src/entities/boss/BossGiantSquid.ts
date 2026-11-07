import Phaser from 'phaser';

export type SquidBossState = 'PATROL' | 'CHARGE_TELEGRAPH' | 'CHARGING' | 'RECOVERING';

/**
 * Jefe Final del Estrato Acuático (Nivel 3): Calamar Gigante del Abismo.
 * Posee 5 HP, patrulla las profundidades abisales (y = 1900 a 2250)
 * y ejecuta embestidas acuáticas con tentáculos hacia el jugador.
 * 
 * Diseñado con clamping estricto, mitigación de fallbacks de físicas
 * y temporizadores seguros de recuperación.
 */
export class BossGiantSquid extends Phaser.GameObjects.Container {
  public declare body: Phaser.Physics.Arcade.Body;
  public hp: number = 5;
  public readonly maxHp: number = 5;
  public state: SquidBossState = 'PATROL';

  private visualSprite: Phaser.GameObjects.Sprite;
  private patrolSpeed: number = 190;
  private patrolMinX: number = 180;
  private patrolMaxX: number = 1100;
  private patrolBaseY: number = 2050;
  private chargeTimer: number = 0;
  private stateTimer: number = 0;
  private readonly CHARGE_INTERVAL_MS: number = 3200;
  private chargeTarget: { x: number; y: number } = { x: 640, y: 2050 };
  private invulnerableTimer: number = 0;
  private telegraphTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number = 640, y: number = 2050) {
    super(scene, x, y);
    this.visualSprite = scene.add.sprite(0, 0, 'boss_squid');
    this.add(this.visualSprite);

    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setSize(100, 60);
    this.body.setOffset(-50, -30);
    this.body.setCollideWorldBounds(true);
    this.setDepth(320);

    this.body.setVelocityX(this.patrolSpeed);
  }

  public isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  /**
   * Procesa el impacto recibido por el Calamar Gigante.
   */
  public takeDamage(amount: number = 1): number {
    if (this.isInvulnerable() || this.hp <= 0) return this.hp;

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 30; // ~500ms invulnerabilidad

    if (this.telegraphTween) {
      this.telegraphTween.stop();
      this.telegraphTween = null;
    }
    this.visualSprite.setScale(1);

    // Estado enfurecido a 3 HP o menos (aumenta velocidad y emite resplandor carmesí)
    if (this.hp <= 3 && this.hp > 0) {
      this.patrolSpeed = 240;
      this.visualSprite.setTint(0xff0054);
    }

    // Flash blanco de impacto
    this.visualSprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(160, () => {
      if (this.hp <= 3 && this.hp > 0) {
        this.visualSprite.clearTint();
        this.visualSprite.setTint(0xff0054);
      } else {
        this.visualSprite.clearTint();
      }
    });

    // Cancelar carga y forzar recuperación
    this.state = 'RECOVERING';
    this.stateTimer = 0;
    this.chargeTimer = 0;

    const playerX = (this.scene as any).player?.x ?? 640;
    const bounceDir = this.x >= playerX ? 1 : -1;
    this.body.setVelocity(bounceDir * 180, 80);

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

    this.stateTimer += delta;

    // Límites estrictos dentro del estrato acuático abisal (y = 1600 a 2350)
    const canvasWidth = this.scene.scale.width || 1280;
    const minX = 60;
    const maxX = canvasWidth - 60;
    const minY = 1620;
    const maxY = 2340;

    const safeX = Number.isFinite(this.x) ? this.x : 640;
    const safeY = Number.isFinite(this.y) ? this.y : 2050;
    this.x = Math.max(minX, Math.min(maxX, safeX));
    this.y = Math.max(minY, Math.min(maxY, safeY));

    // Rebotes contra límites horizontales
    if (this.x <= minX && this.body.velocity.x < 0) {
      this.body.setVelocityX(Math.abs(this.patrolSpeed));
      this.visualSprite.setFlipX(false);
    } else if (this.x >= maxX && this.body.velocity.x > 0) {
      this.body.setVelocityX(-Math.abs(this.patrolSpeed));
      this.visualSprite.setFlipX(true);
    }

    switch (this.state) {
      case 'PATROL': {
        this.chargeTimer += delta;

        // Patrullaje horizontal
        if (this.x <= this.patrolMinX && this.body.velocity.x < 0) {
          this.body.setVelocityX(this.patrolSpeed);
          this.visualSprite.setFlipX(false);
        } else if (this.x >= this.patrolMaxX && this.body.velocity.x > 0) {
          this.body.setVelocityX(-this.patrolSpeed);
          this.visualSprite.setFlipX(true);
        }

        // Ondulación acuática orgánica
        const wave = Math.sin(this.scene.time.now * 0.003) * 22;
        this.y = this.patrolBaseY + wave;

        const currentInterval = this.hp <= 3 ? 2400 : this.CHARGE_INTERVAL_MS;
        if (this.chargeTimer >= currentInterval) {
          this.chargeTimer = 0;
          this.stateTimer = 0;
          this.state = 'CHARGE_TELEGRAPH';

          const targetX = Number.isFinite(playerX) ? playerX : 640;
          const targetY = Number.isFinite(playerY) ? Phaser.Math.Clamp(playerY, 1650, 2300) : 2050;
          this.chargeTarget = { x: targetX, y: targetY };
          this.body.setVelocity(0, 0);

          // Anticipación con contracción de tentáculos
          this.telegraphTween = this.scene.tweens.add({
            targets: this.visualSprite,
            scaleX: 1.3,
            scaleY: 0.75,
            duration: 200,
            yoyo: true,
            onComplete: () => {
              this.telegraphTween = null;
              if (this.hp > 0 && this.state === 'CHARGE_TELEGRAPH') {
                this.state = 'CHARGING';
                this.stateTimer = 0;
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.chargeTarget.x, this.chargeTarget.y);
                const speed = this.hp <= 3 ? 520 : 450;
                this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                this.visualSprite.setFlipX(this.chargeTarget.x < this.x);
              }
            }
          });
        }
        break;
      }

      case 'CHARGE_TELEGRAPH':
        if (this.stateTimer > 700) {
          this.state = 'PATROL';
          this.chargeTimer = 0;
        }
        break;

      case 'CHARGING': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.chargeTarget.x, this.chargeTarget.y);
        if (dist < 80 || this.stateTimer > 1500) {
          this.state = 'RECOVERING';
          this.stateTimer = 0;
          const recoverVx = this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed;
          this.body.setVelocity(recoverVx, 0);
        }
        break;
      }

      case 'RECOVERING': {
        const diffY = this.patrolBaseY - this.y;
        if (Math.abs(diffY) > 30) {
          this.body.setVelocityY(Math.sign(diffY) * 160);
        } else {
          this.y = this.patrolBaseY;
          this.state = 'PATROL';
          this.stateTimer = 0;
          this.chargeTimer = 0;
          this.body.setVelocity(this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed, 0);
        }

        if (this.stateTimer > 2200) {
          this.y = this.patrolBaseY;
          this.state = 'PATROL';
          this.stateTimer = 0;
          this.chargeTimer = 0;
          this.body.setVelocity(this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed, 0);
        }
        break;
      }
    }
  }

  public override destroy(fromScene?: boolean): void {
    if (this.telegraphTween) {
      this.telegraphTween.stop();
      this.telegraphTween = null;
    }
    super.destroy(fromScene);
  }
}
