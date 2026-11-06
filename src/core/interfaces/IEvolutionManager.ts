import { EvolutionPhase, FoodType } from '../types/GameTypes';
import { IFood } from './IFood';

/**
 * Contrato del orquestador del ciclo evolutivo.
 * Gestiona el umbral de alimentación y la progresión secuencial de las 4 fases.
 */
export interface IEvolutionManager {
  readonly currentPhase: EvolutionPhase;
  readonly targetFood: FoodType;
  readonly progress: number; // 0 a 100 (%)
  readonly isMaxEvolution: boolean;

  /**
   * Intenta alimentar al jugador con una presa detectada.
   * Valida si el tipo de presa corresponde a la fase actual y actualiza el progreso.
   * @param food Instancia de la presa recolectada.
   * @returns true si el alimento era válido y fue asimilado.
   */
  feed(food: IFood): boolean;

  /**
   * Fuerza o ejecuta la transición hacia la siguiente fase evolutiva si el progreso está al 100%.
   * @returns La nueva fase alcanzada, o null si ya está en la fase final.
   */
  evolveNext(): EvolutionPhase | null;

  /**
   * Reinicia la progresión evolutiva a la Fase 1 (Hongo).
   */
  reset(): void;
}
