import Phaser from 'phaser';
import { BaseFood } from './BaseFood';
import { FoodType } from '../../core/types/GameTypes';

/**
 * Mosca pequeña del manglar. Alimento de la Fase 1 (Hongo).
 * Movimiento: Aleteo rápido con micro-oscilación.
 */
export class FlyFood extends BaseFood {
  public readonly type = FoodType.FLY;
  public readonly nutritionalValue = 25;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'food_fly', 14);
    this.visualSprite.setDisplaySize(34, 30);
    this.looksLeftOriginally = false; // avispa.png mira a la derecha
    this.floatSpeed = 0.005;
    this.floatAmplitudeY = 8;
    this.floatAmplitudeX = 6;
  }
}

/**
 * Pez del manglar. Alimento de la Fase 2 (Renacuajo/Pez).
 * Alterna entre pez_rosa, pez_naranja y pez_celeste.
 * Movimiento: Ondulación de nado horizontal suave.
 */
export class FishFood extends BaseFood {
  public readonly type = FoodType.FISH;
  public readonly nutritionalValue = 20;
  private static variantCounter: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const variants = ['food_fish_pink', 'food_fish_orange', 'food_fish_cyan'];
    const chosen = variants[FishFood.variantCounter % variants.length];
    FishFood.variantCounter++;

    super(scene, x, y, chosen, 15);
    this.visualSprite.setDisplaySize(36, 34);

    // pez_naranja y pez_celeste miran a la izquierda; pez_rosa mira a la derecha
    this.looksLeftOriginally = (chosen !== 'food_fish_pink');

    this.floatSpeed = 0.003;
    this.floatAmplitudeY = 6;
    this.floatAmplitudeX = 16;
  }
}

/**
 * Mosca grande de ribera. Alimento de la Fase 3 (Rana/Pez Naranja).
 * Movimiento: Vuelo errático con mayor amplitud.
 */
export class BigFlyFood extends BaseFood {
  public readonly type = FoodType.BIG_FLY;
  public readonly nutritionalValue = 25;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'food_big_fly', 18);
    this.visualSprite.setDisplaySize(42, 36);
    this.looksLeftOriginally = false;
    this.floatSpeed = 0.0035;
    this.floatAmplitudeY = 12;
    this.floatAmplitudeX = 10;
  }
}

/**
 * Avispa amarilla rayada. Alimento de la Fase 4 (Libélula).
 * Movimiento: Vuelo rápido de caza.
 */
export class WaspFood extends BaseFood {
  public readonly type = FoodType.WASP;
  public readonly nutritionalValue = 18;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'food_wasp', 16);
    this.visualSprite.setDisplaySize(46, 40);
    this.looksLeftOriginally = false;
    this.floatSpeed = 0.0045;
    this.floatAmplitudeY = 10;
    this.floatAmplitudeX = 18;
  }
}
