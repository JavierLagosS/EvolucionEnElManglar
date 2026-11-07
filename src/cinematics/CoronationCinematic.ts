/**
 * Cinemática interactiva de coronación final para "Evolución en el Manglar".
 * Renderizada directamente en Canvas 2D a 60 FPS.
 * 
 * Reúne a los dos reyes del ecosistema:
 * - Estrato Superior (Cielo): Libélula coronando los cielos con alas irisadas y luciérnagas.
 * - Estrato Inferior (Abismo): Tiburón dominando el abismo marino con aleta dorsal y cáusticas.
 * 
 * Incluye:
 * - Fundido suave (fade-to-black con rgba(10, 25, 30, alpha)) durante 1.5s.
 * - Animación orgánica con Math.sin(Date.now() * 0.002).
 * - Partículas de chispas doradas arriba y burbujas translúcidas abajo.
 * - Corona de esporas brillante sobre ambas criaturas.
 * - Botones interactivos con reinicio limpio de campaña y estadísticas finales completas.
 */

export interface CoronationOptions {
  container: HTMLElement;
  totalPlayTimeMs: number;
  totalPreyEaten: number;
  onRestart: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
  type: 'spark' | 'bubble';
  phase: number;
}

export class CoronationCinematic {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private startTime: number = 0;
  private isDestroyed: boolean = false;

  private totalPlayTimeMs: number;
  private totalPreyEaten: number;
  private onRestartCallback: () => void;

  // Estado de transición
  private readonly FADE_DURATION_MS: number = 1500;
  private fadeAlpha: number = 0;
  private sceneAlpha: number = 0;

  // Partículas
  private particles: Particle[] = [];

  // Interacción
  private isHoverRestart: boolean = false;
  private isHoverStats: boolean = false;
  private isHoverCloseStats: boolean = false;
  private showStatsModal: boolean = false;

  // Botones (Coordenadas lógicas 1280x720)
  private readonly btnRestart = { x: 340, y: 642, w: 280, h: 48 };
  private readonly btnStats = { x: 660, y: 642, w: 280, h: 48 };
  private readonly btnCloseStats = { x: 540, y: 520, w: 200, h: 40 };

  constructor(options: CoronationOptions) {
    this.container = options.container;
    this.totalPlayTimeMs = options.totalPlayTimeMs;
    this.totalPreyEaten = options.totalPreyEaten;
    this.onRestartCallback = options.onRestart;

    // Crear overlay de Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'coronation-canvas';
    this.canvas.width = 1280;
    this.canvas.height = 720;

    // Posicionamiento absoluto sobre el juego
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.cursor = 'default';

    // Ajustar si el canvas de Phaser tiene posición específica
    const phaserCanvas = this.container.querySelector('canvas');
    if (phaserCanvas) {
      const rect = phaserCanvas.getBoundingClientRect();
      const parentRect = this.container.getBoundingClientRect();
      this.canvas.style.top = `${rect.top - parentRect.top}px`;
      this.canvas.style.left = `${rect.left - parentRect.left}px`;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    }

    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);

