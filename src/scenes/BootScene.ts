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

  public preload(): void {
    // 1. Precarga estándar con new Image()
    const spriteNames = [
      'hongo',
      'pez_celeste',
      'pez_naranja',
      'pez_rosa',
      'libelula',
      'tiburon',
      'calamar',
      'avispa',
      'rana',
      'mosca'
    ];
    spriteNames.forEach((name) => {
      const img = new Image();
      img.src = `/assets/sprites/${name}.png`;
    });

    // 2. Carga en el Texture Manager de Phaser con los nombres oficiales y aliases
    this.load.image('player_mushroom', '/assets/sprites/hongo.png');
    this.load.image('player_tadpole', '/assets/sprites/pez_celeste.png');
    this.load.image('player_frog', '/assets/sprites/rana.png');
    this.load.image('player_dragonfly', '/assets/sprites/libelula.png');
    this.load.image('player_shark', '/assets/sprites/tiburon.png');

    // Presas
    this.load.image('food_fly', '/assets/sprites/mosca.png');
    this.load.image('food_fish', '/assets/sprites/pez_rosa.png');
    this.load.image('food_fish_pink', '/assets/sprites/pez_rosa.png');
    this.load.image('food_fish_orange', '/assets/sprites/pez_naranja.png');
    this.load.image('food_fish_cyan', '/assets/sprites/pez_celeste.png');
    this.load.image('food_big_fly', '/assets/sprites/mosca.png');
    this.load.image('food_wasp', '/assets/sprites/avispa.png');

    // Jefe Calamar Gigante
    this.load.image('boss_squid', '/assets/sprites/calamar.png');

    // Nombres directos para acceso global
    this.load.image('sprite_hongo', '/assets/sprites/hongo.png');
    this.load.image('sprite_pez_celeste', '/assets/sprites/pez_celeste.png');
    this.load.image('sprite_pez_naranja', '/assets/sprites/pez_naranja.png');
    this.load.image('sprite_pez_rosa', '/assets/sprites/pez_rosa.png');
    this.load.image('sprite_libelula', '/assets/sprites/libelula.png');
    this.load.image('sprite_tiburon', '/assets/sprites/tiburon.png');
    this.load.image('sprite_calamar', '/assets/sprites/calamar.png');
    this.load.image('sprite_avispa', '/assets/sprites/avispa.png');
    this.load.image('sprite_rana', '/assets/sprites/rana.png');
    this.load.image('sprite_mosca', '/assets/sprites/mosca.png');
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
    if (!this.textures.exists('player_mushroom')) {
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
    }

    // ==========================================
    // 2. FASE 2: RENACUAJO DE CIÉNAGA (64 x 36)
    // ==========================================
    if (!this.textures.exists('player_tadpole')) {
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
    }

    // ==========================================
    // 3. FASE 3: RANA ARBORÍCOLA (56 x 50)
    // ==========================================
    if (!this.textures.exists('player_frog')) {
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
    }

    // ==========================================
    // 4. FASE 4: LIBÉLULA (64 x 40)
    // ==========================================
    if (!this.textures.exists('player_dragonfly')) {
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
    }

    // ==========================================
    // 5. ALIMENTOS Y PRESAS PULIDAS
    // ==========================================

    // Mosca Pequeña (Fase 1) - Con alas transparentes y brillo (32 x 32)
    if (!this.textures.exists('food_fly')) {
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
    }

    // Pez Morado con franjas rojas (40 x 28)
    if (!this.textures.exists('food_fish')) {
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
    }

    // Mosca Grande (42 x 42)
    if (!this.textures.exists('food_big_fly')) {
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
    }

    // Avispa Amarilla Rayada (42 x 34)
    if (!this.textures.exists('food_wasp')) {
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
    }

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

    // ==========================================
    // 7. DEPREDADORES DEL NIVEL 2
    // ==========================================
    // Pez Depredador Grande (76 x 40)
    gfx.clear();
    gfx.lineStyle(3, 0x1a0509, 1);
    gfx.fillStyle(0x590d22, 1);
    gfx.beginPath();
    gfx.moveTo(22, 20);
    gfx.lineTo(6, 6);
    gfx.lineTo(12, 20);
    gfx.lineTo(6, 34);
    gfx.closePath();
    gfx.fill();
    gfx.stroke();
    gfx.fillEllipse(44, 20, 28, 15);
    gfx.strokeEllipse(44, 20, 28, 15);
    gfx.fillStyle(0x800f2f, 1);
    gfx.fillTriangle(42, 6, 52, 6, 48, 0);
    gfx.fillTriangle(32, 6, 42, 6, 38, 2);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillTriangle(64, 18, 68, 18, 66, 23);
    gfx.fillTriangle(58, 18, 62, 18, 60, 22);
    gfx.fillStyle(0xffea00, 1);
    gfx.fillCircle(54, 15, 5);
    gfx.fillStyle(0xd90429, 1);
    gfx.fillCircle(55, 15, 2.5);
    gfx.generateTexture('predator_fish', 76, 40);

    // Rana Cazadora (64 x 50)
    gfx.clear();
    gfx.lineStyle(3, 0x05140b, 1);
    gfx.fillStyle(0x132a13, 1);
    gfx.fillCircle(20, 14, 9);
    gfx.strokeCircle(20, 14, 9);
    gfx.fillCircle(44, 14, 9);
    gfx.strokeCircle(44, 14, 9);
    gfx.fillStyle(0xffd000, 1);
    gfx.fillCircle(20, 14, 6);
    gfx.fillCircle(44, 14, 6);
    gfx.fillStyle(0x000000, 1);
    gfx.fillRect(19, 9, 2.5, 10);
    gfx.fillRect(43, 9, 2.5, 10);
    gfx.fillStyle(0x1b4332, 1);
    gfx.fillRoundedRect(8, 20, 48, 26, 12);
    gfx.strokeRoundedRect(8, 20, 48, 26, 12);
    gfx.fillStyle(0xd90429, 0.9);
    gfx.fillCircle(22, 28, 4);
    gfx.fillCircle(42, 28, 4);
    gfx.fillCircle(32, 36, 5);
    gfx.generateTexture('hunter_frog', 64, 50);

    // ==========================================
    // 8. JEFE FINAL: MARTÍN PESCADOR GIGANTE (96 x 64)
    // ==========================================
    gfx.clear();
    gfx.lineStyle(3.5, 0x031926, 1);

    // Cola con plumas azul marino
    gfx.fillStyle(0x003566, 1);
    gfx.fillTriangle(20, 36, 4, 30, 4, 44);
    gfx.strokeTriangle(20, 36, 4, 30, 4, 44);

    // Vientre naranja intenso
    gfx.fillStyle(0xf77f00, 1);
    gfx.fillEllipse(44, 38, 30, 18);
    gfx.strokeEllipse(44, 38, 30, 18);

    // Cuerpo azul rey
    gfx.fillStyle(0x0077b6, 1);
    gfx.fillEllipse(42, 30, 32, 16);
    gfx.strokeEllipse(42, 30, 32, 16);

    // Ala cian con plumas superpuestas
    gfx.fillStyle(0x48cae4, 1);
    gfx.beginPath();
    gfx.moveTo(30, 24);
    gfx.lineTo(58, 26);
    gfx.lineTo(44, 44);
    gfx.lineTo(24, 38);
    gfx.closePath();
    gfx.fill();
    gfx.stroke();

    // Cabeza con cresta azul oscura
    gfx.fillStyle(0x023e8a, 1);
    gfx.fillCircle(62, 22, 18);
    gfx.strokeCircle(62, 22, 18);

    // Cresta superior de plumas
    gfx.fillTriangle(52, 6, 62, 2, 58, 12);
    gfx.fillTriangle(60, 4, 70, 4, 66, 12);

    // Gran pico naranja daga afilado hacia adelante
    gfx.fillStyle(0xf77f00, 1);
    gfx.beginPath();
    gfx.moveTo(76, 18);
    gfx.lineTo(95, 26);
    gfx.lineTo(74, 32);
    gfx.closePath();
    gfx.fill();
    gfx.stroke();

    // Ojo feroz con resplandor dorado
    gfx.fillStyle(0xffea00, 1);
    gfx.fillCircle(66, 20, 6.5);
    gfx.strokeCircle(66, 20, 6.5);
    gfx.fillStyle(0xd90429, 1);
    gfx.fillCircle(67, 20, 3.5);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(66, 18, 1.8);

    gfx.generateTexture('boss_kingfisher', 96, 64);

    // ==========================================
    // 9. JEFE FINAL (NIVEL 3): CALAMAR GIGANTE DEL ABISMO (110 x 70)
    // ==========================================
    if (!this.textures.exists('boss_squid')) {
      gfx.clear();
      gfx.lineStyle(3.5, 0x16001e, 1);

      // Aletas caudales del manto (forma de flecha posterior)
      gfx.fillStyle(0x7209b7, 1);
      gfx.fillTriangle(22, 35, 2, 18, 2, 52);
      gfx.strokeTriangle(22, 35, 2, 18, 2, 52);

      // Manto hidrodinámico alargado (púrpura abisal y carmesí)
      gfx.fillStyle(0x560bad, 1);
      gfx.fillEllipse(42, 35, 36, 22);
      gfx.strokeEllipse(42, 35, 36, 22);

      // Patrón bioluminiscente en el manto (cian eléctrico)
      gfx.fillStyle(0x4cc9f0, 0.9);
      gfx.fillCircle(28, 30, 3);
      gfx.fillCircle(38, 24, 3.5);
      gfx.fillCircle(48, 28, 3);
      gfx.fillCircle(36, 44, 3);
      gfx.fillCircle(48, 42, 3.5);

      // Cabeza del cefalópodo
      gfx.fillStyle(0x3a0ca3, 1);
      gfx.fillCircle(64, 35, 18);
      gfx.strokeCircle(64, 35, 18);

      // Tentáculos principales y brazos extendidos hacia adelante
      gfx.fillStyle(0xb5179e, 1);
      // Brazo superior
      gfx.beginPath();
      gfx.moveTo(76, 26);
      gfx.lineTo(104, 16);
      gfx.lineTo(98, 24);
      gfx.lineTo(76, 31);
      gfx.closePath();
      gfx.fill();
      gfx.stroke();

      // Brazo medio/tentáculo largo depredador
      gfx.beginPath();
      gfx.moveTo(78, 34);
      gfx.lineTo(108, 35);
      gfx.lineTo(104, 39);
      gfx.lineTo(78, 38);
      gfx.closePath();
      gfx.fill();
      gfx.stroke();

      // Brazo inferior
      gfx.beginPath();
      gfx.moveTo(76, 40);
      gfx.lineTo(102, 52);
      gfx.lineTo(96, 45);
      gfx.lineTo(76, 43);
      gfx.closePath();
      gfx.fill();
      gfx.stroke();

      // Ventosas bioluminiscentes
      gfx.fillStyle(0x4cc9f0, 0.95);
      gfx.fillCircle(88, 20, 2);
      gfx.fillCircle(98, 18, 2);
      gfx.fillCircle(92, 36, 2.2);
      gfx.fillCircle(102, 36, 2.2);
      gfx.fillCircle(88, 48, 2);
      gfx.fillCircle(96, 50, 2);

      // Gran ojo abisal hipnótico con resplandor dorado y pupila carmesí
      gfx.fillStyle(0xffea00, 1);
      gfx.fillCircle(66, 32, 7.5);
      gfx.strokeCircle(66, 32, 7.5);
      gfx.fillStyle(0xd90429, 1);
      gfx.fillCircle(67, 32, 4.2);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(65, 30, 2.2);

      gfx.generateTexture('boss_squid', 110, 70);
    }

    gfx.destroy();
  }
}
