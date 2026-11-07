/**
 * Cinemática animada estilo Kirby del Origen de la Tierra y el Manglar.
 * "CREADO E INSPIRADO POR LIAM"
 * 
 * Renderizado de alto rendimiento en Canvas 2D a 60 FPS con:
 * - 4 viñetas animadas (intro_1_tierra, intro_2_lluvia, intro_3_manglar, intro_4_liam_emblema)
 * - Efecto Ken Burns (zoom suave y flotación sinusoidal)
 * - Transiciones crossfade fluidas entre escenas
 * - Partículas contextuales (estrellas, lava tierna, lluvia, burbujas, esporas, confeti)
 * - Corona de estrellas de Kirby girando en torno al emblema final
 * - Sintetizador Web Audio API de melodías suaves espaciales y mágicas
 * - Botones interactivos Kirby ("¡COMENZAR A JUGAR!", "Ver Video de Nuevo", "Saltar Intro")
 */

export interface LiamIntroOptions {
  container: HTMLElement;
  onStartGame: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'star' | 'ember' | 'rain' | 'bubble' | 'spore' | 'confetti';
  phase: number;
}

export class LiamIntroCinematic {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private onStartGameCallback: () => void;

  private isDestroyed: boolean = false;
  private startTime: number = 0;
  private audioCtx: AudioContext | null = null;

  // Imágenes de las 4 escenas
  private images: HTMLImageElement[] = [];
  private imagesLoaded: boolean = false;

  // Estado de la cinemática:
  // Escena 1: 0 a 4500ms
  // Escena 2: 4500 a 9000ms
  // Escena 3: 9000 a 13500ms
  // Escena 4: 13500ms en adelante (interactiva)
  private currentSceneIndex: number = 0;
  private lastPlayedSceneAudio: number = -1;
  private readonly SCENE_DURATION_MS: number = 4500;
  private readonly CROSSFADE_MS: number = 800;

  // Partículas
  private particles: Particle[] = [];

  // Interacción
  private isHoverStart: boolean = false;
  private isHoverReplay: boolean = false;
  private isHoverSkip: boolean = false;

  // Botones (Coordenadas lógicas 1280x720)
  private readonly btnStart = { x: 310, y: 624, w: 310, h: 56 };
  private readonly btnReplay = { x: 660, y: 624, w: 310, h: 56 };
  private readonly btnSkip = { x: 1060, y: 22, w: 195, h: 38 };

  // Listeners
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onClickBound: (e: MouseEvent) => void;

  constructor(options: LiamIntroOptions) {
    this.container = options.container;
    this.onStartGameCallback = options.onStartGame;

    // Crear canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'liam-intro-canvas';
    this.canvas.width = 1280;
    this.canvas.height = 720;

    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '10000';
    this.canvas.style.cursor = 'default';

    // Ajustar con respecto al contenedor de Phaser si existe
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

    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onClickBound = this.handleClick.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    this.canvas.addEventListener('mousemove', this.onMouseMoveBound);
    this.canvas.addEventListener('click', this.onClickBound);

    this.loadImages();
    this.initParticles();
    this.initAudio();
  }

  public static start(options: LiamIntroOptions): LiamIntroCinematic {
    const intro = new LiamIntroCinematic(options);
    intro.run();
    return intro;
  }

