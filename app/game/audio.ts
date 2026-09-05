export type Sound =
  | 'shot'
  | 'reload'
  | 'magOut'
  | 'magIn'
  | 'bolt'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'jump'
  | 'step'
  | 'pickup'
  | 'victory';
export const MUSIC = {
  getaway: {
    title: 'A Flawless Getaway',
    source: 'https://opengameart.org/content/a-flawless-getaway',
  },
  malfunction: {
    title: 'Neural Malfunction',
    source: 'https://opengameart.org/content/neural-malfunction',
  },
  rush: {
    title: 'Virtual Rush',
    source: 'https://opengameart.org/content/virtual-rush',
  },
} as const;
const SAMPLE_FILES = [
  'pistol',
  'shotgun',
  'sniper',
  'rifle',
  'cloth',
  'mag-out',
  'mag-in',
  'bolt',
  'hit',
  'kill',
  'hurt',
  'step',
  'pickup',
  'victory',
];
const soundFile: Record<Exclude<Sound, 'shot'>, string> = {
  reload: 'cloth',
  magOut: 'mag-out',
  magIn: 'mag-in',
  bolt: 'bolt',
  hit: 'hit',
  kill: 'kill',
  hurt: 'hurt',
  jump: 'cloth',
  step: 'step',
  pickup: 'pickup',
  victory: 'victory',
};
/** Music streams only the selected track; small effects are decoded once and reused. */
export class GameAudio {
  private context: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicSource: MediaElementAudioSourceNode | null = null;
  private samples = new Map<string, AudioBuffer>();
  private voices: AudioBufferSourceNode[] = [];
  private track = '';
  private active = false;
  private disposed = false;
  private settings = '';
  private abort = new AbortController();

  unlock(track: string) {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const ac = (this.context = new AudioContext());
        this.sfxGain = ac.createGain();
        this.sfxGain.gain.value = 0.55;
        const limiter = ac.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 12;
        limiter.ratio.value = 4;
        this.sfxGain.connect(limiter);
        limiter.connect(ac.destination);
        this.music = new Audio();
        this.music.loop = true;
        this.music.preload = 'auto';
        this.musicGain = ac.createGain();
        this.musicGain.gain.value = 0;
        this.musicSource = ac.createMediaElementSource(this.music);
        this.musicSource.connect(this.musicGain);
        this.musicGain.connect(ac.destination);
        for (const file of SAMPLE_FILES) {
          void fetch('/audio/' + file + '.ogg', { signal: this.abort.signal })
            .then((r) => {
              if (!r.ok) throw new Error('Audio unavailable');
              return r.arrayBuffer();
            })
            .then((data) => ac.decodeAudioData(data))
            .then((buffer) => {
              if (!this.disposed) this.samples.set(file, buffer);
            })
            .catch(() => {
              /* A missing sound must never interrupt the match. */
            });
        }
      }
      void this.context.resume().catch(() => {});
      if (track !== this.track) {
        this.track = track;
        this.music!.src = '/audio/' + track + '.mp3';
      }
      // Prime playback in the actual Play click; pointer lock decides when it is audible.
      void this.music!.play().catch(() => {});
      this.settings = '';
    } catch {
      /* Audio is optional on browsers without Web Audio support. */
    }
  }
  update(active: boolean, effects: number, music: number, muted: boolean) {
    if (!this.context || !this.music) return;
    if (this.active !== active) {
      this.active = active;
      if (active) void this.music.play().catch(() => {});
      else this.music.pause();
    } else if (!active && !this.music.paused) this.music.pause();
    const key = [active, effects, music, muted].join(':');
    if (key === this.settings) return;
    this.settings = key;
    const t = this.context.currentTime;
    this.sfxGain!.gain.setTargetAtTime(muted ? 0 : effects, t, 0.025);
    this.musicGain!.gain.setTargetAtTime(
      muted || !active ? 0 : music * 0.65,
      t,
      0.25,
    );
  }
  play(type: Sound, weapon = 0) {
    const ac = this.context;
    if (!ac || ac.state !== 'running' || !this.sfxGain) return;
    const file =
      type === 'shot'
        ? ['pistol', 'shotgun', 'sniper', 'rifle'][weapon]
        : soundFile[type];
    const buffer = this.samples.get(file);
    if (!buffer) return;
    if (this.voices.length >= 24) this.voices.shift()?.stop();
    const source = ac.createBufferSource(),
      gain = ac.createGain();
    source.buffer = buffer;
    source.playbackRate.value = ['pickup', 'victory', 'kill'].includes(type)
      ? 1
      : 0.96 + Math.random() * 0.08;
    gain.gain.value =
      type === 'shot'
        ? 0.8
        : type === 'step'
          ? 0.12
          : type === 'jump'
            ? 0.16
            : type === 'hurt'
              ? 0.3
              : 0.5;
    source.connect(gain);
    gain.connect(this.sfxGain);
    this.voices.push(source);
    source.onended = () => {
      const i = this.voices.indexOf(source);
      if (i >= 0) this.voices.splice(i, 1);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    // Short dip makes hit and pickup cues easier to hear over the score.
    if (type === 'shot' || type === 'hurt') {
      const value = this.musicGain!.gain.value;
      this.musicGain!.gain.cancelScheduledValues(ac.currentTime);
      this.musicGain!.gain.setValueAtTime(value * 0.72, ac.currentTime);
      this.settings = '';
    }
  }
  stopMusic() {
    this.music?.pause();
    this.active = false;
    this.settings = '';
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.stopMusic();
    if (this.music) {
      this.music.removeAttribute('src');
      this.music.load();
    }
    this.voices.forEach((v) => {
      try {
        v.stop();
      } catch {}
    });
    this.voices = [];
    this.samples.clear();
    this.musicSource?.disconnect();
    void this.context?.close().catch(() => {});
  }
}
