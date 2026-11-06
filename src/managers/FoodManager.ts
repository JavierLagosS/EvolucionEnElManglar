import Phaser from 'phaser';
import { EvolutionManager } from './EvolutionManager';
import { FoodType } from '../core/types/GameTypes';
import { BaseFood } from '../entities/food/BaseFood';
import { FlyFood, FishFood, BigFlyFood, WaspFood } from '../entities/food/FoodEntities';

/**
 * Gestor del ecosistema de presas del manglar.
 * Controla la población inicial y la regeneración periódica continua
 * para garantizar que el jugador nunca sufra un softlock por falta de alimento.
 */
export class FoodManager {
  private readonly scene: Phaser.Scene;
  private readonly evolutionManager: EvolutionManager;
  private readonly foodGroup: Phaser.GameObjects.Group;
  private respawnTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, evolutionManager: EvolutionManager, foodGroup: Phaser.GameObjects.Group) {
    this.scene = scene;
    this.evolutionManager = evolutionManager;
    this.foodGroup = foodGroup;

    this.spawnInitialEcosystem();
    this.startPeriodicSpawner();
  }

  /**
   * Genera la distribución inicial balanceada de presas en los 3 estratos ecológicos.
   */
  public spawnInitialEcosystem(): void {
    // ESTRATO 2 (Suelo y Raíces, y: 800 - 1600): Moscas pequeñas para Fase 1 (Hongo)
    this.spawn(new FlyFood(this.scene, 160, 1480));
    this.spawn(new FlyFood(this.scene, 280, 1440));
    this.spawn(new FlyFood(this.scene, 340, 1370));
    this.spawn(new FlyFood(this.scene, 460, 1250));
    this.spawn(new FlyFood(this.scene, 620, 1150));
    this.spawn(new FlyFood(this.scene, 880, 1030));
    this.spawn(new FlyFood(this.scene, 980, 1490));
    this.spawn(new FlyFood(this.scene, 1120, 1460));

    // ESTRATO 3 (Mundo Acuático Profundo, y: 1550 - 2400): Bancos de peces a varias profundidades para Fase 2 (Renacuajo)
    this.spawn(new FishFood(this.scene, 280, 1680));
    this.spawn(new FishFood(this.scene, 720, 1690));
    this.spawn(new FishFood(this.scene, 1050, 1720));
    this.spawn(new FishFood(this.scene, 200, 1880));
    this.spawn(new FishFood(this.scene, 580, 1850));
    this.spawn(new FishFood(this.scene, 880, 1910));
    this.spawn(new FishFood(this.scene, 350, 2100));
    this.spawn(new FishFood(this.scene, 750, 2150));
    this.spawn(new FishFood(this.scene, 1120, 2120));
    this.spawn(new FishFood(this.scene, 500, 2280));
    this.spawn(new FishFood(this.scene, 850, 2300));

    // ESTRATO 1 y 2 (Dosel bajo y raíces altas, y: 400 - 1100): Moscas grandes para Fase 3 (Rana)
    this.spawn(new BigFlyFood(this.scene, 240, 600));
    this.spawn(new BigFlyFood(this.scene, 500, 690));
    this.spawn(new BigFlyFood(this.scene, 820, 480));
    this.spawn(new BigFlyFood(this.scene, 1060, 310));
    this.spawn(new BigFlyFood(this.scene, 600, 210));
    this.spawn(new BigFlyFood(this.scene, 360, 370));
    this.spawn(new BigFlyFood(this.scene, 760, 780));

    // ESTRATO 1 (Dosel Aéreo Superior, y: 0 - 800): Avispas veloces para Fase 4 (Libélula)
    this.spawn(new WaspFood(this.scene, 180, 140));
    this.spawn(new WaspFood(this.scene, 360, 110));
    this.spawn(new WaspFood(this.scene, 560, 160));
    this.spawn(new WaspFood(this.scene, 780, 120));
    this.spawn(new WaspFood(this.scene, 960, 150));
    this.spawn(new WaspFood(this.scene, 1140, 190));
    this.spawn(new WaspFood(this.scene, 680, 310));
  }

  /**
   * Monitorea cada 4 segundos el alimento de la fase actual y respawnea presas
   * si el jugador aún no ha alcanzado el 100% y la población está baja.
   */
  private startPeriodicSpawner(): void {
    this.respawnTimer = this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        this.checkAndReplenishTargetFood();
      }
    });
  }

  private checkAndReplenishTargetFood(): void {
    // Si ya completó el 100% de la fase actual, esperar a la metamorfosis
    if (this.evolutionManager.progress >= 100) return;

    const currentTarget = this.evolutionManager.targetFood;
    const activeCount = this.getActiveFoodCount(currentTarget);

    // Mantener un mínimo de 4 presas de la fase actual en pantalla
    if (activeCount < 4) {
      this.spawnReplenishment(currentTarget);
    }
  }

  private getActiveFoodCount(type: FoodType): number {
    let count = 0;
    this.foodGroup.children.iterate((child) => {
      const food = child as unknown as BaseFood;
      if (food && food.isActive && food.type === type) {
        count++;
      }
      return null;
    });
    return count;
  }

  /**
   * Genera un alimento en la zona biomecánica correspondiente según el estrato.
   */
  private spawnReplenishment(type: FoodType): void {
    let newFood: BaseFood;

    switch (type) {
      case FoodType.FLY: {
        // Estrato 2: Suelo y raíces (y: 1150 - 1520)
        const x = Phaser.Math.Between(120, 1160);
        const y = Phaser.Math.Between(1150, 1520);
        newFood = new FlyFood(this.scene, x, y);
        break;
      }
      case FoodType.FISH: {
        // Estrato 3: Mundo Acuático Profundo (todo el ancho, y: 1650 - 2320)
        const x = Phaser.Math.Between(100, 1180);
        const y = Phaser.Math.Between(1650, 2320);
        newFood = new FishFood(this.scene, x, y);
        break;
      }
      case FoodType.BIG_FLY: {
        // Estrato 1 bajo y Estrato 2 alto (y: 500 - 1100)
        const x = Phaser.Math.Between(150, 1150);
        const y = Phaser.Math.Between(500, 1100);
        newFood = new BigFlyFood(this.scene, x, y);
        break;
      }
      case FoodType.WASP: {
        // Estrato 1: Dosel Aéreo superior (y: 100 - 450)
        const x = Phaser.Math.Between(150, 1150);
        const y = Phaser.Math.Between(100, 450);
        newFood = new WaspFood(this.scene, x, y);
        break;
      }
    }

    // Efecto de spawn suave (aparece escalando desde 0)
    newFood.setScale(0);
    this.spawn(newFood);

    this.scene.tweens.add({
      targets: newFood,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  public spawn(food: BaseFood): void {
    this.foodGroup.add(food);
  }

  public destroy(): void {
    if (this.respawnTimer) {
      this.respawnTimer.destroy();
    }
  }
}