  private loadImages(): void {
    const urls = [
      './assets/sprites/intro_1_tierra.png',
      './assets/sprites/intro_2_lluvia.png',
      './assets/sprites/intro_3_manglar.png',
      './assets/sprites/intro_4_liam_emblema.png'
    ];

    let loadedCount = 0;
    urls.forEach((url, i) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === urls.length) {
          this.imagesLoaded = true;
        }
      };
      this.images[i] = img;
    });
  }

  private initAudio(): void {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  private playSceneChords(sceneIdx: number): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Progresión de acordes dulces estilo Kirby
      // Escena 1: Cmaj9 espacial (C4, E4, G4, B4, D5)
      // Escena 2: Oceánica Fmaj7 (F3, C4, E4, A4)
      // Escena 3: Manglar vivaz Gmaj7 (G3, D4, F#4, B4)
      // Escena 4: Triunfal celebración C - G - C (C4, G4, C5, E5, G5)
      let freqs: number[] = [];
      switch (sceneIdx) {
        case 0:
          freqs = [261.63, 329.63, 392.00, 493.88, 587.33];
          break;
        case 1:
          freqs = [174.61, 261.63, 329.63, 440.00, 523.25];
          break;
        case 2:
          freqs = [196.00, 293.66, 369.99, 493.88, 587.33];
          break;
        case 3:
          freqs = [261.63, 392.00, 523.25, 659.25, 783.99];
          break;
      }

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);

        // Ataque lento y resonancia suave
        gain.gain.setValueAtTime(0.001, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.08 / freqs.length, now + i * 0.04 + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 3.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 3.4);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  private playVictoryStartSound(): void {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch {
      // Ignorar
    }
  }

  private initParticles(): void {
    this.particles = [];
    // 50 Estrellas parpadeantes
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        color: '#ffffff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 30 Chispas de lava tiernas (para Escena 1)
    const emberColors = ['#ff4d6d', '#ff758f', '#ff9e00', '#ffd166'];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: 600 + (Math.random() - 0.5) * 380,
        y: 280 + Math.random() * 180,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(0.8 + Math.random() * 1.6),
        size: 2 + Math.random() * 3.5,
        alpha: 0.5 + Math.random() * 0.5,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        type: 'ember',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 40 Gotas de lluvia
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: -1.2,
        vy: 5 + Math.random() * 4,
        size: 14 + Math.random() * 10,
        alpha: 0.35 + Math.random() * 0.4,
        color: '#90e0ef',
        type: 'rain',
        phase: 0
      });
    }

    // 35 Burbujas marinas
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.8 + Math.random() * 1.5),
        size: 3 + Math.random() * 6,
        alpha: 0.3 + Math.random() * 0.5,
        color: '#caf0f8',
        type: 'bubble',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 35 Esporas del manglar
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.4 + Math.random() * 0.8),
        size: 2.5 + Math.random() * 4,
        alpha: 0.4 + Math.random() * 0.5,
        color: '#b7e4c7',
        type: 'spore',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 45 Confetis celebratorios
    const confettiColors = ['#ff758f', '#ffe66d', '#48cae4', '#52b788', '#ffffff', '#ff9f1c'];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.2 + Math.random() * 2,
        size: 4 + Math.random() * 5,
        alpha: 0.6 + Math.random() * 0.4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        type: 'confetti',
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public run(): void {
    this.startTime = performance.now();
    const loop = (timestamp: number) => {
      if (this.isDestroyed) return;
      this.render(timestamp);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private render(timestamp: number): void {
    const elapsed = timestamp - this.startTime;

    // Calcular índice de escena y progreso
    let sceneIdx = Math.floor(elapsed / this.SCENE_DURATION_MS);
    if (sceneIdx > 3) sceneIdx = 3;
    this.currentSceneIndex = sceneIdx;

    // Disparar audio una vez por escena
    if (this.currentSceneIndex !== this.lastPlayedSceneAudio) {
      this.playSceneChords(this.currentSceneIndex);
      this.lastPlayedSceneAudio = this.currentSceneIndex;
    }

    const sceneElapsed = elapsed - sceneIdx * this.SCENE_DURATION_MS;
    const sceneProgress = sceneIdx < 3 ? Math.min(1, sceneElapsed / this.SCENE_DURATION_MS) : 1;

    // Fondo ambiental degradado dinámico según la escena
    this.drawBackground(sceneIdx, sceneProgress, timestamp);

    // Partículas ambientales de fondo
    this.drawParticles(sceneIdx, timestamp);

    // Renderizar Viñeta Central con efecto Ken Burns y Crossfade
    this.drawCentralVignette(sceneIdx, sceneElapsed, sceneProgress, timestamp);

    // Renderizar Textos y Títulos de Cuento
    this.drawStoryText(sceneIdx, sceneProgress, timestamp);

    // Si estamos en la escena 4, renderizar Corona de Estrellas y Botones Interactivos
    if (sceneIdx === 3) {
      this.drawStarCrown(timestamp);
      this.drawButtons(timestamp);
    } else {
      // Botón discreto de Saltar Intro
      this.drawSkipButton();
    }
  }

  private drawBackground(sceneIdx: number, _sceneProgress: number, timestamp: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, 720);

    switch (sceneIdx) {
      case 0: // Espacio Cósmico
        grad.addColorStop(0, '#0a0718');
        grad.addColorStop(0.5, '#120b24');
        grad.addColorStop(1, '#05030c');
        break;
      case 1: // Océano en Lluvia
        grad.addColorStop(0, '#0c1b29');
        grad.addColorStop(0.5, '#132e42');
        grad.addColorStop(1, '#06131d');
        break;
      case 2: // Manglar Prístino
        grad.addColorStop(0, '#081c15');
        grad.addColorStop(0.5, '#123524');
        grad.addColorStop(1, '#05110d');
        break;
      case 3: // Celebración Liam (Azul rey y dorado)
        grad.addColorStop(0, '#0d1b2a');
        grad.addColorStop(0.5, '#1b263b');
        grad.addColorStop(1, '#0d131a');
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Rayos de luz dorada sutiles en la escena final
    if (sceneIdx === 3) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(timestamp * 0.002) * 0.04;
      const lightGrad = ctx.createRadialGradient(640, 280, 50, 640, 280, 600);
      lightGrad.addColorStop(0, '#ffeaa7');
      lightGrad.addColorStop(0.6, '#ffd166');
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }
  }

  private drawParticles(sceneIdx: number, timestamp: number): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      if (sceneIdx === 0 && (p.type === 'star' || p.type === 'ember')) {
        if (p.type === 'star') {
          const twinkle = p.alpha * (0.6 + Math.sin(timestamp * 0.003 + p.phase) * 0.4);
          ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * (0.7 + Math.sin(timestamp * 0.005 + p.phase) * 0.3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          p.x += p.vx;
          p.y += p.vy;
          if (p.y < 160 || p.alpha <= 0.05) {
            p.y = 350 + Math.random() * 100;
            p.x = 600 + (Math.random() - 0.5) * 380;
          }
        }
      } else if (sceneIdx === 1 && (p.type === 'rain' || p.type === 'bubble')) {
        if (p.type === 'rain') {
          ctx.strokeStyle = `rgba(144, 224, 239, ${p.alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx, p.y + p.size);
          ctx.stroke();

          p.x += p.vx;
          p.y += p.vy;
          if (p.y > 720) { p.y = -20; p.x = Math.random() * 1280; }
        } else {
          ctx.strokeStyle = `rgba(202, 240, 248, ${p.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();

          p.y += p.vy;
          p.x += Math.sin(timestamp * 0.002 + p.phase) * 0.4;
          if (p.y < 0) { p.y = 740; p.x = Math.random() * 1280; }
        }
      } else if (sceneIdx === 2 && p.type === 'spore') {
        const glow = p.alpha * (0.6 + Math.sin(timestamp * 0.004 + p.phase) * 0.4);
        ctx.fillStyle = `rgba(183, 228, 199, ${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.y += p.vy;
        p.x += Math.cos(timestamp * 0.002 + p.phase) * 0.5;
        if (p.y < 0) { p.y = 740; p.x = Math.random() * 1280; }
      } else if (sceneIdx === 3 && (p.type === 'confetti' || p.type === 'star')) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        p.y += p.vy;
        p.x += Math.sin(timestamp * 0.003 + p.phase) * 0.8;
        if (p.y > 720) { p.y = -10; p.x = Math.random() * 1280; }
      }
    }
  }

  private drawCentralVignette(sceneIdx: number, sceneElapsed: number, sceneProgress: number, timestamp: number): void {
    if (!this.imagesLoaded) return;
    const ctx = this.ctx;

    // Dimensiones base de la viñeta (16:9 escala generosa)
    const baseW = 540;
    const baseH = 297;
    const centerX = 640;
    // En escena 4 se ubica un poco más arriba para dar lugar al título y botones
    const centerY = sceneIdx === 3 ? 350 : 340;

    // Efecto Ken Burns: zoom lento y flotación sinusoidal
    const zoom = 1.0 + (sceneProgress * 0.06);
    const floatY = Math.sin(timestamp * 0.002) * 8;
    const curW = baseW * zoom;
    const curH = baseH * zoom;

    // Calcular alpha con Crossfade suave
    let alpha = 1;
    if (sceneElapsed < this.CROSSFADE_MS) {
      alpha = sceneElapsed / this.CROSSFADE_MS;
    } else if (sceneIdx < 3 && sceneElapsed > this.SCENE_DURATION_MS - this.CROSSFADE_MS) {
      alpha = (this.SCENE_DURATION_MS - sceneElapsed) / this.CROSSFADE_MS;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Resplandor dorado / aura suave detrás del marco
    ctx.shadowColor = sceneIdx === 3 ? 'rgba(255, 215, 0, 0.45)' : 'rgba(72, 202, 228, 0.35)';
    ctx.shadowBlur = 24;

    const drawX = centerX - curW / 2;
    const drawY = centerY - curH / 2 + floatY;

    // Marco exterior con borde estilo Kirby
    ctx.strokeStyle = sceneIdx === 3 ? '#ffd166' : '#90e0ef';
    ctx.lineWidth = 5;

    const img = this.images[sceneIdx];
    if (img && img.complete) {
      // Dibujar imagen con esquinas redondeadas
      ctx.drawImage(img, drawX, drawY, curW, curH);
      ctx.strokeRect(drawX, drawY, curW, curH);
    }

    ctx.restore();
  }

  private drawStoryText(sceneIdx: number, sceneProgress: number, timestamp: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';

    // ==========================================
    // 1. TÍTULO SUPERIOR ESPECIAL: CREADO E INSPIRADO POR LIAM
    // ==========================================
    if (sceneIdx === 0) {
      const titleAlpha = Math.min(1, sceneProgress * 2.5);
      ctx.globalAlpha = titleAlpha;

      const bounceY = Math.sin(timestamp * 0.003) * 3;
      const titleY = 100 + bounceY;

      // Línea 1: Sello de Estudio (Liam & Papá Studios)
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.strokeStyle = '#071626';
      ctx.lineWidth = 5;
      ctx.strokeText('🎮 LIAM & PAPÁ STUDIOS PRESENTA 🎮', 640, titleY - 26);
      ctx.fillStyle = '#ffe66d';
      ctx.fillText('🎮 LIAM & PAPÁ STUDIOS PRESENTA 🎮', 640, titleY - 26);

      // Línea 2: Creado e inspirado por Liam
      ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#05030c';
      ctx.fillText('🌟 CREADO E INSPIRADO POR LIAM 🌟', 642, titleY + 14);

      ctx.strokeStyle = '#071626';
      ctx.lineWidth = 7;
      ctx.strokeText('🌟 CREADO E INSPIRADO POR LIAM 🌟', 640, titleY + 11);

      const textGrad = ctx.createLinearGradient(0, titleY - 10, 0, titleY + 25);
      textGrad.addColorStop(0, '#fff3b0');
      textGrad.addColorStop(0.5, '#ffd166');
      textGrad.addColorStop(1, '#f77f00');
      ctx.fillStyle = textGrad;
      ctx.fillText('🌟 CREADO E INSPIRADO POR LIAM 🌟', 640, titleY + 11);

      ctx.globalAlpha = 1;
    }

    // ==========================================
    // 2. SUBTÍTULO BANNER DE CUENTO (ESCENAS 1, 2 Y 3)
    // ==========================================
    if (sceneIdx < 3) {
      const bannerY = 570;
      const bannerW = 1060;
      const bannerH = 66;
      const bannerX = (1280 - bannerW) / 2;

      // Banner translúcido con borde redondeado
      ctx.fillStyle = 'rgba(7, 22, 38, 0.88)';
      ctx.strokeStyle = 'rgba(144, 224, 239, 0.8)';
      ctx.lineWidth = 2.5;
      this.drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();
      ctx.stroke();

      // Texto de la historia
      let storyText = '';
      switch (sceneIdx) {
        case 0:
          storyText = 'Hace miles de millones de años, la Tierra era un pequeño planeta lleno de fuego y energía...';
          break;
        case 1:
          storyText = 'Las grandes lluvias enfriaron el mundo, formaron los océanos y encendieron la primera chispa de la vida...';
          break;
        case 2:
          storyText = 'De las aguas brotó el gran Manglar, donde pequeñas criaturas comenzaron a crecer y evolucionar...';
          break;
      }

      ctx.font = 'italic 500 20px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#f8f9fa';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(storyText, 640, bannerY + 41);
    }

    // ==========================================
    // 3. TÍTULO Y PRESENTACIÓN FINAL (ESCENA 4)
    // ==========================================
    if (sceneIdx === 3) {
      // Título Principal "EVOLUCIÓN EN EL MANGLAR"
      const mainTitleY = 74;
      ctx.font = '900 46px "Segoe UI", Arial, sans-serif';

      ctx.strokeStyle = '#03141f';
      ctx.lineWidth = 8;
      ctx.strokeText('EVOLUCIÓN EN EL MANGLAR', 640, mainTitleY);

      const titleGrad = ctx.createLinearGradient(0, mainTitleY - 30, 0, mainTitleY + 10);
      titleGrad.addColorStop(0, '#fff3b0');
      titleGrad.addColorStop(0.5, '#ffd166');
      titleGrad.addColorStop(1, '#ff9e00');
      ctx.fillStyle = titleGrad;
      ctx.fillText('EVOLUCIÓN EN EL MANGLAR', 640, mainTitleY);

      // Crédito estelar: Dirección Creativa y Diseño de Criaturas: LIAM
      const subTitleY = 114;
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.strokeStyle = '#051923';
      ctx.lineWidth = 5;
      ctx.strokeText('🌟 Dirección Creativa y Diseño de Criaturas: LIAM 🌟', 640, subTitleY);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('🌟 Dirección Creativa y Diseño de Criaturas: LIAM 🌟', 640, subTitleY);

      // Pie de firma: Desarrollado junto a Papá • Noviembre 2026
      const firmY = 142;
      ctx.font = 'italic 600 16px "Segoe UI", Arial, sans-serif';
      ctx.strokeStyle = '#051923';
      ctx.lineWidth = 4;
      ctx.strokeText('Desarrollado junto a Papá • Noviembre 2026', 640, firmY);
      ctx.fillStyle = '#b7e4c7';
      ctx.fillText('Desarrollado junto a Papá • Noviembre 2026', 640, firmY);
    }

    ctx.restore();
  }

  /**
   * Corona de 8 estrellas doradas girando alrededor de la viñeta del emblema de Liam.
   */
  private drawStarCrown(timestamp: number): void {
    const ctx = this.ctx;
    const centerX = 640;
    const centerY = 350;
    const radiusX = 330;
    const radiusY = 190;
    const starCount = 8;
    const baseAngle = timestamp * 0.0012;

    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / starCount;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;

      // Dibujar estrella dorada estilo Kirby
      this.drawKirbyStar(ctx, x, y, 16, timestamp + i * 500);
    }
    ctx.restore();
  }

  private drawKirbyStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.002);

    // Borde negro grueso
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const ai = a + Math.PI / 5;
      const outerX = Math.cos(a) * r;
      const outerY = Math.sin(a) * r;
      const innerX = Math.cos(ai) * (r * 0.48);
      const innerY = Math.sin(ai) * (r * 0.48);

      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1b1b1b';
    ctx.stroke();

    // Relleno degradado amarillo brillante
    const starGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    starGrad.addColorStop(0, '#ffffff');
    starGrad.addColorStop(0.3, '#ffea00');
    starGrad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = starGrad;
    ctx.fill();

    ctx.restore();
  }

  private drawButtons(timestamp: number): void {
    const ctx = this.ctx;
    ctx.save();

    // ==========================================
    // BOTÓN 1: ¡COMENZAR A JUGAR! (KIRBY PINK)
    // ==========================================
    const b1 = this.btnStart;
    const bounce1 = this.isHoverStart ? Math.sin(timestamp * 0.01) * 2 : 0;
    const scale1 = this.isHoverStart ? 1.04 : 1.0;

    ctx.save();
    ctx.translate(b1.x + b1.w / 2, b1.y + b1.h / 2 + bounce1);
    ctx.scale(scale1, scale1);

    // Sombra brillante
    ctx.shadowColor = this.isHoverStart ? 'rgba(255, 117, 143, 0.9)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = this.isHoverStart ? 20 : 10;

    // Relleno degradado rosa Kirby
    const btn1Grad = ctx.createLinearGradient(0, -b1.h / 2, 0, b1.h / 2);
    if (this.isHoverStart) {
      btn1Grad.addColorStop(0, '#ff758f');
      btn1Grad.addColorStop(1, '#c9184a');
    } else {
      btn1Grad.addColorStop(0, '#ff4d6d');
      btn1Grad.addColorStop(1, '#a4133c');
    }

    ctx.fillStyle = btn1Grad;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3.5;
    this.drawRoundedRect(ctx, -b1.w / 2, -b1.h / 2, b1.w, b1.h, 18);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '900 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#590d22';
    ctx.lineWidth = 4;
    ctx.strokeText('▶ ¡COMENZAR A JUGAR!', 0, 8);
    ctx.fillText('▶ ¡COMENZAR A JUGAR!', 0, 8);
    ctx.restore();

    // ==========================================
    // BOTÓN 2: VER HISTORIA DE NUEVO (CYAN / TEAL)
    // ==========================================
    const b2 = this.btnReplay;
    const scale2 = this.isHoverReplay ? 1.03 : 1.0;

    ctx.save();
    ctx.translate(b2.x + b2.w / 2, b2.y + b2.h / 2);
    ctx.scale(scale2, scale2);

    ctx.shadowColor = this.isHoverReplay ? 'rgba(72, 202, 228, 0.8)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = this.isHoverReplay ? 18 : 8;

    const btn2Grad = ctx.createLinearGradient(0, -b2.h / 2, 0, b2.h / 2);
    if (this.isHoverReplay) {
      btn2Grad.addColorStop(0, '#48cae4');
      btn2Grad.addColorStop(1, '#0077b6');
    } else {
      btn2Grad.addColorStop(0, '#0096c7');
      btn2Grad.addColorStop(1, '#023e8a');
    }

    ctx.fillStyle = btn2Grad;
    ctx.strokeStyle = '#90e0ef';
    ctx.lineWidth = 3;
    this.drawRoundedRect(ctx, -b2.w / 2, -b2.h / 2, b2.w, b2.h, 18);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#03045e';
    ctx.lineWidth = 3.5;
    ctx.strokeText('🔄 Ver Video de Nuevo', 0, 7);
    ctx.fillText('🔄 Ver Video de Nuevo', 0, 7);
    ctx.restore();

    ctx.restore();
  }

  private drawSkipButton(): void {
    const ctx = this.ctx;
    const b = this.btnSkip;

    ctx.save();
    ctx.fillStyle = this.isHoverSkip ? 'rgba(7, 26, 43, 0.95)' : 'rgba(7, 22, 38, 0.75)';
    ctx.strokeStyle = this.isHoverSkip ? '#ffd166' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.isHoverSkip ? '#ffd166' : '#f8f9fa';
    ctx.fillText('Saltar Intro (Espacio) ⏩', b.x + b.w / 2, b.y + 24);
    ctx.restore();
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ==========================================
  // EVENTOS Y NAVEGACIÓN
  // ==========================================

  private getLogicalCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private isInside(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getLogicalCoords(e);

    if (this.currentSceneIndex === 3) {
      this.isHoverStart = this.isInside(pos.x, pos.y, this.btnStart);
      this.isHoverReplay = this.isInside(pos.x, pos.y, this.btnReplay);
      this.isHoverSkip = false;
      this.canvas.style.cursor = (this.isHoverStart || this.isHoverReplay) ? 'pointer' : 'default';
    } else {
      this.isHoverSkip = this.isInside(pos.x, pos.y, this.btnSkip);
      this.canvas.style.cursor = this.isHoverSkip ? 'pointer' : 'default';
    }
  }

  private handleClick(e: MouseEvent): void {
    const pos = this.getLogicalCoords(e);

    if (this.currentSceneIndex === 3) {
      if (this.isInside(pos.x, pos.y, this.btnStart)) {
        this.startGame();
      } else if (this.isInside(pos.x, pos.y, this.btnReplay)) {
        this.replayIntro();
      }
    } else {
      if (this.isInside(pos.x, pos.y, this.btnSkip)) {
        this.skipToScene4();
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
      e.preventDefault();
      if (this.currentSceneIndex < 3) {
        this.skipToScene4();
      } else {
        this.startGame();
      }
    }
  }

  private skipToScene4(): void {
    // Adelantar al inicio de la escena 4
    this.startTime = performance.now() - 3 * this.SCENE_DURATION_MS;
    this.currentSceneIndex = 3;
    this.playSceneChords(3);
    this.lastPlayedSceneAudio = 3;
  }

  private replayIntro(): void {
    this.startTime = performance.now();
    this.currentSceneIndex = 0;
    this.lastPlayedSceneAudio = -1;
  }

  private startGame(): void {
    this.playVictoryStartSound();
    setTimeout(() => {
      this.destroy();
      this.onStartGameCallback();
    }, 200);
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    window.removeEventListener('keydown', this.onKeyDownBound);
    this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
    this.canvas.removeEventListener('click', this.onClickBound);

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Ignorar
      }
    }
  }
}