    this.initParticles();
    this.setupEventListeners();
  }

  public static start(options: CoronationOptions): CoronationCinematic {
    const cinematic = new CoronationCinematic(options);
    cinematic.run();
    return cinematic;
  }

  private initParticles(): void {
    // 35 Chispas doradas para el cielo (y: 30 a 340)
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: 40 + Math.random() * 310,
        size: 1.5 + Math.random() * 2.5,
        speedY: -(0.3 + Math.random() * 0.7),
        speedX: (Math.random() - 0.5) * 0.4,
        alpha: 0.3 + Math.random() * 0.7,
        type: 'spark',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 40 Burbujas translúcidas para el abismo (y: 380 a 700)
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: 380 + Math.random() * 320,
        size: 2.5 + Math.random() * 5.5,
        speedY: -(0.5 + Math.random() * 1.1),
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: 0.25 + Math.random() * 0.55,
        type: 'bubble',
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = this.getLogicalCoords(e);

      if (this.showStatsModal) {
        this.isHoverCloseStats = this.isInside(pos.x, pos.y, this.btnCloseStats);
        this.isHoverRestart = false;
        this.isHoverStats = false;
        this.canvas.style.cursor = this.isHoverCloseStats ? 'pointer' : 'default';
      } else {
        this.isHoverRestart = this.isInside(pos.x, pos.y, this.btnRestart);
        this.isHoverStats = this.isInside(pos.x, pos.y, this.btnStats);
        this.canvas.style.cursor = (this.isHoverRestart || this.isHoverStats) ? 'pointer' : 'default';
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const pos = this.getLogicalCoords(e);

      if (this.showStatsModal) {
        if (this.isInside(pos.x, pos.y, this.btnCloseStats)) {
          this.showStatsModal = false;
        }
        return;
      }

      if (this.isInside(pos.x, pos.y, this.btnRestart)) {
        this.destroy();
        this.onRestartCallback();
      } else if (this.isInside(pos.x, pos.y, this.btnStats)) {
        this.showStatsModal = true;
      }
    });
  }

  private getLogicalCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private isInside(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  public run(): void {
    this.startTime = performance.now();
    const loop = (currentTime: number) => {
      if (this.isDestroyed) return;
      this.updateAndRender(currentTime);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateAndRender(now: number): void {
    const elapsed = now - this.startTime;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, 1280, 720);

    // Base sólida 100% opaca que cubre completamente el juego inferior
    ctx.fillStyle = '#0a191e';
    ctx.fillRect(0, 0, 1280, 720);

    // 1. Manejo de fases de transición
    if (elapsed < this.FADE_DURATION_MS) {
      // Fase 1: Fundido suave con rgba(10, 25, 30, alpha)
      const ratio = Math.min(1, elapsed / this.FADE_DURATION_MS);
      this.fadeAlpha = ratio;
      ctx.fillStyle = `rgba(10, 25, 30, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, 1280, 720);

      // Texto de carga sutil durante la transición inicial
      ctx.save();
      ctx.fillStyle = `rgba(216, 243, 220, ${ratio * 0.9})`;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ascendiendo a la Maestría Evolutiva...', 640, 360);
      ctx.restore();
      return;
    }

    // Fase 2: Ilustración activa
    const sceneElapsed = elapsed - this.FADE_DURATION_MS;
    this.sceneAlpha = Math.min(1, sceneElapsed / 800);

    ctx.save();
    ctx.globalAlpha = this.sceneAlpha;

    // A. Fondos de estratos divididos
    this.renderStratumBackgrounds(ctx, now);

    // B. Rayos de luz crepusculares y cáusticas abisales
    this.renderLightingEffects(ctx, now);

    // C. Partículas continuas (Chispas arriba, Burbujas abajo)
    this.renderParticles(ctx, now);

    // D. Línea de horizonte estilizada con raíces de manglar
    this.renderHorizonAndRoots(ctx, now);

    // E. Estrato Superior: Libélula coronada en vuelo suspendido
    this.renderDragonflyQueen(ctx, now);

    // F. Estrato Inferior: Tiburón coronado patrullando el abismo
    this.renderSharkKing(ctx, now);

    // G. Tipografía Integrada
    this.renderTypography(ctx, now);

    // H. Botones Interactivos
    this.renderButtons(ctx);

    // I. Modal de Estadísticas Finales (si está abierto)
    if (this.showStatsModal) {
      this.renderStatsModal(ctx);
    }

    ctx.restore();
  }

  /**
   * Renderiza los fondos degradados divididos por el horizonte (y = 360).
   */
  private renderStratumBackgrounds(ctx: CanvasRenderingContext2D, _now: number): void {
    // 1. Cielo crepuscular superior (y: 0 a 360)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
    skyGrad.addColorStop(0, '#0a0d25');   // Azul índigo noche
    skyGrad.addColorStop(0.5, '#241734'); // Púrpura crepúsculo
    skyGrad.addColorStop(0.85, '#5c2d49'); // Ámbar rojizo
    skyGrad.addColorStop(1, '#ff9e00');   // Dorado resplandeciente en el horizonte
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 360);

    // 2. Océano profundo abisal inferior (y: 360 a 720)
    const oceanGrad = ctx.createLinearGradient(0, 360, 0, 720);
    oceanGrad.addColorStop(0, '#005f73');    // Turquesa profundo en la superficie
    oceanGrad.addColorStop(0.35, '#0a2f44'); // Azul marino abisal
    oceanGrad.addColorStop(0.75, '#02182b'); // Azul noche abisal
    oceanGrad.addColorStop(1, '#010b14');    // Abismo negro profundo
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 360, 1280, 360);
  }

  /**
   * Efectos de rayos de luz solares y cáusticas marinas.
   */
  private renderLightingEffects(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    // Rayos dorados descendentes en el cielo
    const beamPulse = Math.sin(now * 0.0015) * 0.04;
    const beamCenters = [280, 520, 760, 1000];
    beamCenters.forEach((bx, idx) => {
      const alpha = 0.07 + beamPulse + (idx % 2 === 0 ? 0.02 : -0.01);
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0.02, alpha)})`;
      ctx.beginPath();
      ctx.moveTo(bx - 30, 0);
      ctx.lineTo(bx + 30, 0);
      ctx.lineTo(bx + 110, 360);
      ctx.lineTo(bx - 50, 360);
      ctx.closePath();
      ctx.fill();
    });

    // Cáusticas de luz marina en el abismo
    const causticOffset = Math.sin(now * 0.002) * 15;
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.12)';
    ctx.lineWidth = 3;
    for (let x = 100; x < 1200; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x + causticOffset, 360);
      ctx.bezierCurveTo(x + 40, 440, x - 30, 520, x + 20 + causticOffset, 620);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Partículas animadas continuas a 60 FPS:
   * Chispas doradas en el cielo, burbujas translúcidas en el océano.
   */
  private renderParticles(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    this.particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(now * 0.002 + p.phase) * 0.3;

      if (p.type === 'spark') {
        // Reaparecer en la base del cielo
        if (p.y < 20) {
          p.y = 350;
          p.x = Math.random() * 1280;
        }
        const shimmer = 0.5 + Math.sin(now * 0.005 + p.phase) * 0.4;
        ctx.fillStyle = `rgba(255, 225, 110, ${p.alpha * shimmer})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Resplandor
        ctx.fillStyle = `rgba(255, 183, 3, ${p.alpha * 0.25 * shimmer})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Burbujas en el abismo
        if (p.y < 365) {
          p.y = 710;
          p.x = Math.random() * 1280;
        }
        const bubbleShine = 0.7 + Math.sin(now * 0.003 + p.phase) * 0.3;
        ctx.strokeStyle = `rgba(168, 218, 220, ${p.alpha * bubbleShine})`;
        ctx.fillStyle = `rgba(241, 250, 238, ${p.alpha * 0.18 * bubbleShine})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Brillo blanco interior de la burbuja
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  /**
   * Línea de horizonte estilizada con raíces de manglar al centro (y = 360).
   */
  private renderHorizonAndRoots(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    // Línea de agua resplandeciente con oleaje suave
    const wave = Math.sin(now * 0.003) * 3;
    const waterGrad = ctx.createLinearGradient(0, 356, 0, 364);
    waterGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    waterGrad.addColorStop(0.5, 'rgba(148, 210, 189, 0.9)');
    waterGrad.addColorStop(1, 'rgba(10, 147, 150, 0.4)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 358 + wave, 1280, 5);

    // Siluetas estilizadas de raíces de manglar zancudas que cruzan el horizonte
    ctx.fillStyle = '#0a1711';
    ctx.strokeStyle = '#040d09';
    ctx.lineWidth = 2;

    const rootBases = [70, 180, 320, 960, 1100, 1210];
    rootBases.forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(rx, 310);
      ctx.quadraticCurveTo(rx + 25, 360, rx + 45, 420);
      ctx.lineTo(rx + 35, 425);
      ctx.quadraticCurveTo(rx + 15, 365, rx - 10, 310);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rama lateral zancuda
      ctx.beginPath();
      ctx.moveTo(rx + 10, 345);
      ctx.quadraticCurveTo(rx - 25, 375, rx - 35, 415);
      ctx.lineTo(rx - 45, 412);
      ctx.quadraticCurveTo(rx - 15, 365, rx + 5, 345);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * Estrato Superior: Libélula coronando los cielos en vuelo suspendido.
   * Utiliza Math.sin(Date.now() * 0.002) para balanceo y aleteo.
   */
  private renderDragonflyQueen(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    const hoverY = 220 + Math.sin(now * 0.002) * 10;
    const hoverX = 640 + Math.cos(now * 0.001) * 6;
    const wingAngle = Math.sin(now * 0.02) * 0.22;

    // Etiqueta del estrato superior
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('✨ REINA SUPREMA DEL DOSEL AÉREO ✨', hoverX, hoverY - 78);

    // Corona de esporas y partículas brillantes sobre la cabeza de la Libélula
    this.renderSporeCrown(ctx, hoverX, hoverY - 52, 0xffd166, now);

    // Dibujo de la Libélula (Kirby Style / Ilustración detallada)
    ctx.translate(hoverX, hoverY);

    // 1. Alas transparentes superiores e inferiores
    const drawWing = (angle: number, flip: number) => {
      ctx.save();
      ctx.scale(flip, 1);
      ctx.rotate(angle);

      // Ala anterior
      ctx.fillStyle = 'rgba(144, 224, 239, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(55, -15, 52, 14, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Venas de las alas
      ctx.strokeStyle = 'rgba(202, 240, 248, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, -15);
      ctx.lineTo(100, -15);
      ctx.moveTo(40, -15);
      ctx.lineTo(60, -25);
      ctx.moveTo(65, -15);
      ctx.lineTo(80, -26);
      ctx.stroke();

      // Ala posterior
      ctx.fillStyle = 'rgba(116, 198, 157, 0.48)';
      ctx.beginPath();
      ctx.ellipse(48, 8, 44, 12, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // Par de alas derecha e izquierda con aleteo
    drawWing(wingAngle, 1);
    drawWing(-wingAngle, -1);

    // 2. Abdomen segmentado alargado (verde esmeralda brillante a cian)
    const abdGrad = ctx.createLinearGradient(0, -5, 0, 65);
    abdGrad.addColorStop(0, '#2d6a4f');
    abdGrad.addColorStop(0.5, '#52b788');
    abdGrad.addColorStop(1, '#74c69d');
    ctx.fillStyle = abdGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.5;

    // Segmentos del abdomen
    for (let seg = 0; seg < 6; seg++) {
      const sy = 12 + seg * 9;
      const sw = 10 - seg * 0.9;
      ctx.beginPath();
      ctx.ellipse(0, sy, sw, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Tórax robusto
    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Cabeza y ojos compuestos vibrantes
    ctx.fillStyle = '#081c15';
    ctx.beginPath();
    ctx.ellipse(0, -16, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grandes ojos compuestos violeta/dorado
    const eyeGrad = ctx.createRadialGradient(-9, -16, 2, -9, -16, 8);
    eyeGrad.addColorStop(0, '#ffd166');
    eyeGrad.addColorStop(0.7, '#7209b7');
    eyeGrad.addColorStop(1, '#3a0ca3');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(-9, -16, 7, 0, Math.PI * 2);
    ctx.arc(9, -16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brillos blancos en los ojos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-11, -18, 2.5, 0, Math.PI * 2);
    ctx.arc(7, -18, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Estrato Inferior: Tiburón dominando el abismo marino.
   * Utiliza Math.sin(Date.now() * 0.002) para balanceo y natación majestuosa.
   */
  private renderSharkKing(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();

    const swimY = 520 + Math.sin(now * 0.002) * 10;
    const swimX = 640 + Math.sin(now * 0.0012) * 14;
    const tailAngle = Math.sin(now * 0.004) * 0.16;

    // Etiqueta del estrato inferior
    ctx.fillStyle = 'rgba(78, 205, 196, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('🌊 SOBERANO DEL ABISMO MARINO 🌊', swimX, swimY - 80);

    // Corona de esporas y partículas brillantes sobre el Tiburón
    this.renderSporeCrown(ctx, swimX, swimY - 54, 0x48cae4, now);

    ctx.translate(swimX, swimY);

    // 1. Cola caudal con balanceo orgánico de natación
    ctx.save();
    ctx.translate(-75, 0);
    ctx.rotate(tailAngle);

    // Aleta de la cola caudal (lóbulo superior largo y lóbulo inferior)
    ctx.fillStyle = '#495057';
    ctx.strokeStyle = '#1b263b';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-35, -42, -55, -50); // Lóbulo superior majestuoso
    ctx.quadraticCurveTo(-45, -15, -28, -5);
    ctx.quadraticCurveTo(-45, 18, -48, 32);  // Lóbulo inferior
    ctx.quadraticCurveTo(-30, 20, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Aleta dorsal icónica y definida
    ctx.fillStyle = '#343a40';
    ctx.strokeStyle = '#1b263b';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-15, -18);
    ctx.quadraticCurveTo(5, -65, 12, -68);
    ctx.quadraticCurveTo(8, -35, 25, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Aleta pectoral ventral
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.moveTo(10, 18);
    ctx.lineTo(-12, 48);
    ctx.lineTo(2, 46);
    ctx.lineTo(38, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Cuerpo principal hidrodinámico (Contrasombreado: Gris/Plateado dorsal, vientre claro)
    const bodyGrad = ctx.createLinearGradient(0, -25, 0, 25);
    bodyGrad.addColorStop(0, '#343a40');    // Gris pizarra dorsal
    bodyGrad.addColorStop(0.45, '#6c757d'); // Gris plata medio
    bodyGrad.addColorStop(0.7, '#dee2e6');  // Vientre blanco/crema claro
    bodyGrad.addColorStop(1, '#f8f9fa');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-80, 0);
    // Lomo dorsal
    ctx.quadraticCurveTo(-20, -32, 50, -26);
    // Hocico cónico estilizado
    ctx.quadraticCurveTo(85, -14, 98, 0);
    // Mandíbula inferior definida
    ctx.quadraticCurveTo(80, 18, 48, 25);
    // Vientre ventral
    ctx.quadraticCurveTo(-15, 28, -80, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Hendiduras branquiales (5 arcos paralelos)
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2;
    for (let g = 0; g < 5; g++) {
      const gx = 18 - g * 6;
      ctx.beginPath();
      ctx.arc(gx, 0, 10, -0.6, 0.6);
      ctx.stroke();
    }

    // 6. Boca con contorno y ligeros dientes aserrados
    ctx.strokeStyle = '#212529';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(56, 12);
    ctx.quadraticCurveTo(72, 14, 86, 6);
    ctx.stroke();

    // Dientes aserrados miniatura
    for (let t = 0; t < 3; t++) {
      const tx = 62 + t * 8;
      ctx.beginPath();
      ctx.moveTo(tx, 11);
      ctx.lineTo(tx + 3, 16);
      ctx.lineTo(tx + 6, 10);
      ctx.fill();
    }

    // 7. Ojo feroz e inteligente con brillo
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.arc(68, -8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#48cae4';
    ctx.beginPath();
    ctx.arc(68, -8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(67, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Elemento de coronación: Una sutil corona de esporas y partículas brillantes sobre ambas criaturas alfa.
   */
  private renderSporeCrown(ctx: CanvasRenderingContext2D, x: number, y: number, colorHex: number, now: number): void {
    ctx.save();

    const pulse = Math.sin(now * 0.003) * 3;
    const crownColor = colorHex === 0xffd166 ? '#ffd166' : '#48cae4';
    const auraColor = colorHex === 0xffd166 ? 'rgba(255, 209, 102, 0.25)' : 'rgba(72, 202, 228, 0.25)';

    // Aura circular de resplandor
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.arc(x, y, 22 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Anillo / Diadema de esporas doradas
    ctx.strokeStyle = crownColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 18, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Puntas de la corona (5 picos con esporas esféricas brillantes)
    const points = [-14, -7, 0, 7, 14];
    points.forEach((px, idx) => {
      const ph = idx === 2 ? 14 : (idx === 1 || idx === 3 ? 10 : 7);
      const topY = y - ph;

      // Línea de pico
      ctx.beginPath();
      ctx.moveTo(x + px, y + 4);
      ctx.lineTo(x + px, topY);
      ctx.stroke();

      // Espora esférica en la punta
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + px, topY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = crownColor;
      ctx.beginPath();
      ctx.arc(x + px, topY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Partículas orbitales de esporas flotando alrededor de la corona
    for (let s = 0; s < 4; s++) {
      const angle = now * 0.0025 + s * (Math.PI / 2);
      const sx = x + Math.cos(angle) * 26;
      const sy = y + Math.sin(angle) * 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Tipografía integrada:
   * Título: "¡MAESTRÍA EVOLUTIVA TOTAL!"
   * Subtítulo: "Has dominado el cielo y las profundidades del manglar"
   */
  private renderTypography(ctx: CanvasRenderingContext2D, _now: number): void {
    ctx.save();
    ctx.textAlign = 'center';

    // Título Principal (Oro resplandeciente con sombra)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 31px sans-serif';
    ctx.fillText('¡MAESTRÍA EVOLUTIVA TOTAL!', 640, 46);

    // Subtítulo
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#d8f3dc';
    ctx.font = '15px sans-serif';
    ctx.fillText('Has dominado el cielo y las profundidades del manglar', 640, 72);

    // Subtítulo de transición de la escena
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('Ecosistema Conquistado: Reyes del Manglar y del Abismo', 640, 94);

    ctx.restore();
  }

  /**
   * Botones interactivos de la parte inferior:
   * Botón 1: "Jugar Campaña Completa de Nuevo"
   * Botón 2: "Créditos / Ver Estadísticas Finales"
   */
  private renderButtons(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Botón 1: Reiniciar Campaña
    const b1 = this.btnRestart;
    ctx.fillStyle = this.isHoverRestart ? '#2d6a4f' : '#1b4332';
    ctx.strokeStyle = this.isHoverRestart ? '#95d5b2' : '#52b788';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, b1.x, b1.y, b1.w, b1.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 Jugar Campaña Completa de Nuevo', b1.x + b1.w / 2, b1.y + 29);

    // Botón 2: Ver Estadísticas / Créditos
    const b2 = this.btnStats;
    ctx.fillStyle = this.isHoverStats ? '#00507a' : '#003049';
    ctx.strokeStyle = this.isHoverStats ? '#90e0ef' : '#48cae4';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, b2.x, b2.y, b2.w, b2.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText('📊 Créditos / Ver Estadísticas Finales', b2.x + b2.w / 2, b2.y + 29);

    ctx.restore();
  }

  /**
   * Modal emergente desplegable con estadísticas completas acumuladas y créditos.
   */
  private renderStatsModal(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Overlay oscurecedor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, 1280, 720);

    // Caja de diálogo centrada
    const boxX = 390;
    const boxY = 140;
    const boxW = 500;
    const boxH = 440;

    ctx.fillStyle = 'rgba(5, 20, 25, 0.96)';
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 3;
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    // Título del Modal
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑 BALANCE DEL ECOSISTEMA CONQUISTADO 👑', 640, boxY + 45);

    // Formateo de tiempo
    const totalSeconds = Math.floor(this.totalPlayTimeMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeFormatted = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    // Estadísticas
    ctx.textAlign = 'left';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#d8f3dc';

    const statLines = [
      `⏱️  Tiempo Total Acumulado: ${timeFormatted}`,
      `🦟  Presas Devoradas: ${this.totalPreyEaten} criaturas`,
      `🏆  Niveles Superados: 3 / 3 (Trilogía Completa)`,
      `   • Nivel 1: Exploración Pacífica de Estratos`,
      `   • Nivel 2: Manglar Hostil y Martín Pescador`,
      `   • Nivel 3: El Abismo del Calamar Gigante`,
      `✨  Reyes Consagrados: Libélula Apex y Tiburón Abisal`
    ];

    statLines.forEach((line, idx) => {
      ctx.fillText(line, boxX + 38, boxY + 95 + idx * 30);
    });

    // Créditos
    ctx.textAlign = 'center';
    ctx.fillStyle = '#95d5b2';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('Desarrollado para: "Evolución en el Manglar"', 640, boxY + 340);
    ctx.fillText('Diseño de Ecosistemas y Programación: Antigravity AI Engine', 640, boxY + 362);

    // Botón de Cerrar Modal
    const cb = this.btnCloseStats;
    ctx.fillStyle = this.isHoverCloseStats ? '#d90429' : '#9b2226';
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 2;
    this.roundRect(ctx, cb.x, cb.y, cb.w, cb.h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✕ Cerrar Resumen', cb.x + cb.w / 2, cb.y + 25);

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
