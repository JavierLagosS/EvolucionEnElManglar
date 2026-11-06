import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { EvolutionManager } from '../managers/EvolutionManager';
import { FoodManager } from '../managers/FoodManager';
import { PlayerInput, FoodType } from '../core/types/GameTypes';
import { EventBus } from '../core/events/EventBus';
import { BaseFood } from '../entities/food/BaseFood';
import { PHASE_CONFIGURATIONS } from '../config/evolutionConfig';

/**
 * Escena principal de "Evolución en el Manglar".
 * Integra nivel de manglar accesible, estética enriquecida estilo Kirby,
 * soporte de control universal (Teclado Phaser + DOM listeners + Clic/Touch) y HUD dinámico.
 */
export class GameScene extends Phaser.Scene {
  public player!: Player;
  public evolutionManager!: EvolutionManager;
  public foodManager!: FoodManager;
  public platforms!: Phaser.Physics.Arcade.StaticGroup;
  public foodGroup!: Phaser.GameObjects.Group;
  public waterZone!: Phaser.GameObjects.Zone;

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
    // 1. Fondos vibrantes e iluminación atmosférica
    this.createAtmosphericBackground();

    // 2. Partículas flotantes de polen y luciérnagas
    this.createFloatingFireflies();

    // 3. Plataformas escalonadas y suelo
    this.createPlatforms();

    // 4. Zona y Estanque Acuático
    this.createWaterBasin();

    // 5. Instanciar Jugador
    this.player = new Player(this, 100, 630);

    // 6. Configurar Entrada
    this.setupInput();

    // 7. Máquina y Gestor de Dominio
    this.evolutionManager = new EvolutionManager(this.player.getStateMachine());

    // 8. Grupo de presas y Spawner Dinámico Continuo
    this.foodGroup = this.add.group({ runChildUpdate: true });
    this.foodManager = new FoodManager(this, this.evolutionManager, this.foodGroup);

    // 9. REGISTRAR TODAS LAS FÍSICAS Y COLISIONES (con todos los objetos ya instanciados)
    this.setupPhysicsCollisions();

