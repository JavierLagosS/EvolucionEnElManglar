/**
 * Sistema de audio procedural basado exclusivamente en Web Audio API (sin dependencias de archivos externos).
 * Sintetiza dinámicamente efectos sonoros en tiempo real (SFX chiptune/orgánicos estilo Kirby).
 */
export class SoundSystem {
  private static instance: SoundSystem;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private constructor() {}

  public static getInstance(): SoundSystem {
    if (!SoundSystem.instance) {
      SoundSystem.instance = new SoundSystem();
    }
    return SoundSystem.instance;
  }

  /**
   * Obtiene o inicializa perezosamente el AudioContext.
   */
  public getAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public resume(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Comer presa (playEat): Oscilador sine corto con subida rápida de frecuencia (300Hz a 600Hz en 0.08s).
   */
  public playEat(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio seguro
    }
  }

  /**
   * Cruzar el umbral del agua en y = 1550 (playSplash): Barrido rápido de frecuencias bajas (400Hz a 120Hz en 0.2s).
   */
  public playSplash(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio seguro
    }
  }

  /**
   * Evolucionar (playEvolve): Arpegio ascendente triunfal de 4 notas (C4, E4, G4, C5 con onda triangle).
   */
  public playEvolve(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.18, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.22);
      });
    } catch {
      // Audio seguro
    }
  }

  /**
   * Recibir daño / Knockback (playHurt): Oscilador sawtooth grave descendente (180Hz a 60Hz en 0.25s).
   */
  public playHurt(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio seguro
    }
  }

  /**
   * Usar habilidad (playAbility): Sonido sweep futurista/orgánico corto.
   */
  public playAbility(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio seguro
    }
  }

  /**
   * Alerta grave de Jefe Final (playBossAlert): Sirena/pulso grave de advertencia en el dosel.
   */
  public playBossAlert(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dos pulsos graves oscilantes (120Hz -> 85Hz)
      [0, 0.28].forEach((offset) => {
        const t = now + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(125, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch {
      // Audio seguro
    }
  }

  /**
   * Golpe al Jefe Final (playBossHit): Impacto contundente con crujido.
   */
  public playBossHit(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio seguro
    }
  }

  /**
   * Jefe derrotado (playBossDefeated): Acorde triunfal extendido y fanfarria mayor majestuosa.
   */
  public playBossDefeated(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Arpegio triunfal C4 -> E4 -> G4 -> B4 -> C5 -> E5 -> G5
      const notes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.45);
      });
    } catch {
      // Audio seguro
    }
  }

  /**
   * Cierre de la trilogía de niveles (playTrilogyEnding):
   * Tema y acorde prolongado de arpegio triunfal usando ondas sine y triangle
   * que celebra la coronación final del ecosistema tras vencer al Calamar Gigante.
   */
  public playTrilogyEnding(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpegio orquestal triunfal majestuoso en sine + triangle
      const notes = [
        { f: 130.81, t: 0.0, d: 2.5 },   // C3 (Fundamento)
        { f: 196.00, t: 0.18, d: 2.5 },  // G3
        { f: 261.63, t: 0.36, d: 2.8 },  // C4
        { f: 329.63, t: 0.54, d: 2.8 },  // E4
        { f: 392.00, t: 0.72, d: 3.0 },  // G4
        { f: 493.88, t: 0.90, d: 3.0 },  // B4
        { f: 523.25, t: 1.08, d: 3.4 },  // C5
        { f: 659.25, t: 1.26, d: 3.4 },  // E5
        { f: 783.99, t: 1.44, d: 3.8 },  // G5
        { f: 1046.50, t: 1.62, d: 4.2 }  // C6 (Clímax de Coronación)
      ];

      notes.forEach((note) => {
        const start = now + note.t;

        // Capa Triangle: cuerpo, resonancia y definición melódica
        const oscTri = ctx.createOscillator();
        const gainTri = ctx.createGain();
        oscTri.type = 'triangle';
        oscTri.frequency.setValueAtTime(note.f, start);
        gainTri.gain.setValueAtTime(0.18, start);
        gainTri.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
        oscTri.connect(gainTri);
        gainTri.connect(ctx.destination);
        oscTri.start(start);
        oscTri.stop(start + note.d);

        // Capa Sine: calidez sedosa, brillantez pura y sostenimiento extendido
        const oscSine = ctx.createOscillator();
        const gainSine = ctx.createGain();
        oscSine.type = 'sine';
        oscSine.frequency.setValueAtTime(note.f * 1.002, start); // Micro-chorus
        gainSine.gain.setValueAtTime(0.14, start);
        gainSine.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
        oscSine.connect(gainSine);
        gainSine.connect(ctx.destination);
        oscSine.start(start);
        oscSine.stop(start + note.d);
      });
    } catch {
      // Audio seguro
    }
  }
}
