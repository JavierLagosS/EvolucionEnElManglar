import { EvolutionPhase, EvolutionTransitionData, FoodType } from '../types/GameTypes';

export type EventCallback<T = any> = (data: T) => void;

/**
 * Mapa de eventos fuertemente tipado para el desacoplamiento entre
 * Dominio, Capa de Presentación (HUD), Sistema de Audio y Físicas.
 */
export interface GameEventsMap {
  'evolution:progress': { progress: number; targetFood: FoodType };
  'evolution:transition': EvolutionTransitionData;
  'evolution:completed': { finalPhase: EvolutionPhase };
  'food:consumed': { type: FoodType; nutritionalValue: number; accepted: boolean };
  'player:jump': { phase: EvolutionPhase; x: number; y: number };
  'player:land': { phase: EvolutionPhase; x: number; y: number };
}

/**
 * EventBus singleton desacoplado de Phaser.
 * Puede ser utilizado dentro o fuera de contextos de escenas.
 */
export class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<keyof GameEventsMap, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  public on<K extends keyof GameEventsMap>(event: K, callback: EventCallback<GameEventsMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
  }

  public off<K extends keyof GameEventsMap>(event: K, callback: EventCallback<GameEventsMap[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  public emit<K extends keyof GameEventsMap>(event: K, data: GameEventsMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error en listener para evento '${String(event)}':`, error);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = GameEventBus.getInstance();
