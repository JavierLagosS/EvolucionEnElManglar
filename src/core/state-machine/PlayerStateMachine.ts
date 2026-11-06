import { IPlayer } from '../interfaces/IPlayer';
import { IPlayerState } from '../interfaces/IPlayerState';
import { EvolutionPhase, PlayerInput } from '../types/GameTypes';
import { EventBus } from '../events/EventBus';

/**
 * Máquina de Estados Finita (FSM) que controla el ciclo de vida
 * y comportamiento evolutivo del jugador.
 */
export class PlayerStateMachine {
  private readonly player: IPlayer;
  private readonly states: Map<EvolutionPhase, IPlayerState> = new Map();
  private currentState: IPlayerState | null = null;

  constructor(player: IPlayer) {
    this.player = player;
  }

  /**
   * Registra una instancia de estado asociada a una fase.
   */
  public registerState(state: IPlayerState): this {
    this.states.set(state.phase, state);
    return this;
  }

  /**
   * Inicializa la máquina de estados en una fase inicial.
   */
  public start(initialPhase: EvolutionPhase): void {
    const state = this.states.get(initialPhase);
    if (!state) {
      throw new Error(`[PlayerStateMachine] No existe un estado registrado para la fase '${initialPhase}'`);
    }

    this.currentState = state;
    this.currentState.enter(this.player);
  }

  /**
   * Cambia el estado actual hacia una nueva fase evolutiva.
   */
  public transitionTo(phase: EvolutionPhase): boolean {
    if (this.currentState && this.currentState.phase === phase) {
      return false; // Ya está en dicho estado
    }

    const nextState = this.states.get(phase);
    if (!nextState) {
      console.warn(`[PlayerStateMachine] Intento de transición a fase no registrada: ${phase}`);
      return false;
    }

    const prevPhase = this.currentState?.phase ?? phase;

    // Salida del estado anterior
    if (this.currentState) {
      this.currentState.exit(this.player);
    }

    // Entrada al nuevo estado
    this.currentState = nextState;
    this.currentState.enter(this.player);

    // Notificar al EventBus para HUD, partículas y SFX
    EventBus.emit('evolution:transition', {
      previousPhase: prevPhase,
      newPhase: phase,
      targetFood: nextState.targetFood,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Obtiene la fase evolutiva actual.
   */
  public getCurrentPhase(): EvolutionPhase | null {
    return this.currentState ? this.currentState.phase : null;
  }

  /**
   * Obtiene el estado actual activo.
   */
  public getCurrentState(): IPlayerState | null {
    return this.currentState;
  }

  /**
   * Delega el procesamiento de entrada al estado activo.
   */
  public handleInput(input: PlayerInput, delta: number): void {
    if (this.currentState) {
      this.currentState.handleInput(this.player, input, delta);
    }
  }

  /**
   * Ciclo de actualización por frame delegado al estado activo.
   */
  public update(time: number, delta: number): void {
    if (this.currentState) {
      this.currentState.update(this.player, time, delta);
    }
  }

  /**
   * Notificación de entrada a zona acuática.
   */
  public onWaterEnter(): void {
    if (this.currentState && this.currentState.onWaterEnter) {
      this.currentState.onWaterEnter(this.player);
    }
  }

  /**
   * Notificación de salida de zona acuática.
   */
  public onWaterExit(): void {
    if (this.currentState && this.currentState.onWaterExit) {
      this.currentState.onWaterExit(this.player);
    }
  }
}
