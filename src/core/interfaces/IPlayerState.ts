import { EvolutionPhase, FoodType, PhasePhysicsConfig, PlayerInput } from '../types/GameTypes';
import { IPlayer } from './IPlayer';

/**
 * Contrato de estado individual dentro de la FSM evolutiva del jugador.
 * Cada fase concreta define su comportamiento físico, entradas y presa objetivo.
 */
export interface IPlayerState {
  readonly phase: EvolutionPhase;
  readonly targetFood: FoodType;
  readonly physicsConfig: PhasePhysicsConfig;

  /**
   * Se ejecuta al entrar a esta fase evolutiva. Configura hitboxes,
   * físicas de Arcade y componentes visuales.
   */
  enter(player: IPlayer): void;

  /**
   * Se ejecuta al salir de esta fase hacia la siguiente evolución.
   * Limpia tweens, partículas o temporizadores activos.
   */
  exit(player: IPlayer): void;

  /**
   * Procesa las entradas del jugador según las reglas físicas del estado.
   */
  handleInput(player: IPlayer, input: PlayerInput, delta: number): void;

  /**
   * Actualización por frame (física, coyote time, buffering, fricción).
   */
  update(player: IPlayer, time: number, delta: number): void;

  /**
   * Notificación cuando el jugador entra en un cuerpo de agua.
   */
  onWaterEnter?(player: IPlayer): void;

  /**
   * Notificación cuando el jugador sale de un cuerpo de agua.
   */
  onWaterExit?(player: IPlayer): void;
}
