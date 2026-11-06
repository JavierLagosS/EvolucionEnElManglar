import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { EvolutionManager } from '../managers/EvolutionManager';
import { FoodManager } from '../managers/FoodManager';
import { PlayerInput, FoodType, EvolutionPhase } from '../core/types/GameTypes';
import { EventBus } from '../core/events/EventBus';
import { BaseFood } from '../entities/food/BaseFood';
import { PHASE_CONFIGURATIONS } from '../config/evolutionConfig';
import { PredatorFish, HunterFrog } from '../entities/predators/PredatorEntities';
import { SoundSystem } from '../core/audio/SoundSystem';
import { ParticleSystem } from '../core/particles/ParticleSystem';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 2400;

/**
 * Escena principal de "Evolución en el Manglar".
 * Integra nivel de manglar vertical por estratos, estética enriquecida estilo Kirby,
 * soporte de control universal (Teclado Phaser + DOM listeners + Clic/Touch), HUD dinámico,
 * soporte multinivel con depredadores, habilidades activas por fase (Shift / Clic derecho),
 * sintetizador procedural Web Audio API y sistema global de partículas.
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public evolutionManager!: EvolutionManager;
  public foodManager!: FoodManager;
  public platforms!: Phaser.Physics.Arcade.StaticGroup;
  public foodGroup!: Phaser.GameObjects.Group;
  public predatorGroup!: Phaser.GameObjects.Group;
  public waterZone!: Phaser.GameObjects.Zone;

  // Sistemas globales de Audio y Partículas
  public soundSystem: SoundSystem = SoundSystem.getInstance();
  public particleSystem!: ParticleSystem;

  // Estado de Nivel y Modal de Victoria
  public currentLevel: number = 1;
  private levelText!: Phaser.GameObjects.Text;
  private levelBadgeBg!: Phaser.GameObjects.Graphics;
  private victoryModal: Phaser.GameObjects.Container | null = null;

  // Habilidades activas y Cooldown
  private abilityCooldownTimer: number = 0;
  private readonly ABILITY_COOLDOWN_MS: number = 3000;
  private abilityBadgeBg!: Phaser.GameObjects.Graphics;
  private abilityBarFill!: Phaser.GameObjects.Rectangle;
  private abilityText!: Phaser.GameObjects.Text;

  // Seguimiento vertical de cámara
  private cameraY: number = 0;

  // Fondo y Agua
  private waterSurfaceGfx!: Phaser.GameObjects.Graphics;
  private waterSurfaceWavePhase: number = 0;

  // Teclado Phaser
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };

  // Respaldo de entradas directo por DOM
  private rawKeys = {
    left: false,
    leftJustDown: false,
    right: false,
    rightJustDown: false,
    up: false,
    jump: false,
    jumpJustDown: false
  };

  // Entrada de puntero (Clic / Touch)
  private pointerTarget: { x: number; y: number } | null = null;

  // Elementos de UI/HUD
  private phaseText!: Phaser.GameObjects.Text;
  private targetFoodText!: Phaser.GameObjects.Text;
  private progressBarFill!: Phaser.GameObjects.Rectangle;
  private progressPercentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    // Dimensiones del mundo físico y límites de cámara vertical
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Inicializar sistema de partículas
    this.particleSystem = new ParticleSystem(this);

    // 1. Fondos vibrantes e iluminación atmosférica
    this.createAtmosphericBackground();

    // 2. Partículas flotantes de polen y luciérnagas
    this.createFloatingFireflies();

    // 3. Plataformas escalonadas y suelo
    this.createPlatforms();

    // 4. Zona y Estanque Acuático Continuo (Estrato 3: y = 1550 a 2400)
    this.createWaterBasin();

    // 5. Instanciar Jugador en Estrato 2 (Suelo del Manglar: y = 1450)
    this.player = new Player(this, 120, 1450);

    // Inicializar posición de cámara sobre el jugador
    const targetCameraY = Math.max(0, Math.min(WORLD_HEIGHT - this.scale.height, this.player.y - this.scale.height / 2));
    this.cameraY = targetCameraY;
    this.cameras.main.scrollY = this.cameraY;

    // 6. Configurar Entrada (Teclas, Clic derecho y Shift)
    this.setupInput();

    // 7. Máquina y Gestor de Dominio
    this.evolutionManager = new EvolutionManager(this.player.getStateMachine());

    // 8. Grupo de presas y Spawner Dinámico Continuo
    this.foodGroup = this.add.group({ runChildUpdate: true });
    this.foodManager = new FoodManager(this, this.evolutionManager, this.foodGroup);

    // 9. Grupo de Depredadores (Activo en Nivel 2)
    this.predatorGroup = this.add.group({ runChildUpdate: true });

    // 10. REGISTRAR TODAS LAS FÍSICAS Y COLISIONES (con todos los objetos ya instanciados)
    this.setupPhysicsCollisions();

    // 11. Capa de Presentación / HUD
    this.createHUD();
    this.bindDomainEvents();

    // Limpieza al cerrar escena
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.foodManager.destroy();
    });
  }

  /**
   * Registra colisiones y overlaps físicos garantizando que ninguna entidad sea undefined.
   */
  private setupPhysicsCollisions(): void {
    // Colisión física jugador vs plataformas
    this.physics.add.collider(this.player, this.platforms, () => {
      this.player.markGrounded(160);
    });

    // Overlap jugador vs zona de agua
    this.physics.add.overlap(this.player, this.waterZone, () => {
      if (!this.player.isInWater) {
        this.player.setInWater(true);
        this.soundSystem.playSplash();
        this.particleSystem.emitSplashParticles(this.player.x, 1550);
      }
    });

    // Overlap jugador vs presas de comida (con jerarquía trófica en Nivel 2)
    this.physics.add.overlap(this.player, this.foodGroup, (_p, foodObj) => {
      const food = foodObj as unknown as BaseFood;
      if (!food || !food.isActive) return;

      if (this.currentLevel === 2) {
        const playerRank = this.getPlayerPhaseRank();
        const foodRank = this.getFoodRequiredPhase(food.type);

        if (foodRank > playerRank) {
          // Criatura de estrato superior: ataca al jugador
          this.handleTrophicDamage(food as unknown as Phaser.GameObjects.GameObject);
          return;
        }
      }

      const foodX = food.x;
      const foodY = food.y;
      const foodType = food.type;
      const consumed = this.evolutionManager.feed(food);
      if (consumed) {
        this.soundSystem.playEat();
        this.particleSystem.emitEatParticles(foodX, foodY, foodType);
      }
    });

    // Overlap jugador vs depredadores patrullando en Nivel 2
    this.physics.add.overlap(this.player, this.predatorGroup, (_p, predObj) => {
      if (this.currentLevel === 2) {
        this.handleTrophicDamage(predObj as Phaser.GameObjects.GameObject);
      }
    });
  }

  /**
   * Gestiona el impacto trófico: Knockback, penalización del 15% e invulnerabilidad temporal.
   */
  public handleTrophicDamage(attacker: Phaser.GameObjects.GameObject): void {
    if (this.player.isInvulnerable()) return;

    const attackerX = (attacker as any).x ?? this.player.x;
    const attackerY = (attacker as any).y ?? this.player.y;

    // SFX de daño y knockback
    this.soundSystem.playHurt();

    // 1. Knockback y parpadeo rojo de daño
    this.player.takeDamage(attackerX, attackerY);

    // 2. Penalización de 15% de evolución
    this.evolutionManager.penalizeProgress(15);
  }

  public getPlayerPhaseRank(): number {
    switch (this.evolutionManager.currentPhase) {
      case EvolutionPhase.MUSHROOM: return 1;
      case EvolutionPhase.TADPOLE: return 2;
      case EvolutionPhase.FROG: return 3;
      case EvolutionPhase.DRAGONFLY: return 4;
      default: return 1;
    }
  }

  public getFoodRequiredPhase(foodType: FoodType): number {
    switch (foodType) {
      case FoodType.FLY: return 1;
      case FoodType.FISH: return 2;
      case FoodType.BIG_FLY: return 3;
      case FoodType.WASP: return 4;
      default: return 1;
    }
  }

  /**
   * Dispara la habilidad activa según la fase evolutiva actual (Shift o Clic derecho).
   */
  public triggerPlayerAbility(): boolean {
    if (this.abilityCooldownTimer > 0) return false;
    this.abilityCooldownTimer = this.ABILITY_COOLDOWN_MS;

    this.soundSystem.playAbility();

    const currentPhase = this.evolutionManager.currentPhase;
    switch (currentPhase) {
      case EvolutionPhase.MUSHROOM:
        this.executeMushroomSporeCloud();
        break;
      case EvolutionPhase.TADPOLE:
        this.executeTadpoleSubaquaticDash();
        break;
      case EvolutionPhase.FROG:
        this.executeFrogElasticLeap();
        break;
      case EvolutionPhase.DRAGONFLY:
        this.executeDragonflySupersonicDash();
        break;
    }

    EventBus.emit('ability:used', { phase: currentPhase, x: this.player.x, y: this.player.y });
    return true;
  }

  // --- HABILIDAD 1: Nube de Esporas (Hongo) ---
  private executeMushroomSporeCloud(): void {
    const sporeGfx = this.add.graphics();
    const durationMs = 3000;
    const startTime = this.time.now;

    const sporeTimer = this.time.addEvent({
      delay: 16,
      repeat: 180, // ~3000ms
      callback: () => {
        const elapsed = this.time.now - startTime;
        if (elapsed > durationMs) return;

        sporeGfx.clear();
        sporeGfx.lineStyle(2.5, 0x52b788, 0.85);
        sporeGfx.fillStyle(0x74c69d, 0.16);
        sporeGfx.strokeCircle(this.player.x, this.player.y, 220);
        sporeGfx.fillCircle(this.player.x, this.player.y, 220);

        // Atraer suavemente y ralentizar al 30% a las Moscas Pequeñas dentro de 220px
        this.foodGroup.children.iterate((child) => {
          const food = child as unknown as BaseFood;
          if (food && food.isActive && food.type === FoodType.FLY) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, food.x, food.y);
            if (dist <= 220) {
              food.x += (this.player.x - food.x) * 0.04;
              food.y += (this.player.y - food.y) * 0.04;
            }
          }
          return null;
        });
      }
    });

    this.time.delayedCall(durationMs, () => {
      sporeGfx.destroy();
      sporeTimer.destroy();
    });
  }

  // --- HABILIDAD 2: Dash Subacuático (Renacuajo) ---
  private executeTadpoleSubaquaticDash(): void {
    const dirX = this.player.facingDirection;
    const currentVy = this.player.body.velocity.y;
    this.player.setVelocity(dirX * 720, currentVy * 0.5);
    (this.player as any).invulnerableTimer = 25; // Inmunidad durante el impulso
    this.player.triggerSquashAndStretch(1.6, 0.6, 250);

    // Estela de burbujas blancas
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 35, () => {
        const bubble = this.add.image(this.player.x, this.player.y, 'bubble_particle');
        bubble.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
        this.tweens.add({
          targets: bubble,
          alpha: 0,
          y: bubble.y - 35,
          duration: 400,
          onComplete: () => bubble.destroy()
        });
      });
    }
  }

  // --- HABILIDAD 3: Salto Elástico / Emboscada (Rana) ---
  private executeFrogElasticLeap(): void {
    const dirX = this.player.facingDirection;
    this.player.setVelocity(dirX * 380, -780);
    this.player.triggerSquashAndStretch(0.65, 1.55, 250);
  }

  // --- HABILIDAD 4: Hover + Embestida Supersónica (Libélula) ---
  private executeDragonflySupersonicDash(): void {
    const targetX = this.input.activePointer.worldX || (this.player.x + this.player.facingDirection * 400);
    const targetY = this.input.activePointer.worldY || this.player.y;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
    const speed = 920;

    this.player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    (this.player as any).invulnerableTimer = 25;
    this.player.triggerSquashAndStretch(1.7, 0.6, 220);

    // Estela de luz verde/cian
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 30, () => {
        const ghost = this.add.sprite(this.player.x, this.player.y, 'player_dragonfly');
        ghost.setAlpha(0.6);
        ghost.setTint(0x00f5d4);
        ghost.setFlipX(this.player.facingDirection === -1);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 300,
          onComplete: () => ghost.destroy()
        });
      });
    }
  }

  private createAtmosphericBackground(): void {
    const bgGfx = this.add.graphics();

    // ESTRATO 1: Dosel Aéreo (y: 0 a 800) - Cielo suave de manglar con iluminación dorada
    bgGfx.fillGradientStyle(0x13382c, 0x1d5e46, 0x0f4030, 0x0a2f25, 1);
    bgGfx.fillRect(0, 0, WORLD_WIDTH, 800);

    // ESTRATO 2: Suelo del Manglar y Raíces (y: 800 a 1600) - Bosque denso y raíces
    bgGfx.fillGradientStyle(0x0a2f25, 0x07221b, 0x051a14, 0x03120f, 1);
    bgGfx.fillRect(0, 800, WORLD_WIDTH, 800);

    // ESTRATO 3: Mundo Acuático Profundo (y: 1550 a 2400) - Abismo subacuático
    bgGfx.fillGradientStyle(0x04324f, 0x032238, 0x021929, 0x010f1a, 1);
    bgGfx.fillRect(0, 1550, WORLD_WIDTH, 850);

    // Siluetas lejanas del dosel y árboles (Estrato 1 y 2)
    bgGfx.fillStyle(0x0e362b, 0.4);
    for (let i = 0; i < 7; i++) {
      const x = i * 210 + 30;
      bgGfx.fillRect(x, 600, 44, 950);
      bgGfx.fillCircle(x + 22, 540, 100);
      bgGfx.fillCircle(x - 20, 580, 80);
      bgGfx.fillCircle(x + 65, 580, 85);

      bgGfx.fillCircle(x + 20, 220, 120);
      bgGfx.fillCircle(x - 30, 260, 90);
      bgGfx.fillCircle(x + 70, 260, 95);
    }

    // Raíces zancudas entrelazadas en Estrato 2 bajando hacia el agua
    bgGfx.fillStyle(0x08251e, 0.7);
    for (let i = 0; i < 9; i++) {
      const rx = i * 150 + 20;
      bgGfx.beginPath();
      bgGfx.moveTo(rx, 1100);
      bgGfx.lineTo(rx - 45, 1550);
      bgGfx.lineTo(rx - 20, 1550);
      bgGfx.lineTo(rx + 25, 1100);
      bgGfx.closePath();
      bgGfx.fill();

      bgGfx.beginPath();
      bgGfx.moveTo(rx + 25, 1100);
      bgGfx.lineTo(rx + 70, 1550);
      bgGfx.lineTo(rx + 45, 1550);
      bgGfx.lineTo(rx, 1100);
      bgGfx.closePath();
      bgGfx.fill();
    }

    // Rocas y siluetas submarinas en Estrato 3
    bgGfx.fillStyle(0x021724, 0.65);
    for (let i = 0; i < 6; i++) {
      const bx = i * 230 + 40;
      bgGfx.fillCircle(bx + 40, 2350, 70);
      bgGfx.fillCircle(bx + 90, 2360, 50);
    }

    // Haz de luz solar que penetra el dosel superior
    const sunbeam = this.add.graphics();
    sunbeam.fillStyle(0xfefae0, 0.05);
    sunbeam.beginPath();
    sunbeam.moveTo(350, 0);
    sunbeam.lineTo(600, 0);
    sunbeam.lineTo(850, 1550);
    sunbeam.lineTo(500, 1550);
    sunbeam.closePath();
    sunbeam.fill();
  }

  private createFloatingFireflies(): void {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(40, 1240);
      const y = Phaser.Math.Between(120, 1500);
      const particle = this.add.image(x, y, 'firefly_particle');
      particle.setAlpha(Phaser.Math.FloatBetween(0.25, 0.8));
      particle.setScale(Phaser.Math.FloatBetween(0.6, 1.2));

      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(40, 120),
        x: x + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.15, to: 0.85 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    // ==========================================
    // ESTRATO 3: MUNDO ACUÁTICO PROFUNDO (y: 1550 a 2400)
    // ==========================================
    for (let x = 80; x <= 1280; x += 160) {
      this.platforms.create(x, 2360, 'mangrove_platform');
    }

    this.platforms.create(250, 2180, 'mangrove_platform');
    this.platforms.create(850, 2060, 'mangrove_platform');
    this.platforms.create(440, 1920, 'mangrove_platform');
    this.platforms.create(1050, 1800, 'mangrove_platform');
    this.platforms.create(650, 1680, 'mangrove_platform');

    // ==========================================
    // ESTRATO 2: SUELO DEL MANGLAR Y RAÍCES (y: 800 a 1600)
    // ==========================================
    this.platforms.create(80, 1550, 'mangrove_platform');
    this.platforms.create(220, 1550, 'mangrove_platform');
    this.platforms.create(360, 1550, 'mangrove_platform');
    this.platforms.create(920, 1550, 'mangrove_platform');
    this.platforms.create(1060, 1550, 'mangrove_platform');
    this.platforms.create(1200, 1550, 'mangrove_platform');

    this.platforms.create(220, 1420, 'mangrove_platform');
    this.platforms.create(380, 1310, 'mangrove_platform');
    this.platforms.create(560, 1200, 'mangrove_platform');
    this.platforms.create(750, 1100, 'mangrove_platform');
    this.platforms.create(940, 1000, 'mangrove_platform');
    this.platforms.create(1120, 900, 'mangrove_platform');
    this.platforms.create(780, 830, 'mangrove_platform');

    // ==========================================
    // ESTRATO 1: DOSEL AÉREO (y: 0 a 800)
    // ==========================================
    this.platforms.create(480, 740, 'mangrove_platform');
    this.platforms.create(200, 650, 'mangrove_platform');
    this.platforms.create(520, 540, 'mangrove_platform');
    this.platforms.create(850, 440, 'mangrove_platform');
    this.platforms.create(1100, 360, 'mangrove_platform');
    this.platforms.create(650, 260, 'mangrove_platform');
    this.platforms.create(320, 180, 'mangrove_platform');
  }

  private createWaterBasin(): void {
    this.waterZone = this.add.zone(640, 1975, 1280, 850);
    this.physics.world.enable(this.waterZone, Phaser.Physics.Arcade.STATIC_BODY);

    const waterDeepGfx = this.add.graphics();
    waterDeepGfx.fillStyle(0x0077b6, 0.42);
    waterDeepGfx.fillRect(0, 1550, 1280, 850);

    waterDeepGfx.fillStyle(0x021e33, 0.35);
    waterDeepGfx.fillRect(0, 2000, 1280, 400);

    this.waterSurfaceGfx = this.add.graphics();

    for (let i = 0; i < 20; i++) {
      const bx = Phaser.Math.Between(40, 1240);
      const by = Phaser.Math.Between(1650, 2350);
      const bubble = this.add.image(bx, by, 'bubble_particle');
      bubble.setScale(Phaser.Math.FloatBetween(0.5, 1.2));
      bubble.setAlpha(0.6);

      this.tweens.add({
        targets: bubble,
        y: 1555,
        alpha: { from: 0.6, to: 0.1 },
        duration: Phaser.Math.Between(2500, 5000),
        repeat: -1,
        ease: 'Quad.easeIn',
        onRepeat: () => {
          bubble.x = Phaser.Math.Between(40, 1240);
          bubble.y = Phaser.Math.Between(2200, 2380);
        }
      });
    }
  }

  private setupInput(): void {
    // Desbloquear AudioContext en la primera interacción (Autoplay policy)
    const unlockAudio = () => {
      this.soundSystem.getAudioContext();
    };
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      };
    }

    // Respaldo global por DOM para movimiento y Habilidad (Shift)
    window.addEventListener('keydown', (e) => {
      this.soundSystem.resume();
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        if (!this.rawKeys.left) this.rawKeys.leftJustDown = true;
        this.rawKeys.left = true;
      }
      if (k === 'arrowright' || k === 'd') {
        if (!this.rawKeys.right) this.rawKeys.rightJustDown = true;
        this.rawKeys.right = true;
      }
      if (k === 'arrowup' || k === 'w' || k === ' ' || e.code === 'Space') {
        if (!this.rawKeys.jump) this.rawKeys.jumpJustDown = true;
        this.rawKeys.jump = true;
      }
      if (e.key === 'Shift') {
        this.triggerPlayerAbility();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.rawKeys.left = false;
      if (k === 'arrowright' || k === 'd') this.rawKeys.right = false;
      if (k === 'arrowup' || k === 'w' || k === ' ' || e.code === 'Space') this.rawKeys.jump = false;
    });

    // Clic Derecho para Habilidad (con preventDefault)
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.soundSystem.resume();
      this.triggerPlayerAbility();
    });

    // Soporte para Clic de Ratón y Pantalla Táctil con soporte de cámara vertical
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.soundSystem.resume();
      if (pointer.rightButtonDown()) {
        this.triggerPlayerAbility();
        return;
      }
      this.pointerTarget = { x: pointer.worldX, y: pointer.worldY };
    });
  }

  private createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x05140d, 0.88);
    hudBg.fillRoundedRect(18, 18, 440, 114, 14);
    hudBg.lineStyle(2.5, 0x52b788, 0.9);
    hudBg.strokeRoundedRect(18, 18, 440, 114, 14);
    hudBg.setScrollFactor(0);

    const titleStyle = { fontFamily: 'sans-serif', fontSize: '18px', color: '#95d5b2', fontStyle: 'bold' };
    const labelStyle = { fontFamily: 'sans-serif', fontSize: '14px', color: '#d8f3dc' };

    this.phaseText = this.add.text(34, 28, 'Fase 1: Hongo del Manglar', titleStyle).setScrollFactor(0);
    this.targetFoodText = this.add.text(34, 56, 'Dieta actual: Mosca Pequeña', labelStyle).setScrollFactor(0);

    this.add.text(34, 82, 'Evolución:', labelStyle).setScrollFactor(0);
    this.add.rectangle(116, 92, 250, 18, 0x1b4332).setOrigin(0, 0.5).setScrollFactor(0);
    this.progressBarFill = this.add.rectangle(116, 92, 248, 14, 0x52b788).setOrigin(0, 0.5).setScrollFactor(0);
    this.progressBarFill.setScale(0, 1);
    this.progressPercentText = this.add.text(376, 83, '0%', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setScrollFactor(0);

    // Indicador y selector interactivo de Nivel (Nivel 1: Exploración / Nivel 2: Manglar Hostil)
    this.levelBadgeBg = this.add.graphics().setScrollFactor(0);
    this.levelText = this.add.text(495, 27, '🌱 Nivel: 1 (Exploración)', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#95d5b2',
      fontStyle: 'bold'
    }).setScrollFactor(0);

    this.levelText.setInteractive({ useHandCursor: true });
    this.levelText.on('pointerdown', () => {
      const nextLevel = this.currentLevel === 1 ? 2 : 1;
      this.startLevel(nextLevel);
    });
    this.updateLevelHUD();

    // Barra e indicador de Habilidad Activa (Shift / Clic Derecho)
    this.abilityBadgeBg = this.add.graphics().setScrollFactor(0);
    this.abilityBarFill = this.add.rectangle(730, 42, 136, 6, 0x52b788).setOrigin(0, 0.5).setScrollFactor(0);
    this.abilityText = this.add.text(730, 22, '⚡ Habilidad: LISTA', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#95d5b2',
      fontStyle: 'bold'
    }).setScrollFactor(0);
    this.abilityText.setInteractive({ useHandCursor: true });
    this.abilityText.on('pointerdown', () => {
      this.triggerPlayerAbility();
    });
    this.updateAbilityHUD();

    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x05140d, 0.75);
    hintBg.fillRoundedRect(900, 16, 360, 42, 8);
    hintBg.setScrollFactor(0);
    this.add.text(910, 27, '🎮 Controles: Flechas/WASD | Habilidad: Shift/Clic Der', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#b7e4c7'
    }).setScrollFactor(0);
  }

  public startLevel(level: number): void {
    this.currentLevel = level;
    this.updateLevelHUD();

    if (this.victoryModal) {
      this.victoryModal.destroy();
      this.victoryModal = null;
    }

    // Reiniciar al jugador a Fase 1 (Hongo del Manglar en y = 1450, evolución 0%)
    this.evolutionManager.reset();
    const phaseInfo = PHASE_CONFIGURATIONS[this.evolutionManager.currentPhase];
    this.phaseText.setText(`Fase 1: ${phaseInfo.displayName}`);
    this.targetFoodText.setText(`Dieta actual: ${this.getFoodLabel(this.evolutionManager.targetFood)}`);
    this.progressBarFill.setScale(0, 1);
    this.progressPercentText.setText('0%');

    this.player.setPosition(120, 1450);
    this.player.setVelocity(0, 0);
    this.cameraY = Math.max(0, Math.min(WORLD_HEIGHT - this.scale.height, this.player.y - this.scale.height / 2));
    this.cameras.main.scrollY = this.cameraY;

    // Regenerar el ecosistema para el nivel elegido
    this.foodManager.setLevel(level);

    // En Nivel 2, activar depredadores patrullando
    if (level === 2) {
      this.spawnPredators();
    } else {
      this.predatorGroup.clear(true, true);
    }
  }

  public spawnPredators(): void {
    this.predatorGroup.clear(true, true);

    // Pez Depredador Grande en Estrato Acuático (y > 1550)
    const predatorFish = new PredatorFish(this, 600, 1950);
    this.predatorGroup.add(predatorFish);

    // Rana Cazadora en Estrato Medio (y entre 1200 y 1550)
    const hunterFrog = new HunterFrog(this, 550, 1420);
    this.predatorGroup.add(hunterFrog);
  }

  private updateLevelHUD(): void {
    if (!this.levelText || !this.levelBadgeBg) return;

    this.levelBadgeBg.clear();
    const isLevel2 = this.currentLevel === 2;
    const bgColor = isLevel2 ? 0x2b0909 : 0x05140d;
    const strokeColor = isLevel2 ? 0xe63946 : 0x52b788;
    const textColor = isLevel2 ? '#ff758f' : '#95d5b2';

    this.levelBadgeBg.fillStyle(bgColor, 0.88);
    this.levelBadgeBg.fillRoundedRect(480, 18, 225, 36, 10);
    this.levelBadgeBg.lineStyle(2, strokeColor, 0.9);
    this.levelBadgeBg.strokeRoundedRect(480, 18, 225, 36, 10);

    this.levelText.setColor(textColor);
    this.levelText.setText(isLevel2 ? '⚠️ Nivel: 2 (Manglar Hostil)' : '🌱 Nivel: 1 (Exploración)');
  }

  private updateAbilityHUD(): void {
    if (!this.abilityText || !this.abilityBarFill || !this.abilityBadgeBg) return;

    this.abilityBadgeBg.clear();
    this.abilityBadgeBg.fillStyle(0x05140d, 0.88);
    this.abilityBadgeBg.fillRoundedRect(720, 18, 165, 36, 10);
    this.abilityBadgeBg.lineStyle(1.8, 0x52b788, 0.85);
    this.abilityBadgeBg.strokeRoundedRect(720, 18, 165, 36, 10);

    if (this.abilityCooldownTimer <= 0) {
      this.abilityText.setColor('#52b788');
      this.abilityText.setText('⚡ Habilidad: LISTA');
      this.abilityBarFill.setScale(1, 1);
      this.abilityBarFill.setFillStyle(0x52b788);
    } else {
      const remainingSec = (this.abilityCooldownTimer / 1000).toFixed(1);
      const ratio = 1 - (this.abilityCooldownTimer / this.ABILITY_COOLDOWN_MS);
      this.abilityText.setColor('#ffd166');
      this.abilityText.setText(`⚡ Recargando (${remainingSec}s)`);
      this.abilityBarFill.setScale(Math.max(0, ratio), 1);
      this.abilityBarFill.setFillStyle(0xfb8500);
    }
  }

  public showVictoryModal(): void {
    if (this.victoryModal) {
      this.victoryModal.destroy();
    }

    const modal = this.add.container(640, 360).setScrollFactor(0).setDepth(1000);
    this.victoryModal = modal;

    // Overlay oscuro
    const overlay = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.65);
    overlay.setInteractive();
    modal.add(overlay);

    // Recuadro estético estilo Kirby
    const box = this.add.graphics();
    box.fillStyle(0x051a12, 0.96);
    box.fillRoundedRect(-280, -180, 560, 360, 20);
    box.lineStyle(3.5, 0x52b788, 1);
    box.strokeRoundedRect(-280, -180, 560, 360, 20);
    modal.add(box);

    const isLevel1 = this.currentLevel === 1;

    const title = this.add.text(0, -120, isLevel1 ? '¡ECOSISTEMA DOMINADO!' : '¡DEPREDADOR SUPREMO!', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modal.add(title);

    const subtitle = this.add.text(0, -60, isLevel1
      ? 'Has alcanzado la cima evolutiva como Libélula en el Nivel 1.\n¿Listo para el verdadero peligro y depredadores del Nivel 2?'
      : '¡Has superado el Manglar Hostil frente a todos los depredadores!\n¡Evolución total completada!', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#d8f3dc',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);
    modal.add(subtitle);

    // Botón principal destacado: "Avanzar al Nivel 2: Manglar Hostil"
    const btnWidth = 380;
    const btnHeight = 52;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1b4332, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
    btnBg.lineStyle(2.5, 0x52b788, 1);
    btnBg.strokeRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
    modal.add(btnBg);

    const btnText = this.add.text(0, 41, isLevel1 ? '⚡ Avanzar al Nivel 2: Manglar Hostil' : '🔄 Reiniciar Nivel 2 (Hostil)', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modal.add(btnText);

    const btnHit = this.add.zone(0, 41, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
    btnHit.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2d6a4f, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
      btnBg.lineStyle(2.5, 0x95d5b2, 1);
      btnBg.strokeRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
    });
    btnHit.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1b4332, 1);
      btnBg.fillRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
      btnBg.lineStyle(2.5, 0x52b788, 1);
      btnBg.strokeRoundedRect(-btnWidth / 2, 15, btnWidth, btnHeight, 12);
    });
    btnHit.on('pointerdown', () => {
      this.startLevel(2);
    });
    modal.add(btnHit);

    // Botón secundario para reiniciar o alternar
    const btnSec = this.add.text(0, 115, isLevel1 ? 'Reiniciar Nivel 1 (Exploración)' : 'Volver a Nivel 1 (Pacífico)', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#95d5b2'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btnSec.on('pointerdown', () => {
      this.startLevel(1);
    });
    modal.add(btnSec);

    // Animación elástica estilo Kirby
    modal.setScale(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: 'Back.easeOut'
    });
  }

  private bindDomainEvents(): void {
    EventBus.on('evolution:progress', (data) => {
      const targetScaleX = data.progress / 100;
      this.tweens.add({
        targets: this.progressBarFill,
        scaleX: targetScaleX,
        duration: 220,
        ease: 'Back.easeOut'
      });
      this.progressPercentText.setText(`${data.progress}%`);
      this.targetFoodText.setText(`Dieta actual: ${this.getFoodLabel(data.targetFood)}`);
    });

    EventBus.on('evolution:transition', (data) => {
      const phaseInfo = PHASE_CONFIGURATIONS[data.newPhase];
      this.phaseText.setText(`Fase: ${phaseInfo.displayName}`);
      this.targetFoodText.setText(`Dieta actual: ${this.getFoodLabel(data.targetFood)}`);
      this.cameras.main.flash(350, 255, 255, 255);
      this.soundSystem.playEvolve();
      this.particleSystem.emitEvolutionParticles(this.player.x, this.player.y);
    });

    EventBus.on('evolution:completed', () => {
      this.phaseText.setText('¡Evolución Cúspide: Libélula!');
      this.showVictoryModal();
    });
  }

  private getFoodLabel(food: FoodType): string {
    switch (food) {
      case FoodType.FLY: return 'Mosca Pequeña (Fase 1)';
      case FoodType.FISH: return 'Pez Morado (Fase 2)';
      case FoodType.BIG_FLY: return 'Mosca Grande (Fase 3)';
      case FoodType.WASP: return 'Avispa Amarilla (Fase 4)';
    }
  }

  public override update(time: number, delta: number): void {
    // 1. Físicas condicionales por estrato: Agua (y > 1550) vs Tierra / Aire (y <= 1550)
    const inAquaticStratum = this.player.y > 1550 || this.physics.overlap(this.player, this.waterZone);
    if (inAquaticStratum !== this.player.isInWater) {
      this.player.setInWater(inAquaticStratum);
      this.soundSystem.playSplash();
      this.particleSystem.emitSplashParticles(this.player.x, 1550);
    }

    // 2. Renderizado dinámico de la ondulación del agua
    this.renderWaterSurface(time);

    // 3. Temporizador de Habilidad y actualización de HUD
    if (this.abilityCooldownTimer > 0) {
      this.abilityCooldownTimer = Math.max(0, this.abilityCooldownTimer - delta);
    }
    this.updateAbilityHUD();

    // 4. Mapeo de entradas unificado (Phaser Keys + DOM Raw Keys + Clic)
    let isLeft = (this.cursors && this.cursors.left.isDown) || (this.wasd && this.wasd.A.isDown) || this.rawKeys.left;
    let isRight = (this.cursors && this.cursors.right.isDown) || (this.wasd && this.wasd.D.isDown) || this.rawKeys.right;
    let isUp = (this.cursors && this.cursors.up.isDown) || (this.wasd && this.wasd.W.isDown) || this.rawKeys.up;
    let isDown = (this.cursors && this.cursors.down.isDown) || (this.wasd && this.wasd.S.isDown);
    let isJump = (this.cursors && this.cursors.up.isDown) || (this.wasd && this.wasd.SPACE.isDown) || (this.wasd && this.wasd.W.isDown) || this.rawKeys.jump;

    let leftJustDown = (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.left)) ||
                       (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.A)) ||
                       this.rawKeys.leftJustDown;

    let rightJustDown = (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.right)) ||
                        (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.D)) ||
                        this.rawKeys.rightJustDown;

    let jumpJustDown = (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) ||
                       (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.SPACE)) ||
                       (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.W)) ||
                       this.rawKeys.jumpJustDown;

    // Consumir pulsos raw
    this.rawKeys.leftJustDown = false;
    this.rawKeys.rightJustDown = false;
    this.rawKeys.jumpJustDown = false;

    // Interacción por Clic / Touch
    if (this.pointerTarget) {
      const dx = this.pointerTarget.x - this.player.x;
      const dy = this.pointerTarget.y - this.player.y;

      if (dy < -35) {
        jumpJustDown = true;
        isJump = true;
        if (Math.abs(dx) > 30) {
          if (dx > 0) isRight = true;
          else isLeft = true;
        }
      } else if (dx > 20) {
        isRight = true;
        rightJustDown = true;
      } else if (dx < -20) {
        isLeft = true;
        leftJustDown = true;
      }

      this.pointerTarget = null;
    }

    const inputState: PlayerInput = {
      left: isLeft,
      leftJustDown: leftJustDown,
      right: isRight,
      rightJustDown: rightJustDown,
      up: isUp,
      down: isDown,
      jump: isJump,
      jumpJustDown: jumpJustDown,
      action: false,
      actionJustDown: false
    };

    // 5. Actualizar al jugador y su FSM
    this.player.handleInput(inputState, delta);
    this.player.update(time, delta);

    // 6. Seguimiento suave vertical con cameraY
    const targetCameraY = Math.max(0, Math.min(WORLD_HEIGHT - this.scale.height, this.player.y - this.scale.height / 2));
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetCameraY, 0.08);
    this.cameras.main.scrollY = this.cameraY;
  }

  private renderWaterSurface(time: number): void {
    this.waterSurfaceGfx.clear();
    this.waterSurfaceGfx.lineStyle(3, 0x90e0ef, 0.9);

    this.waterSurfaceWavePhase = time * 0.0035;

    this.waterSurfaceGfx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += 15) {
      const y = 1550 + Math.sin(this.waterSurfaceWavePhase + x * 0.02) * 4;
      if (x === 0) {
        this.waterSurfaceGfx.moveTo(x, y);
      } else {
        this.waterSurfaceGfx.lineTo(x, y);
      }
    }
    this.waterSurfaceGfx.stroke();
  }
}
