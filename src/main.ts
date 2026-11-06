import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

/**
 * Punto de entrada principal de la aplicación.
 * Inicializa el motor Phaser de forma segura verificando el estado del DOM,
 * asegurando compatibilidad con recargas en caliente (Vite HMR).
 */
function initGame(): void {
  // Evitar duplicar instancias de Phaser en HMR
  const existingGame = (window as any).__PHASER_GAME__ as Phaser.Game | undefined;
  if (existingGame) {
    existingGame.destroy(true);
  }

  const game = new Phaser.Game(gameConfig);

  if (import.meta.env.DEV) {
    (window as any).__PHASER_GAME__ = game;
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
