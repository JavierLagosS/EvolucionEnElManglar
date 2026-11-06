import Phaser from 'phaser';

/**
 * Generación de placeholders procedurales estilo Kirby's Return to Dream Land Deluxe.
 * Diseñados con proporciones generosas, contornos gruesos estilo dibujo animado (3-4px),
 * degradados de luz, mejillas sonrosadas y brillos especulares blancos nítidos.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create(): void {
    this.createPlaceholderTextures();
    this.scene.start('GameScene');
  }

  private createPlaceholderTextures(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // ==========================================
    // 1. FASE 1: HONGO KIRBY DEL MANGLAR (60 x 60)
    // Cúpula abovedada mango-naranja, motas rojas, mejillas rosadas, ojos grandes y tallo crema
    // ==========================================
    gfx.clear();
    gfx.lineStyle(3.5, 0x160a03, 1);

    // Tallo crema redondeado en la base
    gfx.fillStyle(0xfff3b0, 1);
    gfx.fillRoundedRect(20, 26, 20, 28, 8);
    gfx.strokeRoundedRect(20, 26, 20, 28, 8);

    // Patitas / raíces del tallo
    gfx.fillStyle(0xe5db97, 1);
    gfx.fillCircle(24, 50, 4);
    gfx.fillCircle(36, 50, 4);

    // Cúpula del sombrero (Naranja mango vibrante)
    gfx.fillStyle(0xff6b35, 1);
    gfx.fillCircle(30, 22, 24);
    gfx.strokeCircle(30, 22, 24);

    // Borde inferior redondeado del sombrero
    gfx.fillStyle(0xe85d04, 1);
    gfx.fillEllipse(30, 28, 44, 12);
    gfx.strokeEllipse(30, 28, 44, 12);

    // Motas rojas carmesí en el sombrero
    gfx.fillStyle(0xd90429, 1);
    gfx.fillCircle(18, 14, 5);
    gfx.fillCircle(42, 16, 5.5);
    gfx.fillCircle(30, 9, 4.5);

    // Ojos grandes expresivos estilo Kirby
    gfx.fillStyle(0x160a03, 1);
    gfx.fillEllipse(25, 23, 4, 8);
    gfx.fillEllipse(35, 23, 4, 8);

    // Reflejo azul interior en los ojos
    gfx.fillStyle(0x00b4d8, 1);
    gfx.fillEllipse(25, 25, 3, 4);
    gfx.fillEllipse(35, 25, 3, 4);

    // Pupilas blancas brillantes
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(25, 21, 2);
    gfx.fillCircle(35, 21, 2);

    // Mejillas sonrosadas (Blush)
    gfx.fillStyle(0xff758f, 0.85);
    gfx.fillEllipse(18, 28, 4.5, 3);
    gfx.fillEllipse(42, 28, 4.5, 3);

    // Brillos especulares blancos en el sombrero
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(22, 11, 3.5);
    gfx.fillCircle(26, 8, 2);
    gfx.generateTexture('player_mushroom', 60, 60);

    // ==========================================
    // 2. FASE 2: RENACUAJO DE CIÉNAGA (64 x 36)
    // ==========================================
    gfx.clear();
    gfx.lineStyle(3.5, 0x072216, 1);

    // Cola roja caudal con aleta transparente
    gfx.fillStyle(0xe63946, 1);
    gfx.beginPath();
    gfx.moveTo(32, 18);
    gfx.lineTo(60, 5);
    gfx.lineTo(50, 18);
    gfx.lineTo(60, 31);
    gfx.closePath();
    gfx.fill();
    gfx.stroke();

    // Cuerpo verde esmeralda alargado
    gfx.fillStyle(0x2ec4b6, 1);
    gfx.fillEllipse(25, 18, 22, 14);
    gfx.strokeEllipse(25, 18, 22, 14);

    // Rayas dorsales rojas vibrantes
    gfx.fillStyle(0xd90429, 1);
    gfx.fillRoundedRect(18, 9, 4.5, 18, 2);
    gfx.fillRoundedRect(27, 10, 4.5, 16, 2);

    // Ojo grande con brillo
    gfx.fillStyle(0x072216, 1);
    gfx.fillCircle(14, 15, 5);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(12, 13, 2.5);
    gfx.generateTexture('player_tadpole', 64, 36);

    // ==========================================
    // 3. FASE 3: RANA ARBORÍCOLA (56 x 50)
    // ==========================================
    gfx.clear();
    gfx.lineStyle(3.5, 0x082613, 1);

    // Ojos saltones dobles
    gfx.fillStyle(0x52b788, 1);
    gfx.fillCircle(18, 13, 9);
    gfx.strokeCircle(18, 13, 9);
    gfx.fillCircle(38, 13, 9);
    gfx.strokeCircle(38, 13, 9);

    gfx.fillStyle(0x082613, 1);
    gfx.fillCircle(18, 12, 5);
    gfx.fillCircle(38, 12, 5);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(16, 10, 2.5);
    gfx.fillCircle(36, 10, 2.5);

    // Cuerpo verde vivo
    gfx.fillStyle(0x38b000, 1);
    gfx.fillRoundedRect(8, 18, 40, 28, 14);
    gfx.strokeRoundedRect(8, 18, 40, 28, 14);

    // Vientre amarillo pálido
    gfx.fillStyle(0xfff3b0, 1);
    gfx.fillEllipse(28, 33, 15, 10);
    gfx.generateTexture('player_frog', 56, 50);

    // ==========================================
    // 4. FASE 4: LIBÉLULA (64 x 40)
    // ==========================================
    gfx.clear();
    // 4 alas transparentes con venas
    gfx.lineStyle(2, 0x90e0ef, 0.95);
    gfx.fillStyle(0xe0fbfc, 0.55);

    gfx.strokeEllipse(34, 9, 24, 7);
    gfx.fillEllipse(34, 9, 24, 7);
    gfx.lineBetween(18, 9, 50, 9);

    gfx.strokeEllipse(32, 29, 22, 6);
    gfx.fillEllipse(32, 29, 22, 6);
    gfx.lineBetween(16, 29, 48, 29);

    // Cuerpo verde esmeralda alargado
    gfx.lineStyle(3.5, 0x082613, 1);
    gfx.fillStyle(0x38b000, 1);
    gfx.fillRoundedRect(6, 17, 52, 9, 4.5);
    gfx.strokeRoundedRect(6, 17, 52, 9, 4.5);

    gfx.fillStyle(0x007200, 1);
    gfx.fillCircle(54, 21, 8);
    gfx.strokeCircle(54, 21, 8);
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(56, 19, 3);
    gfx.generateTexture('player_dragonfly', 64, 40);

    // ==========================================
    // 5. ALIMENTOS Y PRESAS PULIDAS
    // ==========================================

    // Mosca Pequeña (Fase 1) - Con alas transparentes y brillo (32 x 32)
    gfx.clear();
    gfx.lineStyle(2, 0x0f141c, 1);
    gfx.fillStyle(0xccfbf1, 0.9);
    gfx.fillEllipse(12, 10, 8, 6);
    gfx.strokeEllipse(12, 10, 8, 6);
    gfx.fillEllipse(20, 10, 8, 6);
    gfx.strokeEllipse(20, 10, 8, 6);
    gfx.fillStyle(0x1e293b, 1);
    gfx.fillCircle(16, 18, 8);
    gfx.strokeCircle(16, 18, 8);
    gfx.fillStyle(0xef4444, 1);
    gfx.fillCircle(13, 15, 3.5);
    gfx.fillCircle(19, 15, 3.5);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(12, 14, 1.5);
    gfx.fillCircle(18, 14, 1.5);
    gfx.generateTexture('food_fly', 32, 32);

    // Pez Morado con franjas rojas (40 x 28)
    gfx.clear();
    gfx.lineStyle(2.5, 0x240046, 1);
    gfx.fillStyle(0x7209b7, 1);
    gfx.beginPath();
    gfx.moveTo(26, 14);
    gfx.lineTo(38, 5);
    gfx.lineTo(33, 14);
    gfx.lineTo(38, 23);
    gfx.closePath();
    gfx.fill();
    gfx.stroke();
    gfx.fillEllipse(18, 14, 15, 10);
    gfx.strokeEllipse(18, 14, 15, 10);
    gfx.fillStyle(0xf72585, 1);
    gfx.fillRect(14, 5, 3.5, 18);
    gfx.fillRect(21, 7, 3.5, 14);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(9, 12, 3.5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(8, 12, 1.8);
    gfx.generateTexture('food_fish', 40, 28);

    // Mosca Grande (42 x 42)
    gfx.clear();
    gfx.lineStyle(2.5, 0x111827, 1);
    gfx.fillStyle(0xbae6fd, 0.9);
    gfx.fillEllipse(13, 12, 12, 8);
    gfx.strokeEllipse(13, 12, 12, 8);
    gfx.fillEllipse(29, 12, 12, 8);
    gfx.strokeEllipse(29, 12, 12, 8);
    gfx.fillStyle(0x0f172a, 1);
    gfx.fillCircle(21, 26, 12);
    gfx.strokeCircle(21, 26, 12);
    gfx.fillStyle(0xdc2626, 1);
    gfx.fillCircle(14, 19, 5.5);
    gfx.strokeCircle(14, 19, 5.5);
    gfx.fillCircle(28, 19, 5.5);
    gfx.strokeCircle(28, 19, 5.5);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(13, 17, 2.5);
    gfx.fillCircle(27, 17, 2.5);
    gfx.generateTexture('food_big_fly', 42, 42);

    // Avispa Amarilla Rayada (42 x 34)
    gfx.clear();
    gfx.lineStyle(2.5, 0x000000, 1);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillEllipse(20, 7, 13, 6);
    gfx.strokeEllipse(20, 7, 13, 6);
    gfx.fillStyle(0xfbbf24, 1);
    gfx.fillRoundedRect(7, 13, 26, 15, 6);
    gfx.strokeRoundedRect(7, 13, 26, 15, 6);
    gfx.fillStyle(0x000000, 1);
    gfx.fillRect(12, 13, 4, 15);
    gfx.fillRect(20, 13, 4, 15);
    gfx.fillRect(27, 14, 3.5, 13);
    gfx.generateTexture('food_wasp', 42, 34);

    // ==========================================
    // 6. PLATAFORMAS DE RAÍCES ORGÁNICAS CON MUSGO (160 x 40)
    // ==========================================
    gfx.clear();
    gfx.lineStyle(3, 0x1f130b, 1);

    // Tronco / raíz oscura con vetas
    gfx.fillStyle(0x45220d, 1);
    gfx.fillRoundedRect(2, 8, 156, 30, 12);
    gfx.strokeRoundedRect(2, 8, 156, 30, 12);

    // Textura de corteza y vetas
    gfx.fillStyle(0x301708, 1);
    gfx.fillRoundedRect(18, 22, 28, 4, 2);
    gfx.fillRoundedRect(75, 24, 36, 4, 2);
    gfx.fillRoundedRect(125, 20, 22, 4, 2);

    // Capa de musgo viva con bordes redondeados
    gfx.fillStyle(0x2d6a4f, 1);
    gfx.fillRoundedRect(4, 4, 152, 14, 7);
    gfx.fillStyle(0x52b788, 1); // Relieve de musgo claro
    gfx.fillRoundedRect(6, 4, 148, 6, 3);
    gfx.fillCircle(24, 14, 5);
    gfx.fillCircle(60, 15, 6);
    gfx.fillCircle(105, 14, 5.5);
    gfx.fillCircle(140, 15, 6);
    gfx.generateTexture('mangrove_platform', 160, 40);

    // Partículas
    gfx.clear();
    gfx.fillStyle(0xfff3b0, 1);
    gfx.fillCircle(8, 8, 4);
    gfx.fillStyle(0xffea00, 0.4);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('firefly_particle', 16, 16);

    gfx.clear();
    gfx.lineStyle(1.5, 0x90e0ef, 0.9);
    gfx.fillStyle(0x00b4d8, 0.35);
    gfx.fillCircle(8, 8, 6);
    gfx.strokeCircle(8, 8, 6);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(6, 6, 1.5);
    gfx.generateTexture('bubble_particle', 16, 16);

    gfx.destroy();
  }
}
