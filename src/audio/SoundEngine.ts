// High-Performance Web Audio API Synthesizer (Zero External MP3 Asset Dependencies)

export class SoundEngine {
  private static instance: SoundEngine;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private isBGMPlaying: boolean = false;

  private constructor() {}

  public static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }

  private initCtx(): void {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.audioCtx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  // 1. Scissors Snip Sound (White Noise Burst + High Cut)
  public playScissorsCutSound(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const bufferSize = this.audioCtx.sampleRate * 0.08;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      whiteNoise.start();
    } catch (e) {
      // Ignore audio context autoplay restrictions
    }
  }

  // 2. Cash Register Ka-Ching Sound (Dual High Sine Chimes)
  public playCashRegisterSound(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;

      // First Chime (E6)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Second High Chime (B6 - Ka-Ching!)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now + 0.08);
      gain2.gain.setValueAtTime(0.35, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (e) {}
  }

  // 3. Level Up Victory Fanfare Sound
  public playLevelUpSound(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } catch (e) {}
  }

  // 4. Customer Spawn Bubble Pop Sound
  public playCustomerPopSound(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // 5. Relaxing Lofi Salon Ambient Music Loop (Chords Synth)
  public startBGM(): void {
    if (this.isBGMPlaying) return;
    this.initCtx();
    if (!this.audioCtx) return;

    try {
      this.isBGMPlaying = true;
      this.bgmGainNode = this.audioCtx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.audioCtx.currentTime);
      this.bgmGainNode.connect(this.audioCtx.destination);

      const playChordSequence = () => {
        if (!this.isBGMPlaying || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const chords = [
          [261.63, 329.63, 392.00], // C Maj
          [220.00, 261.63, 329.63], // A Min
          [174.61, 220.00, 261.63], // F Maj
          [196.00, 246.94, 293.66]  // G Maj
        ];

        chords.forEach((chord, stepIdx) => {
          chord.forEach((freq) => {
            const osc = this.audioCtx!.createOscillator();
            const gain = this.audioCtx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + stepIdx * 2.5);

            gain.gain.setValueAtTime(0.04, now + stepIdx * 2.5);
            gain.gain.exponentialRampToValueAtTime(0.001, now + stepIdx * 2.5 + 2.4);

            osc.connect(gain);
            gain.connect(this.bgmGainNode!);
            osc.start(now + stepIdx * 2.5);
            osc.stop(now + stepIdx * 2.5 + 2.4);
          });
        });

        setTimeout(playChordSequence, 10000);
      };

      playChordSequence();
    } catch (e) {}
  }
}
