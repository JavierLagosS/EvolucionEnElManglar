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

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    requiredPhase: number,
    patrolMinX: number,
    patrolMaxX: number,
    patrolSpeed: number
  ) {
    super(scene, x, y, texture);
    this.requiredPhase = requiredPhase;
    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.patrolSpeed = patrolSpeed;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setVelocityX(patrolSpeed);
  }

  public override update(): void {
    if (this.x >= this.patrolMaxX) {
      this.setVelocityX(-Math.abs(this.patrolSpeed));
      this.setFlipX(false);
    } else if (this.x <= this.patrolMinX) {
      this.setVelocityX(Math.abs(this.patrolSpeed));
      this.setFlipX(true);
    }
  }
}

/**
 * Pez Depredador Grande: Patrulla el Estrato Acuático (y > 1550).
 */
export class PredatorFish extends PredatorEntity {
  constructor(scene: Phaser.Scene, x: number = 640, y: number = 1950) {
    super(scene, x, y, 'predator_fish', 5, 180, 1100, 140);
    this.body.setSize(68, 32);
  }
}

/**
 * Rana Cazadora: Patrulla el Estrato Medio (y entre 1200 y 1550).
 */
export class HunterFrog extends PredatorEntity {
  constructor(scene: Phaser.Scene, x: number = 550, y: number = 1420) {
    super(scene, x, y, 'hunter_frog', 4, 200, 1080, 110);
    this.body.setSize(58, 42);
  }
}
