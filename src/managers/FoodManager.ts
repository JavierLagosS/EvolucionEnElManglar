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
   * Genera la distribución inicial balanceada de presas.
   */
  public spawnInitialEcosystem(): void {
    // FASE 1: Moscas pequeñas (6 unidades distribuidas en suelo y plataformas bajas)
    this.spawn(new FlyFood(this.scene, 140, 570));
    this.spawn(new FlyFood(this.scene, 220, 640));
    this.spawn(new FlyFood(this.scene, 320, 490));
    this.spawn(new FlyFood(this.scene, 380, 640));
    this.spawn(new FlyFood(this.scene, 480, 580));
    this.spawn(new FlyFood(this.scene, 620, 480));

    // FASE 2: Peces (6 unidades dentro del estanque de agua)
    this.spawn(new FishFood(this.scene, 480, 610));
    this.spawn(new FishFood(this.scene, 550, 640));
    this.spawn(new FishFood(this.scene, 620, 590));
    this.spawn(new FishFood(this.scene, 680, 630));
    this.spawn(new FishFood(this.scene, 740, 600));
    this.spawn(new FishFood(this.scene, 520, 660));

    // FASE 3: Moscas grandes (5 unidades en plataformas medias y altas)
    this.spawn(new BigFlyFood(this.scene, 520, 400));
    this.spawn(new BigFlyFood(this.scene, 720, 330));
    this.spawn(new BigFlyFood(this.scene, 880, 250));
    this.spawn(new BigFlyFood(this.scene, 1020, 420));
    this.spawn(new BigFlyFood(this.scene, 320, 360));

    // FASE 4: Avispas (6 unidades en el dosel superior / aire)
    this.spawn(new WaspFood(this.scene, 200, 150));
    this.spawn(new WaspFood(this.scene, 400, 120));
    this.spawn(new WaspFood(this.scene, 600, 160));
    this.spawn(new WaspFood(this.scene, 800, 130));
    this.spawn(new WaspFood(this.scene, 1000, 140));
    this.spawn(new WaspFood(this.scene, 1150, 180));
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
   * Genera un alimento en la zona biomecánica correspondiente.
   */
  private spawnReplenishment(type: FoodType): void {
    let newFood: BaseFood;

    switch (type) {
      case FoodType.FLY: {
        const x = Phaser.Math.Between(150, 750);
        const y = Phaser.Math.Between(480, 640);
        newFood = new FlyFood(this.scene, x, y);
        break;
      }
      case FoodType.FISH: {
        // Estanque de agua (x: 460 - 750, y: 580 - 660)
        const x = Phaser.Math.Between(480, 750);
        const y = Phaser.Math.Between(580, 660);
        newFood = new FishFood(this.scene, x, y);
        break;
      }
      case FoodType.BIG_FLY: {
        const x = Phaser.Math.Between(300, 1050);
        const y = Phaser.Math.Between(260, 440);
        newFood = new BigFlyFood(this.scene, x, y);
        break;
      }
      case FoodType.WASP: {
        const x = Phaser.Math.Between(150, 1150);
        const y = Phaser.Math.Between(100, 220);
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
