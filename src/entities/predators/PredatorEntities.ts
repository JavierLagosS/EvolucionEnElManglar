import Phaser from 'phaser';

/**
 * Entidad base para depredadores del Nivel 2.
 * Patrullan activamente su estrato correspondiente y dañan al jugador
 * si este aún no ha alcanzado la fase evolutiva suficiente.
 */
export class PredatorEntity extends Phaser.Physics.Arcade.Sprite {
  public declare body: Phaser.Physics.Arcade.Body;
  public readonly requiredPhase: number;
  private patrolMinX: number;
  private patrolMaxX: number;
  private patrolSpeed: number;
  public nativeFacing: 'left' | 'right' | 'front';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    requiredPhase: number,
    patrolMinX: number,
    patrolMaxX: number,
    patrolSpeed: number,
    nativeFacing: 'left' | 'right' | 'front' = 'right'
  ) {
    super(scene, x, y, texture);
    this.requiredPhase = requiredPhase;
    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.patrolSpeed = patrolSpeed;
    this.nativeFacing = nativeFacing;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setVelocityX(patrolSpeed);
    this.updateFacing();
  }

  public updateFacing(): void {
    if (this.nativeFacing === 'front') return;
    const movingRight = this.body.velocity.x > 0;
    if (this.nativeFacing === 'left') {
      this.setFlipX(movingRight);
    } else {
      this.setFlipX(!movingRight);
    }
  }

  public override update(): void {
    if (this.x >= this.patrolMaxX && this.body.velocity.x > 0) {
      this.setVelocityX(-Math.abs(this.patrolSpeed));
      this.updateFacing();
    } else if (this.x <= this.patrolMinX && this.body.velocity.x < 0) {
      this.setVelocityX(Math.abs(this.patrolSpeed));
      this.updateFacing();
    }
  }
}

/**
 * Pez Depredador Grande: Patrulla el Estrato Acuático (y > 1550).
 * Sprite oficial: pez_depredador.png (mira naturalmente hacia la DERECHA).
 */
export class PredatorFish extends PredatorEntity {
  constructor(scene: Phaser.Scene, x: number = 640, y: number = 1950) {
    super(scene, x, y, 'predator_fish', 5, 180, 1100, 140, 'right');
    this.setDisplaySize(80, 70);
    this.body.setSize(72, 46);
    this.body.setOffset((this.width - 72) / 2, (this.height - 46) / 2);
  }
}

/**
 * Rana Cazadora: Patrulla el Estrato Medio (y entre 1200 y 1550).
 * Sprite oficial: rana_depredadora.png (vista frontal simétrica, alineada a la base de su hitbox).
 */
export class HunterFrog extends PredatorEntity {
  constructor(scene: Phaser.Scene, x: number = 550, y: number = 1420) {
    super(scene, x, y, 'hunter_frog', 4, 200, 1080, 110, 'front');
    this.setDisplaySize(68, 62);
    this.setOrigin(0.5, 1.0);
    this.body.setSize(58, 48);
    this.body.setOffset((this.width - 58) / 2, this.height - 48);
  }
}
