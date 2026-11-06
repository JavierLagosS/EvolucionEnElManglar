import { FoodType } from '../types/GameTypes';

/**
 * Contrato de entidad de presa/alimento.
 * Permite desacoplar el modelo nutricional de la representación física o visual.
 */
export interface IFood {
  readonly id: string;
  readonly type: FoodType;
  readonly nutritionalValue: number;
  readonly isActive: boolean;

  /**
   * Ejecuta la lógica de consumo de la presa.
   * @returns El valor nutricional aportado.
   */
  consume(): number;

  /**
   * Resetea o destruye la presa según la estrategia de pooling.
   */
  despawn(): void;
}
