import { IEvolutionManager } from '../core/interfaces/IEvolutionManager';
import { IFood } from '../core/interfaces/IFood';
import { EvolutionPhase, FoodType } from '../core/types/GameTypes';
import { EVOLUTION_CHAIN, PHASE_CONFIGURATIONS } from '../config/evolutionConfig';
import { EventBus } from '../core/events/EventBus';
import { PlayerStateMachine } from '../core/state-machine/PlayerStateMachine';

/**
 * Gestor del ciclo de evolución del jugador.
 * Aplica lógica de dominio pura:
 * - Filtra presas según la dieta de la fase actual.
 * - Calcula el porcentaje de alimentación (0 - 100%).
 * - Dispara la metamorfosis al alcanzar el 100%.
 * - Aplica penalizaciones por daño trófico en niveles hostiles.
 */
export class EvolutionManager implements IEvolutionManager {
  private _currentPhase: EvolutionPhase;
  private _currentFoodCount: number = 0;
  private readonly stateMachine: PlayerStateMachine;

  constructor(stateMachine: PlayerStateMachine, initialPhase: EvolutionPhase = EvolutionPhase.MUSHROOM) {
    this.stateMachine = stateMachine;
    this._currentPhase = initialPhase;
  }

  public get currentPhase(): EvolutionPhase {
    return this._currentPhase;
  }

  public get targetFood(): FoodType {
    return PHASE_CONFIGURATIONS[this._currentPhase].targetFood;
  }

  public get progress(): number {
    const required = PHASE_CONFIGURATIONS[this._currentPhase].foodRequired;
    if (required <= 0) return 100;
    return Math.min(100, Math.round((this._currentFoodCount / required) * 100));
  }

  public get isMaxEvolution(): boolean {
    return EVOLUTION_CHAIN[this._currentPhase] === null;
  }

  /**
   * Intenta consumir un alimento.
   */
  public feed(food: IFood): boolean {
    if (!food.isActive) return false;

    const isTarget = food.type === this.targetFood;

    if (!isTarget) {
      EventBus.emit('food:consumed', {
        type: food.type,
        nutritionalValue: 0,
        accepted: false
      });
      return false;
    }

    // Consumir presa
    const value = food.consume();
    this._currentFoodCount++;

    EventBus.emit('food:consumed', {
      type: food.type,
      nutritionalValue: value,
      accepted: true
    });

    EventBus.emit('evolution:progress', {
      progress: this.progress,
      targetFood: this.targetFood
    });

    // Si alcanza el 100%, dispara la metamorfosis
    if (this.progress >= 100) {
      this.evolveNext();
    }

    return true;
  }

  /**
   * Aplica una penalización porcentual a la barra de evolución (por daño de depredadores).
   */
  public penalizeProgress(percentAmount: number = 15): void {
    const required = PHASE_CONFIGURATIONS[this._currentPhase].foodRequired;
    const currentPercent = (this._currentFoodCount / required) * 100;
    const newPercent = Math.max(0, currentPercent - percentAmount);
    this._currentFoodCount = (newPercent / 100) * required;

    EventBus.emit('evolution:progress', {
      progress: Math.round(newPercent),
      targetFood: this.targetFood
    });
  }

  /**
   * Transiciona a la siguiente fase de la cadena evolutiva.
   */
  public evolveNext(): EvolutionPhase | null {
    const nextPhase = EVOLUTION_CHAIN[this._currentPhase];

    if (!nextPhase) {
      EventBus.emit('evolution:completed', { finalPhase: this._currentPhase });
      return null;
    }

    this._currentPhase = nextPhase;
    this._currentFoodCount = 0;

    // Disparar cambio en la máquina de estados
    this.stateMachine.transitionTo(nextPhase);

    // Notificar actualización de barra de progreso reseteada para la nueva fase
    EventBus.emit('evolution:progress', {
      progress: 0,
      targetFood: this.targetFood
    });

    return nextPhase;
  }

  /**
   * Reinicia la progresión a la fase inicial de Hongo.
   */
  public reset(): void {
    this._currentPhase = EvolutionPhase.MUSHROOM;
    this._currentFoodCount = 0;
    this.stateMachine.transitionTo(EvolutionPhase.MUSHROOM);
    EventBus.emit('evolution:progress', {
      progress: 0,
      targetFood: this.targetFood
    });
  }
}
