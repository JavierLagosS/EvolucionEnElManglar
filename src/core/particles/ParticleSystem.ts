import Phaser from 'phaser';
import { FoodType } from '../types/GameTypes';

/**
 * Sistema global de partículas para efectos de impacto, salpicaduras y evolución estilo Kirby.
 * Emite partículas ligeras en Canvas/WebGL con ciclo de vida autogestionado.
 */
export class ParticleSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Al comer: explosión de 8 a 12 partículas del color de la presa desvaneciéndose en 350ms.
   */
  public emitEatParticles(x: number, y: number, foodType?: FoodType): void {
    const count = Phaser.Math.Between(8, 12);
    let color = 0xef4444; // Default rojo para Mosca Pequeña

    if (foodType) {
      switch (foodType) {
        case FoodType.FLY:
          color = 0xef4444; // Rojo intenso
          break;
        case FoodType.FISH:
          color = 0xd946ef; // Magenta / Púrpura neón
          break;
        case FoodType.BIG_FLY:
          color = 0x38bdf8; // Celeste / Cian
          break;
        case FoodType.WASP:
          color = 0xfacc15; // Amarillo avispa brillante
          break;
      }
    }

    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 150);
      const radius = Phaser.Math.FloatBetween(2.5, 4.5);

      const particle = this.scene.add.circle(x, y, radius, color, 0.95);
      particle.setDepth(200);

      const targetX = x + Math.cos(angle) * (speed * 0.35);
      const targetY = y + Math.sin(angle) * (speed * 0.35);

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  /**
   * En y = 1550 al salpicar: 15 gotas de agua/burbujas arrojadas hacia arriba con gravedad simulada.
   */
  public emitSplashParticles(x: number, y: number = 1550): void {
    const count = 15;
    const waterColors = [0x90e0ef, 0x00b4d8, 0xcaf0f8, 0xffffff];

    for (let i = 0; i < count; i++) {
      const color = Phaser.Utils.Array.GetRandom(waterColors);
      const radius = Phaser.Math.FloatBetween(2.5, 5);
      const droplet = this.scene.add.circle(x + Phaser.Math.Between(-20, 20), y, radius, color, 0.85);
      droplet.setDepth(200);

      const horizontalDist = Phaser.Math.Between(-80, 80);
      const peakHeight = Phaser.Math.Between(45, 110);
      const totalDuration = Phaser.Math.Between(450, 650);

      // Desplazamiento horizontal lineal
      this.scene.tweens.add({
        targets: droplet,
        x: droplet.x + horizontalDist,
        duration: totalDuration,
        ease: 'Linear'
      });

      // Arco parabólico: impulso hacia arriba y caída con gravedad
      this.scene.tweens.add({
        targets: droplet,
        y: y - peakHeight,
        duration: totalDuration * 0.45,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: droplet,
            y: y + 30,
            alpha: 0,
            duration: totalDuration * 0.55,
            ease: 'Quad.easeIn',
            onComplete: () => {
              droplet.destroy();
            }
          });
        }
      });
    }
  }

  /**
   * Al evolucionar: destello radial masivo de 35 partículas multicolores alrededor del jugador.
   */
  public emitEvolutionParticles(x: number, y: number): void {
    const count = 35;
    const palette = [0xffd166, 0x06d6a0, 0x118ab2, 0xef476f, 0x70e000, 0xffbe0b, 0xffffff];

    for (let i = 0; i < count; i++) {
      const color = Phaser.Utils.Array.GetRandom(palette);
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15);
      const distance = Phaser.Math.Between(100, 260);
      const radius = Phaser.Math.FloatBetween(3.5, 7.5);

      const spark = this.scene.add.circle(x, y, radius, color, 1);
      spark.setDepth(300);

      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      const duration = Phaser.Math.Between(550, 750);

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          spark.destroy();
        }
      });
    }
  }
}
