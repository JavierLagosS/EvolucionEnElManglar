import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { EvolutionManager } from '../managers/EvolutionManager';
import { FoodManager } from '../managers/FoodManager';
import { PlayerInput, FoodType, EvolutionPhase } from '../core/types/GameTypes';
import { EventBus } from '../core/events/EventBus';
import { BaseFood } from '../entities/food/BaseFood';
import { PHASE_CONFIGURATIONS } from '../config/evolutionConfig';
import { PredatorFish, HunterFrog } from '../entities/predators/PredatorEntities';
import { BossKingfisher } from '../entities/boss/BossKingfisher';
import { BossGiantSquid } from '../entities/boss/BossGiantSquid';
import { CoronationCinematic } from '../cinematics/CoronationCinematic';
import { LiamIntroCinematic } from '../cinematics/LiamIntroCinematic';
import { SoundSystem } from '../core/audio/SoundSystem';
import { ParticleSystem } from '../core/particles/ParticleSystem';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 2400;

/**
 * Escena principal de "Evolución en el Manglar".
 * Integra nivel de manglar vertical por estratos, estética enriquecida estilo Kirby,
 * soporte de control universal (Teclado Phaser + DOM listeners + Clic/Touch), HUD dinámico,
 * minimapa / altímetro vertical de estratos en tiempo real,
 * soporte multinivel con depredadores y Jefe Final (Martín Pescador Gigante),
 * habilidades activas por fase (Shift / Clic derecho),
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

  // Jefes Finales (Nivel 2: Martín Pescador | Nivel 3: Calamar Gigante)
  public boss: BossKingfisher | null = null;
  public bossSquid: BossGiantSquid | null = null;
  public bossFightActive: boolean = false;
  private bossHealthContainer: Phaser.GameObjects.Container | null = null;
  private bossHealthBarFill!: Phaser.GameObjects.Rectangle;
  private bossHealthText!: Phaser.GameObjects.Text;
  private bossAlertBanner: Phaser.GameObjects.Container | null = null;

  // Estado del juego y cinemáticas
  public gameState: 'INTRO_CINEMATIC' | 'PLAYING' = 'INTRO_CINEMATIC';
  public liamIntroCinematic: LiamIntroCinematic | null = null;
  public isInputFrozen: boolean = false;
  public coronationCinematic: CoronationCinematic | null = null;

  // Estadísticas acumuladas de campaña
  public totalPreyEaten: number = 0;
  public sessionStartTime: number = Date.now();

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

  // Minimapa / Altímetro Vertical de Estratos
  private minimapStaticGfx!: Phaser.GameObjects.Graphics;
  private minimapDynamicGfx!: Phaser.GameObjects.Graphics;
  private readonly MINIMAP_X: number = 1280 - 28;
  private readonly MINIMAP_Y: number = 100;
  private readonly MINIMAP_W: number = 14;
  private readonly MINIMAP_H: number = 280;

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

    // 11. Capa de Presentación / HUD y Minimapa Vertical
    this.createHUD();
    this.createMinimap();
    this.bindDomainEvents();

    // 12. Cinemática de Intro estilo Kirby del Origen de la Tierra (Creado e inspirado por Liam)
    this.playLiamIntroCinematic();

    // Limpieza al cerrar escena
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.foodManager.destroy();
      if (this.liamIntroCinematic) {
        this.liamIntroCinematic.destroy();
        this.liamIntroCinematic = null;
      }
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

    // Overlap jugador vs presas de comida (con jerarquía trófica y margen generoso del 20%)
    this.physics.add.overlap(this.player, this.foodGroup, (_p, foodObj) => {
      const food = foodObj as unknown as BaseFood;
      if (!food || !food.isActive) return;
      this.collectFoodIfInRange(food);
    });

    // Overlap jugador vs depredadores patrullando en Nivel 2 y 3
    this.physics.add.overlap(this.player, this.predatorGroup, (_p, predObj) => {
      if (this.currentLevel === 2 || this.currentLevel === 3) {
        this.handleTrophicDamage(predObj as Phaser.GameObjects.GameObject);
      }
    });
  }

  /**
   * Recolección de presas con cálculo de distancia entre centros visuales
   * y margen generoso del 20% para que nunca falle cuando el sprite toca la presa.
   */
  public collectFoodIfInRange(food: BaseFood): boolean {
    if (!food || !food.isActive || this.isInputFrozen) return false;

    const playerCenter = this.player.visualCenter;
    const playerRadius = this.player.visualRadius;
    const foodCenter = food.visualCenter;
    const preyRadius = food.visualRadius;

    // Distancia euclidiana entre centros visuales de ambos sprites con margen del 20%
    const maxDistance = (playerRadius + preyRadius) * 1.2;
    const dist = Phaser.Math.Distance.Between(
      playerCenter.x,
      playerCenter.y,
      foodCenter.x,
      foodCenter.y
    );

    if (dist <= maxDistance) {
      if (this.currentLevel === 2 || this.currentLevel === 3) {
        const playerRank = this.getPlayerPhaseRank();
        const foodRank = this.getFoodRequiredPhase(food.type);

        if (foodRank > playerRank) {
          // Criatura de estrato superior: ataca al jugador
          this.handleTrophicDamage(food as unknown as Phaser.GameObjects.GameObject);
          return false;
        }
      }

      const foodX = food.x;
      const foodY = food.y;
      const foodType = food.type;
      const consumed = this.evolutionManager.feed(food);
      if (consumed) {
        this.totalPreyEaten++;
        this.soundSystem.playEat();
        this.particleSystem.emitEatParticles(foodX, foodY, foodType);
        return true;
      }
    }
    return false;
  }

  public checkFoodCollisions(): void {
    if (this.isInputFrozen) return;

    this.foodGroup.children.iterate((child) => {
      const food = child as unknown as BaseFood;
      if (food && food.isActive) {
        this.collectFoodIfInRange(food);
      }
      return null;
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

    // 2. Penalización de 15% de evolución (sin bajar de fase evolutiva)
    this.evolutionManager.penalizeProgress(15);
  }

  public getPlayerPhaseRank(): number {
    switch (this.evolutionManager.currentPhase) {
      case EvolutionPhase.MUSHROOM: return 1;
      case EvolutionPhase.TADPOLE: return 2;
      case EvolutionPhase.FROG: return 3;
      case EvolutionPhase.DRAGONFLY: return 4;
      case EvolutionPhase.SHARK: return 5;
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
    if (this.isInputFrozen || this.abilityCooldownTimer > 0) return false;
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
      case EvolutionPhase.SHARK:
        this.executeSharkTorpedousDash();
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
    this.player.startDash(350);
    this.player.setVelocity(dirX * 720, currentVy * 0.5);
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

    // Activar estado de embestida para combate con el Jefe
    this.player.startDash(380);
    this.player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
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

  // --- HABILIDAD 5: Embestida Hidrodinámica de Tiburón (Fase 5) ---
  private executeSharkTorpedousDash(): void {
    const targetX = this.input.activePointer.worldX || (this.player.x + this.player.facingDirection * 400);
    const targetY = this.input.activePointer.worldY || this.player.y;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
    const speed = 960;

    this.player.startDash(400);
    this.player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.player.triggerSquashAndStretch(1.5, 0.65, 180);

    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 30, () => {
        const ghost = this.add.sprite(this.player.x, this.player.y, 'player_shark');
        ghost.setDisplaySize(88, 70);
        ghost.setAlpha(0.6);
        ghost.setTint(0x48cae4);
        ghost.setFlipX(this.player.facingDirection === -1);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: ghost.scaleX * 1.3,
          scaleY: ghost.scaleY * 0.7,
          duration: 260,
          onComplete: () => ghost.destroy()
        });
      });
    }

    this.particleSystem.emitSplashParticles(this.player.x, this.player.y);
  }

  // ==========================================
  // JEFE FINAL (NIVEL 2: MARTÍN PESCADOR GIGANTE)
  // ==========================================

  public startBossFight(): void {
    if (this.bossFightActive || this.boss) return;
    this.bossFightActive = true;

    // 1. Sonido grave de alerta
    this.soundSystem.playBossAlert();

    // 2. Banner de alerta en pantalla
    this.showBossAlertBanner();

    // 3. Instanciar al Jefe Final en el Dosel Aéreo (y = 300)
    this.boss = new BossKingfisher(this, 640, 300);

    // 4. Barra de vida del Jefe en el HUD superior central
    this.createBossHealthBar();

    // 5. Registrar colisión y combate entre Jugador y Jefe
    this.physics.add.overlap(this.player, this.boss, () => {
      if (!this.bossFightActive || !this.boss || this.boss.hp <= 0) return;

      if (this.player.isDashing) {
        // Golpe exitoso de embestida supersónica
        if (!this.boss.isInvulnerable()) {
          const remainingHp = this.boss.takeDamage(1);
          this.soundSystem.playBossHit();
          this.particleSystem.emitBossHitParticles(this.boss.x, this.boss.y);
          this.updateBossHealthBar();

          if (remainingHp <= 0) {
            this.handleBossDefeated();
          }
        }
      } else {
        // Impacto del jefe sobre el jugador sin embestida
        this.handleTrophicDamage(this.boss as unknown as Phaser.GameObjects.GameObject);
      }
    });
  }

  private showBossAlertBanner(customTitle: string = '⚠️ ¡ALERTA: MARTÍN PESCADOR GIGANTE EN EL DOSEL! ⚠️'): void {
    if (this.bossAlertBanner) {
      this.bossAlertBanner.destroy();
    }

    const banner = this.add.container(640, 160).setScrollFactor(0).setDepth(800);
    this.bossAlertBanner = banner;

    const bg = this.add.graphics();
    bg.fillStyle(0x370617, 0.94);
    bg.fillRoundedRect(-330, -28, 660, 56, 14);
    bg.lineStyle(2.5, 0xff0054, 1);
    bg.strokeRoundedRect(-330, -28, 660, 56, 14);
    banner.add(bg);

    const text = this.add.text(0, 0, customTitle, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    banner.add(text);

    // Animación de entrada y desvanecimiento progresivo
    banner.setScale(0.7);
    banner.setAlpha(0);
    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(3200, () => {
          if (this.bossAlertBanner) {
            this.tweens.add({
              targets: this.bossAlertBanner,
              alpha: 0,
              y: 120,
              duration: 400,
              onComplete: () => {
                this.bossAlertBanner?.destroy();
                this.bossAlertBanner = null;
              }
            });
          }
        });
      }
    });
  }

  private createBossHealthBar(bossTitle: string = '👑 MARTÍN PESCADOR GIGANTE (JEFE)'): void {
    if (this.bossHealthContainer) {
      this.bossHealthContainer.destroy();
    }

    const container = this.add.container(640, 75).setScrollFactor(0).setDepth(650);
    this.bossHealthContainer = container;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0509, 0.9);
    bg.fillRoundedRect(-180, -18, 360, 48, 10);
    bg.lineStyle(2, 0xd90429, 0.9);
    bg.strokeRoundedRect(-180, -18, 360, 48, 10);
    container.add(bg);

    const title = this.add.text(0, -6, bossTitle, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(title);

    // Fondo barra
    const barBg = this.add.rectangle(0, 14, 300, 12, 0x370617).setOrigin(0.5);
    container.add(barBg);

    // Relleno barra
    this.bossHealthBarFill = this.add.rectangle(-150, 14, 300, 10, 0xd90429).setOrigin(0, 0.5);
    container.add(this.bossHealthBarFill);

    this.bossHealthText = this.add.text(0, 14, '5 / 5 HP', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(this.bossHealthText);

    // Entrada animada
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private updateBossHealthBar(): void {
    const activeBoss = this.bossSquid || this.boss;
    if (!activeBoss || !this.bossHealthBarFill || !this.bossHealthText) return;

    const ratio = Math.max(0, activeBoss.hp / activeBoss.maxHp);
    this.tweens.add({
      targets: this.bossHealthBarFill,
      scaleX: ratio,
      duration: 180,
      ease: 'Quad.easeOut'
    });
    this.bossHealthText.setText(`${activeBoss.hp} / ${activeBoss.maxHp} HP`);
  }

  public handleBossDefeated(): void {
    if (!this.boss) return;
    this.bossFightActive = false;

    // 1. SFX triunfal de victoria definitiva
    this.soundSystem.playBossDefeated();

    // 2. Gran explosión radial de partículas
    this.particleSystem.emitBossDefeatParticles(this.boss.x, this.boss.y);

    // 3. Ocultar barra de salud
    if (this.bossHealthContainer) {
      this.tweens.add({
        targets: this.bossHealthContainer,
        alpha: 0,
        scaleY: 0,
        duration: 300,
        onComplete: () => {
          this.bossHealthContainer?.destroy();
          this.bossHealthContainer = null;
        }
      });
    }

    // 4. Animación de derrota del jefe y destrucción
    this.tweens.add({
      targets: this.boss,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      angle: 360,
      duration: 650,
      onComplete: () => {
        this.boss?.destroy();
        this.boss = null;
        // Mostrar Modal de Victoria con acceso al Nivel 3
        this.showUltimateVictoryModal();
      }
    });
  }

  // ==========================================
  // JEFE FINAL (NIVEL 3: CALAMAR GIGANTE DEL ABISMO)
  // ==========================================

  public startSquidBossFight(): void {
    if (this.bossFightActive || this.bossSquid) return;
    this.bossFightActive = true;

    // 1. Sonido de alerta grave
    this.soundSystem.playBossAlert();

    // 2. Banner de alerta
    this.showBossAlertBanner('⚠️ ¡ALERTA: CALAMAR GIGANTE EN EL ABISMO ACUÁTICO! ⚠️');

    // 3. Instanciar al Jefe Calamar en el estrato acuático profundo (y = 2050)
    this.bossSquid = new BossGiantSquid(this, 640, 2050);

    // 4. Barra de vida del Jefe en el HUD superior
    this.createBossHealthBar('🦑 CALAMAR GIGANTE DEL ABISMO (JEFE)');

    // 5. Registrar colisión y combate entre Jugador y Calamar Gigante
    this.physics.add.overlap(this.player, this.bossSquid, () => {
      if (!this.bossFightActive || !this.bossSquid || this.bossSquid.hp <= 0) return;

      if (this.player.isDashing) {
        if (!this.bossSquid.isInvulnerable()) {
          const remainingHp = this.bossSquid.takeDamage(1);
          this.soundSystem.playBossHit();
          this.particleSystem.emitBossHitParticles(this.bossSquid.x, this.bossSquid.y);
          this.updateBossHealthBar();

          if (remainingHp <= 0) {
            this.handleSquidBossDefeated();
          }
        }
      } else {
        this.handleTrophicDamage(this.bossSquid as unknown as Phaser.GameObjects.GameObject);
      }
    });
  }

  public handleSquidBossDefeated(): void {
    if (!this.bossSquid) return;
    this.bossFightActive = false;
    this.isInputFrozen = true;
    this.player.setVelocity(0, 0);

    // SFX triunfal de arpegio extendido trilogía
    this.soundSystem.playTrilogyEnding();

    // Emisión de partículas de derrota
    this.particleSystem.emitBossDefeatParticles(this.bossSquid.x, this.bossSquid.y);

    if (this.bossHealthContainer) {
      this.tweens.add({
        targets: this.bossHealthContainer,
        alpha: 0,
        scaleY: 0,
        duration: 300,
        onComplete: () => {
          this.bossHealthContainer?.destroy();
          this.bossHealthContainer = null;
        }
      });
    }

    this.tweens.add({
      targets: this.bossSquid,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      angle: 360,
      duration: 650,
      onComplete: () => {
        this.bossSquid?.destroy();
        this.bossSquid = null;
        this.triggerCoronationVictory();
      }
    });
  }

  /**
   * Muestra u oculta la interfaz de HUD completa para cinemáticas.
   */
  public setHUDVisible(visible: boolean): void {
    if (this.minimapStaticGfx) this.minimapStaticGfx.setVisible(visible);
    if (this.minimapDynamicGfx) this.minimapDynamicGfx.setVisible(visible);
    if (this.phaseText) this.phaseText.setVisible(visible);
    if (this.targetFoodText) this.targetFoodText.setVisible(visible);
    if (this.progressBarFill) this.progressBarFill.setVisible(visible);
    if (this.progressPercentText) this.progressPercentText.setVisible(visible);
    if (this.levelText) this.levelText.setVisible(visible);
    if (this.levelBadgeBg) this.levelBadgeBg.setVisible(visible);
    if (this.abilityText) this.abilityText.setVisible(visible);
    if (this.abilityBarFill) this.abilityBarFill.setVisible(visible);
    if (this.abilityBadgeBg) this.abilityBadgeBg.setVisible(visible);
  }

  /**
   * Detona la cinemática e ilustración interactiva de coronación final.
   */
  public triggerCoronationVictory(): void {
    this.isInputFrozen = true;
    this.player?.setVelocity(0, 0);
    this.soundSystem.playTrilogyEnding();

    // Ocultar HUD durante la ilustración de coronación
    this.setHUDVisible(false);

    if (this.bossHealthContainer) {
      this.bossHealthContainer.destroy();
      this.bossHealthContainer = null;
    }
    if (this.bossAlertBanner) {
      this.bossAlertBanner.destroy();
      this.bossAlertBanner = null;
    }
    if (this.victoryModal) {
      this.victoryModal.destroy();
      this.victoryModal = null;
    }

    const gameContainer = document.getElementById('game-container') || document.body;
    const playTimeMs = Date.now() - this.sessionStartTime;

    this.coronationCinematic = CoronationCinematic.start({
      container: gameContainer,
      totalPlayTimeMs: playTimeMs,
      totalPreyEaten: this.totalPreyEaten,
      onRestart: () => {
        this.isInputFrozen = false;
        this.startLevel(1);
      }
    });
  }

  public showUltimateVictoryModal(): void {
    if (this.victoryModal) {
      this.victoryModal.destroy();
    }

    const modal = this.add.container(640, 360).setScrollFactor(0).setDepth(1000);
    this.victoryModal = modal;

    // Overlay oscuro
    const overlay = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.75);
    overlay.setInteractive();
    modal.add(overlay);

    // Marco épico de victoria
    const box = this.add.graphics();
    box.fillStyle(0x0a1c13, 0.96);
    box.fillRoundedRect(-310, -215, 620, 430, 20);
    box.lineStyle(4, 0xffd166, 1);
    box.strokeRoundedRect(-310, -215, 620, 430, 20);
    modal.add(box);

    const title = this.add.text(0, -155, '👑 ¡DEPREDADOR ALFA DERROTADO! 👑', {
      fontFamily: 'sans-serif',
      fontSize: '23px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modal.add(title);

    const subtitle = this.add.text(0, -90, '¡Has derrotado al temible Martín Pescador Gigante en el Dosel Aéreo!\nEl cielo está despejado, pero las profundidades abisales reclaman tu presencia...', {
      fontFamily: 'sans-serif',
      fontSize: '14.5px',
      color: '#d8f3dc',
      align: 'center',
      lineSpacing: 7
    }).setOrigin(0.5);
    modal.add(subtitle);

    // Botón destacado: Avanzar al Nivel 3 (Abismo Marino)
    const btnWidth = 380;
    const btnHeight = 48;
    const btnNivel3Bg = this.add.graphics();
    btnNivel3Bg.fillStyle(0x003049, 1);
    btnNivel3Bg.fillRoundedRect(-btnWidth / 2, -22, btnWidth, btnHeight, 12);
    btnNivel3Bg.lineStyle(2.5, 0x48cae4, 1);
    btnNivel3Bg.strokeRoundedRect(-btnWidth / 2, -22, btnWidth, btnHeight, 12);
    modal.add(btnNivel3Bg);

    const btnNivel3Text = this.add.text(0, 2, '🌊 Avanzar al Nivel 3: Abismo Marino', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modal.add(btnNivel3Text);

    const btnN3Hit = this.add.zone(0, 2, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
    btnN3Hit.on('pointerdown', () => {
      this.startLevel(3);
    });
    modal.add(btnN3Hit);

    // Botón secundario: Reiniciar Nivel 2
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1b4332, 1);
    btnBg.fillRoundedRect(-btnWidth / 2, 45, btnWidth, btnHeight, 12);
    btnBg.lineStyle(2, 0x52b788, 1);
    btnBg.strokeRoundedRect(-btnWidth / 2, 45, btnWidth, btnHeight, 12);
    modal.add(btnBg);

    const btnText = this.add.text(0, 69, '🔄 Volver a Desafiar el Nivel 2', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modal.add(btnText);

    const btnHit = this.add.zone(0, 69, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
    btnHit.on('pointerdown', () => {
      this.startLevel(2);
    });
    modal.add(btnHit);

    // Botón terciario: Volver a Nivel 1
    const btnSec = this.add.text(0, 140, '🌱 Explorar Nivel 1 (Pacífico)', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#95d5b2'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btnSec.on('pointerdown', () => {
      this.startLevel(1);
    });
    modal.add(btnSec);

    modal.setScale(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.easeOut'
    });
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

  /**
   * Crea un botón en el HUD para volver a ver la historia de Liam cuando se desee.
   */
  private createLiamStoryHUDButton(): void {
    const bg = this.add.graphics().setScrollFactor(0);
    bg.fillStyle(0x0a1f14, 0.9);
    bg.fillRoundedRect(495, 62, 195, 32, 10);
    bg.lineStyle(2, 0xffd166, 0.85);
    bg.strokeRoundedRect(495, 62, 195, 32, 10);

    const btnText = this.add.text(505, 70, '🎬 Historia de Liam', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffd166',
      fontStyle: 'bold'
    }).setScrollFactor(0);

    btnText.setInteractive({ useHandCursor: true });
    btnText.on('pointerdown', () => {
      this.playLiamIntroCinematic();
    });
    btnText.on('pointerover', () => {
      btnText.setColor('#ffffff');
      bg.clear();
      bg.fillStyle(0x133825, 0.95);
      bg.fillRoundedRect(495, 62, 195, 32, 10);
      bg.lineStyle(2.5, 0xffe66d, 1);
      bg.strokeRoundedRect(495, 62, 195, 32, 10);
    });
    btnText.on('pointerout', () => {
      btnText.setColor('#ffd166');
      bg.clear();
      bg.fillStyle(0x0a1f14, 0.9);
      bg.fillRoundedRect(495, 62, 195, 32, 10);
      bg.lineStyle(2, 0xffd166, 0.85);
      bg.strokeRoundedRect(495, 62, 195, 32, 10);
    });
  }

  /**
   * Inicia la cinemática animada estilo Kirby del origen de la Tierra dedicada a Liam.
   */
  public playLiamIntroCinematic(): void {
    if (this.liamIntroCinematic) {
      this.liamIntroCinematic.destroy();
      this.liamIntroCinematic = null;
    }

    this.gameState = 'INTRO_CINEMATIC';
    this.isInputFrozen = true;

    const gameContainer = this.game.canvas.parentElement || document.body;

    this.liamIntroCinematic = LiamIntroCinematic.start({
      container: gameContainer,
      onStartGame: () => {
        this.isInputFrozen = false;
        this.gameState = 'PLAYING';
        this.liamIntroCinematic = null;
        this.soundSystem.resume();
        this.soundSystem.playGameStart();
      }
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

    // Botón especial en el HUD: 🎬 Historia de Liam
    this.createLiamStoryHUDButton();

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

  /**
   * Crea el minimapa / altímetro vertical de estratos (2400px escalados a 280px) en el HUD derecho.
   */
  private createMinimap(): void {
    this.minimapStaticGfx = this.add.graphics().setScrollFactor(0).setDepth(500);
    this.minimapDynamicGfx = this.add.graphics().setScrollFactor(0).setDepth(501);

    const x = this.MINIMAP_X;
    const y = this.MINIMAP_Y;
    const w = this.MINIMAP_W;
    const h = this.MINIMAP_H;

    // Fondo y marco del altímetro
    this.minimapStaticGfx.fillStyle(0x05140d, 0.88);
    this.minimapStaticGfx.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 8);
    this.minimapStaticGfx.lineStyle(2, 0x52b788, 0.85);
    this.minimapStaticGfx.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, 8);

    // Estrato 1: Dosel Aéreo (0 a 800) - Celeste / verde claro traslúcido
    const h1 = (800 / WORLD_HEIGHT) * h;
    this.minimapStaticGfx.fillStyle(0x74c69d, 0.65);
    this.minimapStaticGfx.fillRect(x, y, w, h1);

    // Estrato 2: Suelo del Manglar (800 a 1550) - Verde esmeralda / marrón traslúcido
    const h2 = ((1550 - 800) / WORLD_HEIGHT) * h;
    this.minimapStaticGfx.fillStyle(0x2d6a4f, 0.7);
    this.minimapStaticGfx.fillRect(x, y + h1, w, h2);

    // Estrato 3: Mundo Acuático (1550 a 2400) - Azul profundo traslúcido
    const h3 = ((2400 - 1550) / WORLD_HEIGHT) * h;
    this.minimapStaticGfx.fillStyle(0x0077b6, 0.75);
    this.minimapStaticGfx.fillRect(x, y + h1 + h2, w, h3);

    // Separadores de estratos sutiles
    this.minimapStaticGfx.lineStyle(1.2, 0xd8f3dc, 0.6);
    this.minimapStaticGfx.lineBetween(x - 3, y + h1, x + w + 3, y + h1);
    this.minimapStaticGfx.lineBetween(x - 3, y + h1 + h2, x + w + 3, y + h1 + h2);

    // Etiquetas sutiles de referencia
    const labelStyle = { fontFamily: 'sans-serif', fontSize: '10px', color: '#95d5b2' };
    this.add.text(x - 32, y + 36, 'Dosel', labelStyle).setScrollFactor(0).setDepth(500);
    this.add.text(x - 32, y + h1 + 36, 'Suelo', labelStyle).setScrollFactor(0).setDepth(500);
    this.add.text(x - 30, y + h1 + h2 + 40, 'Agua', labelStyle).setScrollFactor(0).setDepth(500);
  }

  /**
   * Actualiza los marcadores en tiempo real dentro del altímetro (Jugador + Depredadores/Jefe).
   */
  private updateMinimap(): void {
    if (!this.minimapDynamicGfx || !this.player) return;
    this.minimapDynamicGfx.clear();

    const x = this.MINIMAP_X;
    const y = this.MINIMAP_Y;
    const w = this.MINIMAP_W;
    const h = this.MINIMAP_H;

    // En Nivel 2 y 3: Puntos rojos/púrpura para depredadores y Jefes Finales
    if (this.currentLevel === 2 || this.currentLevel === 3) {
      this.predatorGroup.children.iterate((child) => {
        const pred = child as any;
        if (pred && pred.active) {
          const ratio = Phaser.Math.Clamp(pred.y / WORLD_HEIGHT, 0, 1);
          const dotY = y + ratio * h;
          this.minimapDynamicGfx.fillStyle(0xef233c, 0.95);
          this.minimapDynamicGfx.fillCircle(x + w / 2, dotY, 3.5);
          this.minimapDynamicGfx.lineStyle(1, 0xffffff, 0.85);
          this.minimapDynamicGfx.strokeCircle(x + w / 2, dotY, 3.5);
        }
        return null;
      });

      if (this.boss && this.boss.active) {
        const ratio = Phaser.Math.Clamp(this.boss.y / WORLD_HEIGHT, 0, 1);
        const dotY = y + ratio * h;
        this.minimapDynamicGfx.fillStyle(0xff0054, 1);
        this.minimapDynamicGfx.fillCircle(x + w / 2, dotY, 4.5);
        this.minimapDynamicGfx.lineStyle(1.5, 0xffd166, 1);
        this.minimapDynamicGfx.strokeCircle(x + w / 2, dotY, 4.5);
      }

      if (this.bossSquid && this.bossSquid.active) {
        const ratio = Phaser.Math.Clamp(this.bossSquid.y / WORLD_HEIGHT, 0, 1);
        const dotY = y + ratio * h;
        this.minimapDynamicGfx.fillStyle(0x7209b7, 1);
        this.minimapDynamicGfx.fillCircle(x + w / 2, dotY, 4.5);
        this.minimapDynamicGfx.lineStyle(1.5, 0x4cc9f0, 1);
        this.minimapDynamicGfx.strokeCircle(x + w / 2, dotY, 4.5);
      }
    }

    // Marcador brillante en tiempo real del jugador (punto blanco/amarillo con borde)
    const playerRatio = Phaser.Math.Clamp(this.player.y / WORLD_HEIGHT, 0, 1);
    const markerY = y + playerRatio * h;
    const markerX = x + w / 2;

    this.minimapDynamicGfx.fillStyle(0xffd166, 0.4);
    this.minimapDynamicGfx.fillCircle(markerX, markerY, 7);
    this.minimapDynamicGfx.fillStyle(0xffd166, 1);
    this.minimapDynamicGfx.fillCircle(markerX, markerY, 4.5);
    this.minimapDynamicGfx.fillStyle(0xffffff, 1);
    this.minimapDynamicGfx.fillCircle(markerX, markerY, 2.5);
    this.minimapDynamicGfx.lineStyle(1.5, 0x05140d, 0.9);
    this.minimapDynamicGfx.strokeCircle(markerX, markerY, 4.5);
  }

  public startLevel(level: number): void {
    this.currentLevel = level;
    this.setHUDVisible(true);
    this.updateLevelHUD();

    if (this.victoryModal) {
      this.victoryModal.destroy();
      this.victoryModal = null;
    }

    if (this.coronationCinematic) {
      this.coronationCinematic.destroy();
      this.coronationCinematic = null;
    }
    this.isInputFrozen = false;

    // Limpieza de Jefes Finales si existían
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }
    if (this.bossSquid) {
      this.bossSquid.destroy();
      this.bossSquid = null;
    }
    this.bossFightActive = false;
    if (this.bossHealthContainer) {
      this.bossHealthContainer.destroy();
      this.bossHealthContainer = null;
    }
    if (this.bossAlertBanner) {
      this.bossAlertBanner.destroy();
      this.bossAlertBanner = null;
    }

    // Reiniciar al jugador a Fase 1 (Hongo del Manglar en y = 1450, evolución 0%)
    this.evolutionManager.setLevel(level);
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

    // En Nivel 2 y 3, activar depredadores patrullando
    if (level === 2 || level === 3) {
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
    let bgColor = 0x05140d;
    let strokeColor = 0x52b788;
    let textColor = '#95d5b2';
    let text = '🌱 Nivel: 1 (Exploración)';

    if (this.currentLevel === 2) {
      bgColor = 0x2b0909;
      strokeColor = 0xe63946;
      textColor = '#ff758f';
      text = '⚠️ Nivel: 2 (Manglar Hostil)';
    } else if (this.currentLevel === 3) {
      bgColor = 0x051026;
      strokeColor = 0x4cc9f0;
      textColor = '#4cc9f0';
      text = '🌊 Nivel: 3 (Abismo Marino)';
    }

    this.levelBadgeBg.fillStyle(bgColor, 0.88);
    this.levelBadgeBg.fillRoundedRect(480, 18, 235, 36, 10);
    this.levelBadgeBg.lineStyle(2, strokeColor, 0.9);
    this.levelBadgeBg.strokeRoundedRect(480, 18, 235, 36, 10);

    this.levelText.setColor(textColor);
    this.levelText.setText(text);
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
      const phaseRank = this.getPlayerPhaseRank();
      this.phaseText.setText(`Fase ${phaseRank}: ${phaseInfo.displayName}`);
      this.targetFoodText.setText(`Dieta actual: ${this.getFoodLabel(data.targetFood)}`);
      this.cameras.main.flash(350, 255, 255, 255);
      this.soundSystem.playEvolve();
      this.particleSystem.emitEvolutionParticles(this.player.x, this.player.y);
    });

    EventBus.on('evolution:completed', () => {
      const phaseName = this.evolutionManager.currentPhase === EvolutionPhase.SHARK
        ? 'Tiburón Soberano'
        : 'Libélula Depredadora';
      this.phaseText.setText(`🌟 ¡Evolución Cúspide: ${phaseName}!`);
      if (this.currentLevel === 1) {
        // En Nivel 1: Victoria directa con opción a Nivel 2
        this.showVictoryModal();
      } else if (this.currentLevel === 2) {
        // En Nivel 2: Iniciar enfrentamiento con el Jefe Final en el Dosel
        if (!this.bossFightActive && !this.boss) {
          this.startBossFight();
        }
      } else if (this.currentLevel === 3) {
        // En Nivel 3: Iniciar enfrentamiento con el Calamar Gigante en el Abismo
        if (!this.bossFightActive && !this.bossSquid) {
          this.startSquidBossFight();
        }
      }
    });
  }

  private getFoodLabel(food: FoodType): string {
    switch (food) {
      case FoodType.FLY: return 'Mosca Pequeña (Fase 1)';
      case FoodType.FISH: return 'Pez del Manglar (Fase 2 / 5)';
      case FoodType.BIG_FLY: return 'Mosca Grande (Fase 3)';
      case FoodType.WASP: return 'Avispa Amarilla (Fase 4)';
    }
  }

  public override update(time: number, delta: number): void {
    // 0. Si está en la cinemática de Liam o el input está congelado
    if (this.gameState === 'INTRO_CINEMATIC' || this.isInputFrozen) {
      this.player.handleInput({
        left: false,
        leftJustDown: false,
        right: false,
        rightJustDown: false,
        up: false,
        down: false,
        jump: false,
        jumpJustDown: false,
        action: false,
        actionJustDown: false
      }, delta);
      this.player.setVelocity(0, 0);
      return;
    }

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

    // Detección generosa de colisión con presas basada en distancia entre centros visuales (+20%)
    this.checkFoodCollisions();

    // 6. Actualizar al Jefe Final si está activo
    if (this.boss && this.bossFightActive) {
      this.boss.updateBoss(delta, this.player.x, this.player.y);
    }
    if (this.bossSquid && this.bossFightActive) {
      this.bossSquid.updateBoss(delta, this.player.x, this.player.y);
    }

    // 7. Seguimiento suave vertical con cameraY
    const targetCameraY = Math.max(0, Math.min(WORLD_HEIGHT - this.scale.height, this.player.y - this.scale.height / 2));
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetCameraY, 0.08);
    this.cameras.main.scrollY = this.cameraY;

    // 8. Actualizar Minimapa / Altímetro de estratos en tiempo real
    this.updateMinimap();
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
