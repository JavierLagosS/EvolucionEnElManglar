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
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private onStartGameCallback: () => void;

  private isDestroyed: boolean = false;
  private startTime: number = 0;
  private audioCtx: AudioContext | null = null;

  // Dimensiones dinámicas lógicas
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;

  // Viñetas e Imágenes
  private images: HTMLImageElement[] = [];
  private imagesLoaded: boolean = false;

  // Tiempos de Escenas (4.5s cada una = 18s total)
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

  // Botones (Coordenadas dinámicas calculadas)
  private btnStart = { x: 0, y: 0, w: 260, h: 52 };
  private btnReplay = { x: 0, y: 0, w: 260, h: 52 };
  private btnSkip = { x: 0, y: 0, w: 200, h: 38 };

  // Listeners
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onClickBound: (e: MouseEvent) => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onResizeBound: () => void;

  constructor(options: LiamIntroOptions) {
    this.onStartGameCallback = options.onStartGame;

    // Crear canvas overlay a pantalla completa fija (Fixed 100vw x 100vh)
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'liam-intro-canvas';
    this.ctx = this.canvas.getContext('2d')!;

    // Añadir a document.body para garantizar cobertura 100% de la ventana
    document.body.appendChild(this.canvas);

    this.onResizeBound = this.resizeCanvas.bind(this);
    this.resizeCanvas();
    window.addEventListener('resize', this.onResizeBound);

    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onClickBound = this.handleClick.bind(this);
    this.onTouchStartBound = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        this.handleClick(mouseEvent);
      }
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    this.canvas.addEventListener('mousemove', this.onMouseMoveBound);
    this.canvas.addEventListener('click', this.onClickBound);
    this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: true });

    this.loadImages();
    this.initParticles();
    this.initAudio();
  }

  public static start(options: LiamIntroOptions): LiamIntroCinematic {
    const intro = new LiamIntroCinematic(options);
    intro.run();
    return intro;
  }

  /**
   * Configura la resolución interna en High-DPI (Retina) multiplicando por window.devicePixelRatio
   * y ajusta el canvas a 100vw x 100vh sin bordes negros.
   */
  public resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);

    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '10000';
    this.canvas.style.cursor = 'default';
    this.canvas.style.display = 'block';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Recalcular posiciones de botones
    this.updateButtonLayout();
  }

  private updateButtonLayout(): void {
    const w = this.width;
    const h = this.height;

    // Botones de Escena 4
    const btnW = Math.max(220, Math.min(290, w * 0.28));
    const btnH = Math.max(46, Math.min(56, h * 0.075));
    const btnY = h * 0.86;
    const gap = 24;

    this.btnStart = {
      x: w / 2 - btnW - gap / 2,
      y: btnY,
      w: btnW,
      h: btnH
    };

    this.btnReplay = {
      x: w / 2 + gap / 2,
      y: btnY,
      w: btnW,
      h: btnH
    };

    // Botón de Saltar Intro (Esquina Superior Derecha con margen seguro)
    this.btnSkip = {
      x: w - 215,
      y: 20,
      w: 195,
      h: 38
    };
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

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4 + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 4.3);
      });
    } catch {
      // Audio ignorado si no hay permisos
    }
  }

  private playVictoryStartSound(): void {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
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
    const w = this.width;
    const h = this.height;

    // 55 Estrellas parpadeantes
    for (let i = 0; i < 55; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        color: '#ffffff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 35 Chispas de lava tiernas (para Escena 1 del volcán cósmico)
    const emberColors = ['#ff4d6d', '#ff758f', '#ff9e00', '#ffd166'];
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: w / 2 + (Math.random() - 0.5) * (w * 0.3),
        y: h * 0.5 + Math.random() * (h * 0.2),
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
        x: Math.random() * w,
        y: Math.random() * h,
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
        x: Math.random() * w,
        y: Math.random() * h,
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
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.4 + Math.random() * 0.8),
        size: 2.5 + Math.random() * 4,
        alpha: 0.4 + Math.random() * 0.5,
        color: '#b7e4c7',
        type: 'spore',
        phase: Math.random() * Math.PI * 2
      });
    }

    // 50 Confetis celebratorios
    const confettiColors = ['#ff758f', '#ffe66d', '#48cae4', '#52b788', '#ffffff', '#ff9f1c'];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
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

    // Forzar suavizado de imagen en cada frame
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Calcular índice de escena y progreso
    let sceneIdx = Math.floor(elapsed / this.SCENE_DURATION_MS);
    if (sceneIdx > 3) sceneIdx = 3;
    this.currentSceneIndex = sceneIdx;

    if (this.currentSceneIndex !== this.lastPlayedSceneAudio) {
      this.playSceneChords(this.currentSceneIndex);
      this.lastPlayedSceneAudio = this.currentSceneIndex;
    }

    const sceneElapsed = elapsed - sceneIdx * this.SCENE_DURATION_MS;
    const sceneProgress = sceneIdx < 3 ? Math.min(1, sceneElapsed / this.SCENE_DURATION_MS) : 1;

    // 1. Limpiar y dibujar Fondo 100% Responsive
    this.drawBackground(sceneIdx, sceneProgress, timestamp);

    // 2. Partículas Ambientales
    this.renderParticles(sceneIdx, timestamp);

    // 3. Viñeta Central Ilustrada con Ken Burns suave
    this.drawCentralVignette(sceneIdx, sceneElapsed, sceneProgress, timestamp);

    // 4. Tipografía y Narración
    this.drawStoryText(sceneIdx, sceneProgress, timestamp);

    // 5. Elementos Interactivos
    if (sceneIdx === 3) {
      this.drawStarCrown(timestamp);
      this.drawButtons(timestamp);
    } else {
      this.drawSkipButton();
    }
  }

  private drawBackground(sceneIdx: number, _sceneProgress: number, timestamp: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);

    switch (sceneIdx) {
      case 0:
        grad.addColorStop(0, '#0a0718');
        grad.addColorStop(0.5, '#120b24');
        grad.addColorStop(1, '#05030c');
        break;
      case 1:
        grad.addColorStop(0, '#0c1b29');
        grad.addColorStop(0.5, '#132e42');
        grad.addColorStop(1, '#06131d');
        break;
      case 2:
        grad.addColorStop(0, '#081c15');
        grad.addColorStop(0.5, '#113227');
        grad.addColorStop(1, '#05130e');
        break;
      case 3:
      default:
        grad.addColorStop(0, '#101726');
        grad.addColorStop(0.5, '#1e243d');
        grad.addColorStop(1, '#0a0f1c');
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Nebulosa sutil en el fondo
    const pulse = Math.sin(timestamp * 0.001) * 30;
    const nebulaGrad = ctx.createRadialGradient(
      w / 2, h / 2, 80,
      w / 2, h / 2, Math.max(w, h) * 0.6 + pulse
    );
    nebulaGrad.addColorStop(0, 'rgba(255, 230, 109, 0.05)');
    nebulaGrad.addColorStop(0.5, 'rgba(72, 202, 228, 0.04)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, w, h);
  }

  private renderParticles(sceneIdx: number, timestamp: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

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
          if (p.y < h * 0.25 || p.alpha <= 0.05) {
            p.y = h * 0.55 + Math.random() * (h * 0.15);
            p.x = w / 2 + (Math.random() - 0.5) * (w * 0.25);
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
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        } else {
          ctx.strokeStyle = `rgba(202, 240, 248, ${p.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();

          p.y += p.vy;
          p.x += Math.sin(timestamp * 0.002 + p.phase) * 0.4;
          if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        }
      } else if (sceneIdx === 2 && p.type === 'spore') {
        const glow = p.alpha * (0.6 + Math.sin(timestamp * 0.004 + p.phase) * 0.4);
        ctx.fillStyle = `rgba(183, 228, 199, ${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.y += p.vy;
        p.x += Math.cos(timestamp * 0.002 + p.phase) * 0.5;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
      } else if (sceneIdx === 3 && (p.type === 'confetti' || p.type === 'star')) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        p.y += p.vy;
        p.x += Math.sin(timestamp * 0.003 + p.phase) * 0.8;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      }
    }
  }

  private drawCentralVignette(sceneIdx: number, sceneElapsed: number, sceneProgress: number, timestamp: number): void {
    if (!this.imagesLoaded) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Centrado exacto: x = w / 2, y = h * 0.50
    const centerX = w / 2;
    const centerY = sceneIdx === 3 ? h * 0.52 : h * 0.50;

    // Escala proporcional: maxHeight = h * 0.45
    const maxH = h * 0.45;
    const aspectRatio = 16 / 9;
    let baseH = maxH;
    let baseW = baseH * aspectRatio;

    if (baseW > w * 0.86) {
      baseW = w * 0.86;
      baseH = baseW / aspectRatio;
    }

    // Efecto Ken Burns suave
    const zoom = 1.0 + (sceneProgress * 0.05);
    const floatY = Math.sin(timestamp * 0.002) * 5;
    const curW = baseW * zoom;
    const curH = baseH * zoom;

    let alpha = 1;
    if (sceneElapsed < this.CROSSFADE_MS) {
      alpha = sceneElapsed / this.CROSSFADE_MS;
    } else if (sceneIdx < 3 && sceneElapsed > this.SCENE_DURATION_MS - this.CROSSFADE_MS) {
      alpha = (this.SCENE_DURATION_MS - sceneElapsed) / this.CROSSFADE_MS;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const drawX = centerX - (curW / 2);
    const drawY = centerY - (curH / 2) + floatY;

    // Resplandor exterior suave
    ctx.shadowColor = sceneIdx === 3 ? 'rgba(255, 209, 102, 0.45)' : 'rgba(72, 202, 228, 0.35)';
    ctx.shadowBlur = 24;

    const img = this.images[sceneIdx];
    if (img && img.complete) {
      ctx.drawImage(img, drawX, drawY, curW, curH);

      // Marco redondeado con trazo Kirby
      ctx.strokeStyle = sceneIdx === 3 ? '#ffd166' : '#90e0ef';
      ctx.lineWidth = 4;
      this.drawRoundedRect(ctx, drawX, drawY, curW, curH, 14);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawStoryText(sceneIdx: number, sceneProgress: number, _timestamp: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.textAlign = 'center';

    // ==========================================
    // 1. TÍTULO SUPERIOR ESPECIAL (ESCENA 1)
    // Con margen vertical suficiente (y = h * 0.14) para que no lo tape el aviso [Esc]
    // ==========================================
    if (sceneIdx === 0) {
      const titleAlpha = Math.min(1, sceneProgress * 2.5);
      ctx.globalAlpha = titleAlpha;

      const titleY = h * 0.14;

      // Línea 1: Sello de Estudio (Liam & Papá Studios)
      const line1Size = Math.max(16, Math.min(24, Math.round(h * 0.028)));
      ctx.font = `bold ${line1Size}px "Segoe UI", Arial, sans-serif`;
      ctx.strokeStyle = '#071626';
      ctx.lineWidth = 4;
      ctx.strokeText('🎮 LIAM & PAPÁ STUDIOS PRESENTA 🎮', w / 2, titleY);
      ctx.fillStyle = '#ffe66d';
      ctx.fillText('🎮 LIAM & PAPÁ STUDIOS PRESENTA 🎮', w / 2, titleY);

      // Línea 2: Creado e inspirado por Liam
      const line2Size = Math.max(24, Math.min(38, Math.round(h * 0.046)));
      const line2Y = titleY + line1Size + 14;
      ctx.font = `bold ${line2Size}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = '#05030c';
      ctx.fillText('🌟 CREADO E INSPIRADO POR LIAM 🌟', w / 2 + 2, line2Y + 2);

      ctx.strokeStyle = '#071626';
      ctx.lineWidth = 6;
      ctx.strokeText('🌟 CREADO E INSPIRADO POR LIAM 🌟', w / 2, line2Y);

      const textGrad = ctx.createLinearGradient(0, line2Y - 10, 0, line2Y + 15);
      textGrad.addColorStop(0, '#fff3b0');
      textGrad.addColorStop(0.5, '#ffd166');
      textGrad.addColorStop(1, '#f77f00');
      ctx.fillStyle = textGrad;
      ctx.fillText('🌟 CREADO E INSPIRADO POR LIAM 🌟', w / 2, line2Y);

      ctx.globalAlpha = 1;
    }

    // ==========================================
    // 2. SUBTÍTULO BANNER DE CUENTO (ESCENAS 1, 2 Y 3)
    // Ubicado en y = h * 0.84
    // ==========================================
    if (sceneIdx < 3) {
      const bannerY = h * 0.83;
      const bannerW = Math.min(1080, w * 0.90);
      const bannerH = Math.max(54, h * 0.08);
      const bannerX = (w - bannerW) / 2;

      ctx.fillStyle = 'rgba(7, 22, 38, 0.90)';
      ctx.strokeStyle = 'rgba(144, 224, 239, 0.85)';
      ctx.lineWidth = 2.5;
      this.drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();
      ctx.stroke();

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

      const fontSize = Math.max(14, Math.min(20, Math.round(h * 0.024)));
      ctx.font = `italic 500 ${fontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = '#f8f9fa';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(storyText, w / 2, bannerY + bannerH * 0.62);
    }

    // ==========================================
    // 3. TÍTULO Y PRESENTACIÓN FINAL (ESCENA 4)
    // ==========================================
    if (sceneIdx === 3) {
      const mainTitleY = h * 0.11;
      const mainTitleSize = Math.max(26, Math.min(42, Math.round(h * 0.05)));
      ctx.font = `900 ${mainTitleSize}px "Segoe UI", Arial, sans-serif`;

      ctx.strokeStyle = '#03141f';
      ctx.lineWidth = 7;
      ctx.strokeText('EVOLUCIÓN EN EL MANGLAR', w / 2, mainTitleY);

      const titleGrad = ctx.createLinearGradient(0, mainTitleY - 20, 0, mainTitleY + 10);
      titleGrad.addColorStop(0, '#fff3b0');
      titleGrad.addColorStop(0.5, '#ffd166');
      titleGrad.addColorStop(1, '#ff9e00');
      ctx.fillStyle = titleGrad;
      ctx.fillText('EVOLUCIÓN EN EL MANGLAR', w / 2, mainTitleY);

      // Crédito estelar: Dirección Creativa y Diseño de Criaturas: LIAM
      const subTitleY = mainTitleY + Math.round(h * 0.042);
      const subTitleSize = Math.max(16, Math.min(22, Math.round(h * 0.026)));
      ctx.font = `bold ${subTitleSize}px "Segoe UI", Arial, sans-serif`;
      ctx.strokeStyle = '#051923';
      ctx.lineWidth = 4;
      ctx.strokeText('🌟 Dirección Creativa y Diseño de Criaturas: LIAM 🌟', w / 2, subTitleY);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('🌟 Dirección Creativa y Diseño de Criaturas: LIAM 🌟', w / 2, subTitleY);

      // Pie de firma: Desarrollado junto a Papá • Noviembre 2026
      const firmY = subTitleY + Math.round(h * 0.032);
      const firmSize = Math.max(12, Math.min(16, Math.round(h * 0.019)));
      ctx.font = `italic 600 ${firmSize}px "Segoe UI", Arial, sans-serif`;
      ctx.strokeStyle = '#051923';
      ctx.lineWidth = 3;
      ctx.strokeText('Desarrollado junto a Papá • Noviembre 2026', w / 2, firmY);
      ctx.fillStyle = '#b7e4c7';
      ctx.fillText('Desarrollado junto a Papá • Noviembre 2026', w / 2, firmY);
    }

    ctx.restore();
  }

  private drawStarCrown(timestamp: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const centerX = w / 2;
    const centerY = h * 0.52;

    const maxH = h * 0.45;
    const aspectRatio = 16 / 9;
    let baseH = maxH;
    let baseW = baseH * aspectRatio;
    if (baseW > w * 0.86) {
      baseW = w * 0.86;
      baseH = baseW / aspectRatio;
    }

    const radiusX = (baseW / 2) + 38;
    const radiusY = (baseH / 2) + 26;
    const starCount = 8;

    for (let i = 0; i < starCount; i++) {
      const angle = (timestamp * 0.0015) + (i * (Math.PI * 2 / starCount));
      const sx = centerX + Math.cos(angle) * radiusX;
      const sy = centerY + Math.sin(angle) * radiusY;
      const starScale = 1.0 + Math.sin(timestamp * 0.005 + i) * 0.25;

      this.drawKirbyStar(ctx, sx, sy, 11 * starScale, angle);
    }
  }

  private drawKirbyStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const aOuter = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const aInner = aOuter + Math.PI / 5;
      const ox = Math.cos(aOuter) * r;
      const oy = Math.sin(aOuter) * r;
      const ix = Math.cos(aInner) * (r * 0.46);
      const iy = Math.sin(aInner) * (r * 0.46);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();

    ctx.fillStyle = '#ffd166';
    ctx.fill();
    ctx.strokeStyle = '#051923';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawButtons(timestamp: number): void {
    const ctx = this.ctx;
    const b1 = this.btnStart;
    const b2 = this.btnReplay;

    ctx.save();

    // Botón 1: "▶ ¡COMENZAR A JUGAR!"
    const bounce1 = this.isHoverStart ? Math.sin(timestamp * 0.008) * 3 : 0;
    ctx.save();
    ctx.translate(b1.x + b1.w / 2, b1.y + b1.h / 2 + bounce1);
    ctx.scale(this.isHoverStart ? 1.05 : 1.0, this.isHoverStart ? 1.05 : 1.0);

    const btn1Grad = ctx.createLinearGradient(0, -b1.h / 2, 0, b1.h / 2);
    if (this.isHoverStart) {
      btn1Grad.addColorStop(0, '#ff477e');
      btn1Grad.addColorStop(1, '#d90429');
    } else {
      btn1Grad.addColorStop(0, '#ef476f');
      btn1Grad.addColorStop(1, '#b5179e');
    }

    ctx.shadowColor = this.isHoverStart ? 'rgba(239, 71, 111, 0.8)' : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = this.isHoverStart ? 20 : 10;
    ctx.fillStyle = btn1Grad;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3.5;
    this.drawRoundedRect(ctx, -b1.w / 2, -b1.h / 2, b1.w, b1.h, 18);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3a011a';
    ctx.lineWidth = 4;
    ctx.strokeText('▶ ¡COMENZAR A JUGAR!', 0, 6);
    ctx.fillText('▶ ¡COMENZAR A JUGAR!', 0, 6);
    ctx.restore();

    // Botón 2: "🔄 Ver Video de Nuevo"
    const bounce2 = this.isHoverReplay ? Math.sin(timestamp * 0.008) * 3 : 0;
    ctx.save();
    ctx.translate(b2.x + b2.w / 2, b2.y + b2.h / 2 + bounce2);
    ctx.scale(this.isHoverReplay ? 1.05 : 1.0, this.isHoverReplay ? 1.05 : 1.0);

    const btn2Grad = ctx.createLinearGradient(0, -b2.h / 2, 0, b2.h / 2);
    if (this.isHoverReplay) {
      btn2Grad.addColorStop(0, '#48cae4');
      btn2Grad.addColorStop(1, '#0077b6');
    } else {
      btn2Grad.addColorStop(0, '#0096c7');
      btn2Grad.addColorStop(1, '#023e8a');
    }

    ctx.shadowColor = this.isHoverReplay ? 'rgba(72, 202, 228, 0.8)' : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = this.isHoverReplay ? 20 : 10;
    ctx.fillStyle = btn2Grad;
    ctx.strokeStyle = '#90e0ef';
    ctx.lineWidth = 3;
    this.drawRoundedRect(ctx, -b2.w / 2, -b2.h / 2, b2.w, b2.h, 18);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#03045e';
    ctx.lineWidth = 3.5;
    ctx.strokeText('🔄 Ver Video de Nuevo', 0, 6);
    ctx.fillText('🔄 Ver Video de Nuevo', 0, 6);
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

    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
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
    return {
      x: e.clientX,
      y: e.clientY
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
    window.removeEventListener('resize', this.onResizeBound);
    this.canvas.removeEventListener('mousemove', this.onMouseMoveBound);
    this.canvas.removeEventListener('click', this.onClickBound);
    if (this.onTouchStartBound) {
      this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
    }

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
