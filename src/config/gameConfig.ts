import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';

/**
 * Configuración global del motor Phaser 3 para "Evolución en el Manglar".
 * Optimizado para alta responsividad de controles y desacople de assets.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#071510',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // Activar a true en desarrollo para visualizar hitboxes desacopladas
      fps: 60,
      fixedStep: true
    }
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true // Suaviza movimiento en pantallas de alta densidad
  },
  scene: [BootScene, GameScene]
};
