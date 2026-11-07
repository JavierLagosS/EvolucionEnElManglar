import Phaser from 'phaser';

export type BossState = 'PATROL' | 'DIVE_TELEGRAPH' | 'DIVING' | 'RECOVERING';

/**
 * Jefe Final del Manglar: Martín Pescador Gigante (Ave Depredadora del Dosel).
 * Posee 5 HP, patrulla el dosel aéreo y ejecuta picadas hacia la Libélula.
 * 
 * Correcciones implementadas:
 * - Clamping estricto de límites (x: 50 a width-50, y: 50 a 1200) para evitar que salga del mapa.
 * - Transición segura a 'RECOVERING' al recibir daño durante una picada, evitando que vy negativo lo expulse hacia arriba.
 * - Temporizador de seguridad (failsafe) para garantizar el retorno a patrulla normal.
 * - Validación numérica en todas las coordenadas contra NaN o undefined.
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
  private stateTimer: number = 0;
  private readonly DIVE_INTERVAL_MS: number = 3000;
  private diveTarget: { x: number; y: number } = { x: 640, y: 600 };
  private invulnerableTimer: number = 0;
  private telegraphTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number = 640, y: number = 300) {
    super(scene, x, y);
    this.visualSprite = scene.add.sprite(0, 0, 'boss_kingfisher');
    this.add(this.visualSprite);

    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setSize(90, 50);
    this.body.setOffset(-45, -25);
    this.body.setCollideWorldBounds(true);
    this.setDepth(300);

    this.body.setVelocityX(this.patrolSpeed);
  }

  public isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  /**
   * Procesa el impacto recibido.
   * Cancela picadas en curso y fuerza un retorno seguro al dosel aéreo (evitando que quede atrapado fuera de pantalla).
   */
  public takeDamage(amount: number = 1): number {
    if (this.isInvulnerable() || this.hp <= 0) return this.hp;

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 30; // ~500ms de invulnerabilidad temporal

    // Detener cualquier animación de preparación de picada en curso
    if (this.telegraphTween) {
      this.telegraphTween.stop();
      this.telegraphTween = null;
    }
    this.visualSprite.setScale(1);

    // Si tiene 3 HP o menos, entra en estado enfurecido (ligero tinte rojizo constante y mayor velocidad)
    if (this.hp <= 3 && this.hp > 0) {
      this.patrolSpeed = 250;
      this.visualSprite.setTint(0xff758f);
    }

    // Flash blanco de impacto
    this.visualSprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(160, () => {
      if (this.hp <= 3 && this.hp > 0) {
        this.visualSprite.clearTint();
        this.visualSprite.setTint(0xff758f); // Mantener tinte de furia
      } else {
        this.visualSprite.clearTint();
      }
    });

    // Cancelar picada y forzar recuperación hacia el dosel inmediatamente
    this.state = 'RECOVERING';
    this.stateTimer = 0;
    this.diveTimer = 0;

    // Rebote suave lejos del impacto
    const playerX = (this.scene as any).player?.x ?? 640;
    const bounceDir = this.x >= playerX ? 1 : -1;
    this.body.setVelocity(bounceDir * 200, -180);

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

    // 1. LÍMITES ESTRICTOS DE MUNDO (CLAMPING)
    const canvasWidth = this.scene.scale.width || 1280;
    const minX = 50;
    const maxX = canvasWidth - 50;
    const minY = 50;
    const maxY = 1200;

    // Garantizar que x e y sean números válidos
    const safeX = Number.isFinite(this.x) ? this.x : 640;
    const safeY = Number.isFinite(this.y) ? this.y : 300;
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

    // 2. MÁQUINA DE ESTADOS DEL JEFE
    switch (this.state) {
      case 'PATROL': {
        this.diveTimer += delta;

        // Patrullaje horizontal en el dosel aéreo
        if (this.x <= this.patrolMinX && this.body.velocity.x < 0) {
          this.body.setVelocityX(this.patrolSpeed);
          this.visualSprite.setFlipX(false);
        } else if (this.x >= this.patrolMaxX && this.body.velocity.x > 0) {
          this.body.setVelocityX(-this.patrolSpeed);
          this.visualSprite.setFlipX(true);
        }

        // Suave oscilación de vuelo
        const wave = Math.sin(this.scene.time.now * 0.005) * 18;
        this.y = this.patrolBaseY + wave;

        // Intervalo de picada (más rápido a 3 HP o menos)
        const currentInterval = this.hp <= 3 ? 2400 : this.DIVE_INTERVAL_MS;

        if (this.diveTimer >= currentInterval) {
          this.diveTimer = 0;
          this.stateTimer = 0;
          this.state = 'DIVE_TELEGRAPH';

          const targetX = Number.isFinite(playerX) ? playerX : 640;
          const targetY = Number.isFinite(playerY) ? Phaser.Math.Clamp(playerY, 350, 1150) : 600;
          this.diveTarget = { x: targetX, y: targetY };
          this.body.setVelocity(0, -40);

          // Aviso visual previo a la embestida
          this.telegraphTween = this.scene.tweens.add({
            targets: this.visualSprite,
            scaleX: 1.25,
            scaleY: 0.8,
            duration: 180,
            yoyo: true,
            onComplete: () => {
              this.telegraphTween = null;
              if (this.hp > 0 && this.state === 'DIVE_TELEGRAPH') {
                this.state = 'DIVING';
                this.stateTimer = 0;
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);
                const diveSpeed = this.hp <= 3 ? 560 : 500;
                const vx = Math.cos(angle) * diveSpeed;
                const vy = Math.sin(angle) * diveSpeed;
                this.body.setVelocity(vx, vy);
                this.visualSprite.setFlipX(this.diveTarget.x < this.x);
              }
            }
          });
        }
        break;
      }

      case 'DIVE_TELEGRAPH':
        // Si por alguna razón pasa más de 600ms en telegraph, forzar picada o patrulla
        if (this.stateTimer > 600) {
          this.state = 'PATROL';
          this.diveTimer = 0;
        }
        break;

      case 'DIVING': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);

        // Si llega al objetivo, pasa de la profundidad límite o transcurren 1400ms
        if (dist < 80 || this.y >= this.diveTarget.y || this.y >= 1150 || this.stateTimer > 1400) {
          this.state = 'RECOVERING';
          this.stateTimer = 0;
          const recoverVx = this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed;
          this.body.setVelocity(recoverVx, -340);
        }
        break;
      }

      case 'RECOVERING': {
        // Asegurar que siga subiendo hacia el dosel
        if (this.y > this.patrolBaseY + 20) {
          this.body.setVelocityY(-320);
        } else {
          // Llegó de vuelta al dosel aéreo
          this.y = this.patrolBaseY;
          this.state = 'PATROL';
          this.stateTimer = 0;
          this.diveTimer = 0; // Reiniciar temporizador para ciclo completo de patrulla
          this.body.setVelocity(this.visualSprite.flipX ? -this.patrolSpeed : this.patrolSpeed, 0);
        }

        // Failsafe: si después de 2000ms sigue en recovering, forzar regreso a patrulla en y = 300
        if (this.stateTimer > 2000) {
          this.y = this.patrolBaseY;
          this.state = 'PATROL';
          this.stateTimer = 0;
          this.diveTimer = 0;
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