    // 10. Capa de Presentación / HUD
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
      this.player.setInWater(true);
    });

    // Overlap jugador vs presas de comida
    this.physics.add.overlap(this.player, this.foodGroup, (_p, foodObj) => {
      const food = foodObj as unknown as BaseFood;
      if (food && food.isActive) {
        this.evolutionManager.feed(food);
      }
    });
  }

  private createAtmosphericBackground(): void {
    const bgGfx = this.add.graphics();

    bgGfx.fillGradientStyle(0x06201b, 0x0a2f26, 0x144534, 0x1d5e46, 1);
    bgGfx.fillRect(0, 0, 1280, 720);

    // Siluetas lejanas con niebla
    bgGfx.fillStyle(0x0e362b, 0.45);
    for (let i = 0; i < 7; i++) {
      const x = i * 210 + 30;
      bgGfx.fillRect(x, 260, 40, 460);
      bgGfx.fillCircle(x + 20, 240, 90);
      bgGfx.fillCircle(x - 20, 260, 70);
      bgGfx.fillCircle(x + 60, 260, 75);
    }

    // Raíces zancudas entrelazadas
    bgGfx.fillStyle(0x08251e, 0.7);
    for (let i = 0; i < 9; i++) {
      const rx = i * 150 + 20;
      bgGfx.beginPath();
      bgGfx.moveTo(rx, 420);
      bgGfx.lineTo(rx - 35, 720);
      bgGfx.lineTo(rx - 15, 720);
      bgGfx.lineTo(rx + 25, 420);
      bgGfx.closePath();
      bgGfx.fill();

      bgGfx.beginPath();
      bgGfx.moveTo(rx + 25, 420);
      bgGfx.lineTo(rx + 60, 720);
      bgGfx.lineTo(rx + 40, 720);
      bgGfx.lineTo(rx, 420);
      bgGfx.closePath();
      bgGfx.fill();
    }

    // Haz de luz solar que penetra el dosel
    const sunbeam = this.add.graphics();
    sunbeam.fillStyle(0xfefae0, 0.06);
    sunbeam.beginPath();
    sunbeam.moveTo(350, 0);
    sunbeam.lineTo(550, 0);
    sunbeam.lineTo(750, 720);
    sunbeam.lineTo(450, 720);
    sunbeam.closePath();
    sunbeam.fill();
  }

  private createFloatingFireflies(): void {
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(40, 1240);
      const y = Phaser.Math.Between(100, 680);
      const particle = this.add.image(x, y, 'firefly_particle');
      particle.setAlpha(Phaser.Math.FloatBetween(0.25, 0.8));
      particle.setScale(Phaser.Math.FloatBetween(0.6, 1.2));

      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(40, 100),
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

    // Suelo continuo de raíces
    for (let x = 80; x <= 1280; x += 160) {
      this.platforms.create(x, 704, 'mangrove_platform');
    }

    // Escalones de ascenso accesibles
    this.platforms.create(250, 610, 'mangrove_platform');
    this.platforms.create(400, 520, 'mangrove_platform');
    this.platforms.create(550, 430, 'mangrove_platform');
    this.platforms.create(720, 350, 'mangrove_platform');
    this.platforms.create(920, 270, 'mangrove_platform');
    this.platforms.create(1110, 430, 'mangrove_platform');
  }

  private createWaterBasin(): void {
    this.waterZone = this.add.zone(630, 625, 380, 150);
    this.physics.world.enable(this.waterZone, Phaser.Physics.Arcade.STATIC_BODY);

    const waterDeepGfx = this.add.graphics();
    waterDeepGfx.fillStyle(0x0077b6, 0.45);
    waterDeepGfx.fillRoundedRect(440, 550, 380, 150, { tl: 14, tr: 14, bl: 0, br: 0 });

    this.waterSurfaceGfx = this.add.graphics();

    for (let i = 0; i < 8; i++) {
      const bx = Phaser.Math.Between(460, 800);
      const by = Phaser.Math.Between(590, 680);
      const bubble = this.add.image(bx, by, 'bubble_particle');
      bubble.setScale(Phaser.Math.FloatBetween(0.6, 1.2));
      bubble.setAlpha(0.6);

      this.tweens.add({
        targets: bubble,
        y: 555,
        alpha: { from: 0.6, to: 0.1 },
        duration: Phaser.Math.Between(1800, 3200),
        repeat: -1,
        ease: 'Quad.easeIn',
        onRepeat: () => {
          bubble.x = Phaser.Math.Between(460, 800);
          bubble.y = Phaser.Math.Between(640, 680);
        }
      });
    }
  }

  private setupInput(): void {
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

    // Respaldo global por DOM
    window.addEventListener('keydown', (e) => {
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
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.rawKeys.left = false;
      if (k === 'arrowright' || k === 'd') this.rawKeys.right = false;
      if (k === 'arrowup' || k === 'w' || k === ' ' || e.code === 'Space') this.rawKeys.jump = false;
    });

    // Soporte para Clic de Ratón y Pantalla Táctil
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerTarget = { x: pointer.x, y: pointer.y };
    });
  }

  private createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x05140d, 0.88);
    hudBg.fillRoundedRect(18, 18, 440, 114, 14);
    hudBg.lineStyle(2.5, 0x52b788, 0.9);
    hudBg.strokeRoundedRect(18, 18, 440, 114, 14);

    const titleStyle = { fontFamily: 'sans-serif', fontSize: '18px', color: '#95d5b2', fontStyle: 'bold' };
    const labelStyle = { fontFamily: 'sans-serif', fontSize: '14px', color: '#d8f3dc' };

    this.phaseText = this.add.text(34, 28, 'Fase 1: Hongo del Manglar', titleStyle);
    this.targetFoodText = this.add.text(34, 56, 'Dieta actual: Mosca Pequeña', labelStyle);

    this.add.text(34, 82, 'Evolución:', labelStyle);
    this.add.rectangle(116, 92, 250, 18, 0x1b4332).setOrigin(0, 0.5);
    this.progressBarFill = this.add.rectangle(116, 92, 248, 14, 0x52b788).setOrigin(0, 0.5);
    this.progressBarFill.setScale(0, 1);
    this.progressPercentText = this.add.text(376, 83, '0%', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });

    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x05140d, 0.75);
    hintBg.fillRoundedRect(880, 16, 380, 42, 8);
    this.add.text(895, 27, '🎮 Controles: Flechas / WASD / Clic | Salto: Espacio o W', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#b7e4c7'
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
    });

    EventBus.on('evolution:completed', () => {
      this.phaseText.setText('¡Evolución Cúspide: Libélula!');
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
    // 1. Detectar si sigue dentro del agua
    const isOverlappingWater = this.physics.overlap(this.player, this.waterZone);
    if (!isOverlappingWater && this.player.isInWater) {
      this.player.setInWater(false);
    }

    // 2. Renderizado dinámico de la ondulación del agua
    this.renderWaterSurface(time);

    // 3. Mapeo de entradas unificado (Phaser Keys + DOM Raw Keys + Clic)
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

    // 4. Actualizar al jugador y su FSM
    this.player.handleInput(inputState, delta);
    this.player.update(time, delta);
  }

  private renderWaterSurface(time: number): void {
    this.waterSurfaceGfx.clear();
    this.waterSurfaceGfx.lineStyle(2.5, 0x90e0ef, 0.85);

    this.waterSurfaceWavePhase = time * 0.004;

    this.waterSurfaceGfx.beginPath();
    for (let x = 440; x <= 820; x += 10) {
      const y = 550 + Math.sin(this.waterSurfaceWavePhase + x * 0.03) * 3.5;
      if (x === 440) {
        this.waterSurfaceGfx.moveTo(x, y);
      } else {
        this.waterSurfaceGfx.lineTo(x, y);
      }
    }
    this.waterSurfaceGfx.stroke();
  }
}
