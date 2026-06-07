const storageKeys = {
  background: "lofi-background",
  gif: "lofi-gif",
  gifType: "lofi-gif-type",
  gifMode: "lofi-gif-mode",
  gifSize: "lofi-gif-size",
  mixerRain: "lofi-mixer-rain",
  mixerCity: "lofi-mixer-city",
  mixerCoffee: "lofi-mixer-coffee",
  todos: "lofi-todos",
  lights: "lofi-lights",
  volume: "lofi-volume",
};

const tracks = [
  {
    type: "ambient",
    title: "Rain Window",
    subtitle: "soft keys / gentle rain",
    preset: "rain",
    durationMs: 62000,
  },
  {
    type: "ambient",
    title: "Midnight Tape",
    subtitle: "warm vinyl / mellow pulse",
    preset: "tape",
    durationMs: 74000,
  },
  {
    type: "ambient",
    title: "Moonlit Cafe",
    subtitle: "muted chords / soft room",
    preset: "cafe",
    durationMs: 68000,
  },
  {
    type: "ambient",
    title: "Study Lantern",
    subtitle: "quiet desk / warm pad",
    preset: "study",
    durationMs: 80000,
  },
  {
    type: "ambient",
    title: "Ocean Vinyl",
    subtitle: "soft waves / dusty keys",
    preset: "ocean",
    durationMs: 72000,
  },
  {
    type: "ambient",
    title: "Snow Desk",
    subtitle: "hushed room / slow bells",
    preset: "snow",
    durationMs: 66000,
  },
  {
    type: "ambient",
    title: "Forest Radio",
    subtitle: "low leaves / mellow tape",
    preset: "forest",
    durationMs: 70000,
  },
  {
    type: "ambient",
    title: "Dawn Library",
    subtitle: "early light / calm chords",
    preset: "dawn",
    durationMs: 76000,
  },
  {
    type: "ambient",
    title: "City Balcony",
    subtitle: "distant street / soft bass",
    preset: "city",
    durationMs: 64000,
  },
  {
    type: "ambient",
    title: "Fireplace Loop",
    subtitle: "warm crackle / slow keys",
    preset: "fireplace",
    durationMs: 78000,
  },
  {
    type: "ambient",
    title: "Night Bus",
    subtitle: "window hum / late ride",
    preset: "bus",
    durationMs: 69000,
  },
  {
    type: "ambient",
    title: "Cloudy Piano",
    subtitle: "misty pad / light notes",
    preset: "cloud",
    durationMs: 71000,
  },
];

const elements = {
  backgroundLayer: document.querySelector("#backgroundLayer"),
  clockTime: document.querySelector("#clockTime"),
  clockDate: document.querySelector("#clockDate"),
  settingsButton: document.querySelector("#settingsButton"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  panelBackdrop: document.querySelector("#panelBackdrop"),
  backgroundFile: document.querySelector("#backgroundFile"),
  backgroundUrl: document.querySelector("#backgroundUrl"),
  applyBackgroundUrl: document.querySelector("#applyBackgroundUrl"),
  resetBackgroundButton: document.querySelector("#resetBackgroundButton"),
  gifFile: document.querySelector("#gifFile"),
  gifUrl: document.querySelector("#gifUrl"),
  applyGifUrl: document.querySelector("#applyGifUrl"),
  gifImage: document.querySelector("#gifImage"),
  gifVideo: document.querySelector("#gifVideo"),
  gifStage: document.querySelector("#gifStage"),
  fallbackVisualizer: document.querySelector("#fallbackVisualizer"),
  gifSizeSlider: document.querySelector("#gifSizeSlider"),
  clearGifButton: document.querySelector("#clearGifButton"),
  audioPlayer: document.querySelector("#audioPlayer"),
  trackTitle: document.querySelector("#trackTitle"),
  trackSubtitle: document.querySelector("#trackSubtitle"),
  trackType: document.querySelector("#trackType"),
  prevButton: document.querySelector("#prevButton"),
  playButton: document.querySelector("#playButton"),
  nextButton: document.querySelector("#nextButton"),
  volumeSlider: document.querySelector("#volumeSlider"),
  mixerRain: document.querySelector("#mixerRain"),
  mixerCity: document.querySelector("#mixerCity"),
  mixerCoffee: document.querySelector("#mixerCoffee"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoList: document.querySelector("#todoList"),
  lampHotspot: document.querySelector("#lampHotspot"),
};

const state = {
  currentIndex: 0,
  isPlaying: false,
  activeAudioSrc: "",
  autoAdvanceTimer: 0,
  todos: [],
  lightsOn: localStorage.getItem(storageKeys.lights) !== "off",
  volume: Number(localStorage.getItem(storageKeys.volume)) || 0.62,
};

class AmbientEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseSource = null;
    this.noiseGain = null;
    this.intervalId = null;
    this.step = 0;
    this.preset = "rain";
    this.volume = 0.62;
    this.activeNodes = new Set();
  }

  async start(preset, volume) {
    this.stop();
    this.preset = preset;
    this.volume = volume;
    this.step = 0;
    this.context = this.context || new AudioContext();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.master = this.context.createGain();
    this.master.gain.value = volume * 0.74;
    this.master.connect(this.context.destination);

    this.startNoiseBed();
    this.scheduleStep();
    this.intervalId = window.setInterval(() => this.scheduleStep(), this.getPreset().intervalMs || 520);
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        /* Already stopped. */
      }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }

    for (const node of this.activeNodes) {
      try {
        node.stop();
      } catch {
        /* Node may already have ended. */
      }
      node.disconnect();
    }
    this.activeNodes.clear();

    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master) {
      this.master.gain.setTargetAtTime(volume * 0.74, this.context.currentTime, 0.03);
    }
  }

  startNoiseBed() {
    const duration = 2;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;

    const noiseSettings = {
      rain: { type: "lowpass", frequency: 920, q: 0.22, gain: 0.024 },
      tape: { type: "lowpass", frequency: 780, q: 0.4, gain: 0.035 },
      cafe: { type: "lowpass", frequency: 520, q: 0.5, gain: 0.028 },
      study: { type: "lowpass", frequency: 640, q: 0.35, gain: 0.018 },
      ocean: { type: "lowpass", frequency: 720, q: 0.18, gain: 0.038 },
      snow: { type: "lowpass", frequency: 440, q: 0.25, gain: 0.017 },
      forest: { type: "bandpass", frequency: 760, q: 0.32, gain: 0.026 },
      dawn: { type: "lowpass", frequency: 560, q: 0.28, gain: 0.016 },
      city: { type: "lowpass", frequency: 860, q: 0.3, gain: 0.03 },
      fireplace: { type: "bandpass", frequency: 980, q: 0.42, gain: 0.025 },
      bus: { type: "lowpass", frequency: 360, q: 0.2, gain: 0.04 },
      cloud: { type: "lowpass", frequency: 500, q: 0.24, gain: 0.018 },
    }[this.preset] || { type: "lowpass", frequency: 700, q: 0.3, gain: 0.024 };

    filter.type = noiseSettings.type;
    filter.frequency.value = noiseSettings.frequency;
    filter.Q.value = noiseSettings.q;
    gain.gain.value = noiseSettings.gain;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();

    this.noiseSource = source;
    this.noiseGain = gain;
  }

  scheduleStep() {
    if (!this.context || !this.master) {
      return;
    }

    const time = this.context.currentTime + 0.03;
    const preset = this.getPreset();
    const chordEvery = preset.chordEvery || 8;
    const chord = preset.chords[Math.floor(this.step / chordEvery) % preset.chords.length];

    if (this.step % chordEvery === 0) {
      chord.forEach((note, index) => {
        this.triggerTone(
          time + index * (preset.padSpread || 0.025),
          note,
          preset.padDuration || 2.9,
          preset.padGain,
          preset.padWave || "triangle",
          preset.padFilter || 1750,
        );
      });
    }

    if (preset.bass && this.step % (preset.bassEvery || chordEvery) === 0) {
      this.triggerTone(
        time,
        preset.bass[Math.floor(this.step / (preset.bassEvery || chordEvery)) % preset.bass.length],
        preset.bassDuration || 1.6,
        preset.bassGain || 0.08,
        preset.bassWave || "sine",
        preset.bassFilter || 900,
      );
    }

    if (this.step % preset.sparkleEvery === 0) {
      const note = preset.sparkles[(this.step / preset.sparkleEvery) % preset.sparkles.length];
      this.triggerTone(
        time + (preset.sparkleDelay || 0.08),
        note,
        preset.sparkleDuration || 0.72,
        preset.sparkleGain,
        preset.sparkleWave || "sine",
        preset.sparkleFilter || 2400,
      );
    }

    if (preset.plucks && this.step % preset.pluckEvery === 0) {
      const note = preset.plucks[(this.step / preset.pluckEvery) % preset.plucks.length];
      this.triggerTone(
        time + (preset.pluckDelay || 0.12),
        note,
        preset.pluckDuration || 0.42,
        preset.pluckGain || 0.026,
        preset.pluckWave || "triangle",
        preset.pluckFilter || 1800,
      );
    }

    if (preset.tap && this.step % (preset.tapEvery || 4) === (preset.tapOffset || 2)) {
      this.triggerTap(time, preset.tap);
    }

    this.step = (this.step + 1) % (preset.loopSteps || 64);
  }

  getPreset() {
    const note = (midi) => 440 * 2 ** ((midi - 69) / 12);
    const presets = {
      rain: {
        intervalMs: 560,
        chordEvery: 8,
        chords: [
          [note(52), note(59), note(64), note(67)],
          [note(48), note(55), note(60), note(64)],
          [note(50), note(57), note(62), note(65)],
          [note(47), note(55), note(59), note(62)],
        ],
        sparkles: [note(76), note(74), note(71), note(72)],
        sparkleEvery: 9,
        sparkleGain: 0.022,
        sparkleDuration: 0.9,
        padDuration: 3.4,
        padGain: 0.039,
        padWave: "triangle",
        padFilter: 1450,
      },
      tape: {
        intervalMs: 500,
        chordEvery: 8,
        chords: [
          [note(45), note(52), note(57), note(61)],
          [note(43), note(50), note(55), note(59)],
          [note(40), note(47), note(52), note(57)],
          [note(42), note(49), note(54), note(58)],
        ],
        bass: [note(33), note(31), note(28), note(30)],
        sparkles: [note(69), note(67), note(64), note(62)],
        sparkleEvery: 8,
        sparkleGain: 0.028,
        sparkleWave: "triangle",
        sparkleFilter: 1350,
        bassGain: 0.072,
        bassFilter: 640,
        padDuration: 2.5,
        padGain: 0.052,
        padWave: "sawtooth",
        padFilter: 980,
        tap: 0.022,
        tapEvery: 4,
      },
      cafe: {
        intervalMs: 470,
        chordEvery: 8,
        chords: [
          [note(50), note(57), note(62), note(66)],
          [note(53), note(60), note(64), note(69)],
          [note(48), note(55), note(60), note(64)],
          [note(55), note(62), note(65), note(69)],
        ],
        bass: [note(38), note(41), note(36), note(43)],
        sparkles: [note(74), note(76), note(72), note(71)],
        sparkleEvery: 5,
        sparkleGain: 0.032,
        sparkleDuration: 0.55,
        sparkleFilter: 2800,
        bassGain: 0.052,
        bassDuration: 1.25,
        padDuration: 2.2,
        padGain: 0.042,
        padWave: "triangle",
        plucks: [note(65), note(69), note(72), note(67)],
        pluckEvery: 11,
        pluckGain: 0.018,
      },
      study: {
        intervalMs: 610,
        chordEvery: 10,
        chords: [
          [note(48), note(55), note(60), note(64)],
          [note(45), note(52), note(57), note(60)],
          [note(50), note(57), note(62), note(65)],
          [note(43), note(50), note(55), note(59)],
        ],
        bass: [note(36), note(33), note(38), note(31)],
        sparkles: [note(72), note(76), note(74), note(71)],
        sparkleEvery: 7,
        sparkleGain: 0.024,
        sparkleDuration: 1,
        bassEvery: 20,
        bassGain: 0.04,
        bassDuration: 2.2,
        padDuration: 4.2,
        padGain: 0.04,
        padWave: "sine",
        padFilter: 1200,
      },
      ocean: {
        intervalMs: 640,
        chordEvery: 8,
        chords: [
          [note(43), note(50), note(55), note(59)],
          [note(47), note(54), note(59), note(62)],
          [note(45), note(52), note(57), note(60)],
          [note(48), note(55), note(60), note(64)],
        ],
        bass: [note(31), note(35), note(33), note(36)],
        sparkles: [note(67), note(71), note(74), note(72)],
        sparkleEvery: 8,
        sparkleGain: 0.022,
        sparkleDuration: 1.1,
        sparkleWave: "triangle",
        bassEvery: 16,
        bassGain: 0.052,
        bassDuration: 2.4,
        padDuration: 4,
        padGain: 0.046,
        padWave: "sine",
        padFilter: 1100,
      },
      snow: {
        intervalMs: 690,
        chordEvery: 12,
        chords: [
          [note(55), note(62), note(67), note(71)],
          [note(52), note(59), note(64), note(67)],
          [note(48), note(55), note(60), note(64)],
          [note(50), note(57), note(62), note(66)],
        ],
        sparkles: [note(79), note(76), note(74), note(72)],
        sparkleEvery: 10,
        sparkleGain: 0.02,
        sparkleDuration: 1.6,
        sparkleWave: "sine",
        sparkleFilter: 3400,
        padDuration: 4.8,
        padGain: 0.034,
        padWave: "sine",
        padFilter: 1500,
        plucks: [note(83), note(79), note(76), note(81)],
        pluckEvery: 24,
        pluckDuration: 0.9,
        pluckGain: 0.016,
      },
      forest: {
        intervalMs: 530,
        chordEvery: 8,
        chords: [
          [note(45), note(52), note(57), note(64)],
          [note(48), note(55), note(60), note(67)],
          [note(43), note(50), note(55), note(62)],
          [note(47), note(54), note(59), note(66)],
        ],
        bass: [note(33), note(36), note(31), note(35)],
        sparkles: [note(69), note(72), note(76), note(74)],
        sparkleEvery: 6,
        sparkleGain: 0.025,
        sparkleWave: "triangle",
        sparkleFilter: 2100,
        bassGain: 0.058,
        bassFilter: 760,
        padDuration: 2.8,
        padGain: 0.038,
        padWave: "triangle",
        padFilter: 1300,
        tap: 0.015,
        tapEvery: 6,
        tapOffset: 3,
      },
      dawn: {
        intervalMs: 580,
        chordEvery: 9,
        chords: [
          [note(53), note(60), note(65), note(69)],
          [note(50), note(57), note(62), note(67)],
          [note(48), note(55), note(60), note(64)],
          [note(55), note(62), note(67), note(72)],
        ],
        bass: [note(41), note(38), note(36), note(43)],
        sparkles: [note(77), note(76), note(72), note(74)],
        sparkleEvery: 9,
        sparkleGain: 0.026,
        sparkleDuration: 1.2,
        bassEvery: 18,
        bassGain: 0.044,
        bassDuration: 2.1,
        padDuration: 3.8,
        padGain: 0.036,
        padWave: "sine",
        padFilter: 1700,
        plucks: [note(72), note(74), note(77), note(81)],
        pluckEvery: 18,
        pluckGain: 0.019,
      },
      city: {
        intervalMs: 440,
        chordEvery: 8,
        chords: [
          [note(42), note(49), note(54), note(58)],
          [note(45), note(52), note(57), note(61)],
          [note(47), note(54), note(59), note(63)],
          [note(40), note(47), note(52), note(56)],
        ],
        bass: [note(30), note(33), note(35), note(28)],
        sparkles: [note(66), note(70), note(73), note(75)],
        sparkleEvery: 8,
        sparkleGain: 0.027,
        sparkleDuration: 0.5,
        bassGain: 0.076,
        bassDuration: 1.2,
        padDuration: 2.1,
        padGain: 0.049,
        padWave: "sawtooth",
        padFilter: 950,
        tap: 0.018,
        tapEvery: 4,
      },
      fireplace: {
        intervalMs: 540,
        chordEvery: 8,
        chords: [
          [note(47), note(54), note(59), note(64)],
          [note(50), note(57), note(62), note(66)],
          [note(45), note(52), note(57), note(61)],
          [note(43), note(50), note(55), note(59)],
        ],
        bass: [note(35), note(38), note(33), note(31)],
        sparkles: [note(71), note(74), note(76), note(69)],
        sparkleEvery: 7,
        sparkleGain: 0.023,
        sparkleDuration: 0.8,
        bassGain: 0.064,
        bassDuration: 1.7,
        padDuration: 3.2,
        padGain: 0.044,
        padWave: "triangle",
        padFilter: 1250,
        tap: 0.02,
        tapEvery: 5,
        tapOffset: 2,
      },
      bus: {
        intervalMs: 670,
        chordEvery: 12,
        chords: [
          [note(40), note(47), note(52), note(57)],
          [note(43), note(50), note(55), note(59)],
          [note(45), note(52), note(57), note(62)],
          [note(42), note(49), note(54), note(58)],
        ],
        bass: [note(28), note(31), note(33), note(30)],
        sparkles: [note(64), note(67), note(69), note(71)],
        sparkleEvery: 10,
        sparkleGain: 0.019,
        sparkleDuration: 1.4,
        bassEvery: 12,
        bassGain: 0.075,
        bassDuration: 2.8,
        bassFilter: 520,
        padDuration: 4.7,
        padGain: 0.052,
        padWave: "sine",
        padFilter: 780,
      },
      cloud: {
        intervalMs: 600,
        chordEvery: 10,
        chords: [
          [note(52), note(59), note(64), note(68)],
          [note(55), note(62), note(67), note(71)],
          [note(50), note(57), note(62), note(66)],
          [note(48), note(55), note(60), note(64)],
        ],
        sparkles: [note(76), note(79), note(81), note(74)],
        sparkleEvery: 6,
        sparkleGain: 0.021,
        sparkleDuration: 1.3,
        sparkleFilter: 3600,
        padDuration: 4.4,
        padGain: 0.035,
        padWave: "sine",
        padFilter: 1600,
        plucks: [note(84), note(81), note(79), note(76)],
        pluckEvery: 15,
        pluckGain: 0.014,
      },
    };

    return presets[this.preset] || presets.rain;
  }

  triggerTone(time, frequency, duration, gainValue, type, filterFrequency) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = filterFrequency || (type === "sine" ? 2400 : 1750);
    filter.Q.value = 0.45;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainValue, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.04);

    this.activeNodes.add(osc);
    osc.addEventListener("ended", () => {
      this.activeNodes.delete(osc);
      osc.disconnect();
    });
  }

  triggerTap(time, gainValue) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.04, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    source.buffer = buffer;
    gain.gain.value = gainValue;
    source.connect(gain);
    gain.connect(this.master);
    source.start(time);
    source.stop(time + 0.05);

    this.activeNodes.add(source);
    source.addEventListener("ended", () => {
      this.activeNodes.delete(source);
      source.disconnect();
    });
  }
}

class AmbientMixerEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.sources = {};
    this.gains = {};
    this.volumes = {
      rain: 0,
      city: 0,
      coffee: 0,
    };
    this.coffeeTimer = 0;
  }

  async ensure() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.context.destination);
      this.createRainLayer();
      this.createCityLayer();
      this.createCoffeeLayer();
      this.startCoffeeTaps();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async resumeIfActive() {
    if (Object.values(this.volumes).some((value) => value > 0.01)) {
      await this.ensure();
      Object.entries(this.volumes).forEach(([name, value]) => this.applyGain(name, value));
    }
  }

  silence() {
    if (!this.context) {
      return;
    }

    Object.keys(this.gains).forEach((name) => this.applyGain(name, 0));
  }

  setVolume(name, value, shouldStart = true) {
    const nextValue = Math.min(1, Math.max(0, Number(value) || 0));
    this.volumes[name] = nextValue;

    if (!shouldStart) {
      if (this.gains[name]) {
        this.applyGain(name, 0);
      }
      return;
    }

    if (shouldStart && nextValue > 0.01) {
      this.ensure().then(() => this.applyGain(name, nextValue));
      return;
    }

    if (this.gains[name]) {
      this.applyGain(name, nextValue);
    }
  }

  applyGain(name, value) {
    const gain = this.gains[name];

    if (!gain || !this.context) {
      return;
    }

    const scales = {
      rain: 0.16,
      city: 0.12,
      coffee: 0.1,
    };

    gain.gain.setTargetAtTime(value * scales[name], this.context.currentTime, 0.05);
  }

  createNoiseBuffer(duration = 2) {
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  createNoiseSource(name, filterType, frequency, q) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = this.createNoiseBuffer();
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();

    this.sources[name] = source;
    this.gains[name] = gain;
  }

  createRainLayer() {
    this.createNoiseSource("rain", "lowpass", 1150, 0.22);
  }

  createCityLayer() {
    const hum = this.context.createOscillator();
    const humGain = this.context.createGain();
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const mix = this.context.createGain();

    hum.type = "sine";
    hum.frequency.value = 58;
    humGain.gain.value = 0.22;

    noise.buffer = this.createNoiseBuffer();
    noise.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 340;
    filter.Q.value = 0.18;
    mix.gain.value = 0;

    hum.connect(humGain);
    humGain.connect(mix);
    noise.connect(filter);
    filter.connect(mix);
    mix.connect(this.master);
    hum.start();
    noise.start();

    this.sources.city = [hum, noise];
    this.gains.city = mix;
  }

  createCoffeeLayer() {
    this.createNoiseSource("coffee", "bandpass", 760, 0.55);
  }

  startCoffeeTaps() {
    if (this.coffeeTimer) {
      window.clearInterval(this.coffeeTimer);
    }

    this.coffeeTimer = window.setInterval(() => {
      if (!this.context || this.volumes.coffee < 0.05) {
        return;
      }

      if (Math.random() > 0.45) {
        return;
      }

      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.035, this.context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }

      source.buffer = buffer;
      gain.gain.value = this.volumes.coffee * 0.035;
      source.connect(gain);
      gain.connect(this.master);
      source.start();
      source.stop(this.context.currentTime + 0.04);
    }, 900);
  }
}

const ambientEngine = new AmbientEngine();
const ambientMixer = new AmbientMixerEngine();

function updateClock() {
  const now = new Date();
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  elements.clockTime.textContent = `${hours}:${minutes}`;
  elements.clockDate.textContent = `${year}년 ${month}월 ${date}일 ${weekdays[now.getDay()]}`;
}

function openSettings() {
  elements.settingsPanel.classList.add("open");
  elements.settingsPanel.setAttribute("aria-hidden", "false");
  elements.panelBackdrop.hidden = false;
}

function closeSettings() {
  elements.settingsPanel.classList.remove("open");
  elements.settingsPanel.setAttribute("aria-hidden", "true");
  elements.panelBackdrop.hidden = true;
}

function safeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    localStorage.removeItem(key);
  }
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("lofi-widget-media", 1);

    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore("media");
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function putWidgetMediaFile(file) {
  const db = await openMediaDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");
    const store = transaction.objectStore("media");
    store.put(
      {
        blob: file,
        type: file.type,
        name: file.name,
        updatedAt: Date.now(),
      },
      "widget",
    );
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

async function getWidgetMediaFile() {
  const db = await openMediaDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("media", "readonly");
    const request = transaction.objectStore("media").get("widget");
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function deleteWidgetMediaFile() {
  const db = await openMediaDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");
    transaction.objectStore("media").delete("widget");
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

function parseStoredTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeys.todos) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item.text === "string") : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  safeStore(storageKeys.todos, JSON.stringify(state.todos));
}

function renderTodos() {
  elements.todoList.innerHTML = "";

  state.todos.forEach((todo) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    const button = document.createElement("button");

    item.className = "todo-item";
    text.textContent = todo.text;
    button.className = "todo-check";
    button.type = "button";
    button.textContent = "✓";
    button.setAttribute("aria-label", `${todo.text} complete`);
    button.addEventListener("click", () => {
      state.todos = state.todos.filter((entry) => entry.id !== todo.id);
      saveTodos();
      renderTodos();
    });

    item.append(text, button);
    elements.todoList.append(item);
  });
}

function addTodo(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  state.todos.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: trimmed,
  });
  saveTodos();
  renderTodos();
  elements.todoInput.value = "";
}

function setMixerVolume(name, value, shouldStart = true) {
  const storageMap = {
    rain: storageKeys.mixerRain,
    city: storageKeys.mixerCity,
    coffee: storageKeys.mixerCoffee,
  };
  const sliderMap = {
    rain: elements.mixerRain,
    city: elements.mixerCity,
    coffee: elements.mixerCoffee,
  };
  const nextValue = Math.min(1, Math.max(0, Number(value) || 0));

  sliderMap[name].value = String(nextValue);
  ambientMixer.setVolume(name, nextValue, shouldStart && state.isPlaying);
  safeStore(storageMap[name], String(nextValue));
}

function hydrateMixer() {
  setMixerVolume("rain", localStorage.getItem(storageKeys.mixerRain) ?? elements.mixerRain.value, false);
  setMixerVolume("city", localStorage.getItem(storageKeys.mixerCity) ?? elements.mixerCity.value, false);
  setMixerVolume("coffee", localStorage.getItem(storageKeys.mixerCoffee) ?? elements.mixerCoffee.value, false);
}

function applyLightState(lightsOn, persist = true) {
  state.lightsOn = lightsOn;
  document.body.classList.toggle("lights-off", !lightsOn);
  elements.lampHotspot.setAttribute("aria-pressed", String(lightsOn));

  if (persist) {
    safeStore(storageKeys.lights, lightsOn ? "on" : "off");
  }
}

function applyBackground(source, persist = true) {
  elements.backgroundLayer.style.backgroundImage = `url("${source}")`;
  if (persist) {
    safeStore(storageKeys.background, source);
  }
}

function resetBackground() {
  elements.backgroundLayer.style.backgroundImage = "";
  localStorage.removeItem(storageKeys.background);
  elements.backgroundUrl.value = "";
}

function isVideoSource(source, mediaType = "") {
  if (mediaType === "video" || mediaType.startsWith("video/") || source.startsWith("data:video/")) {
    return true;
  }

  try {
    const pathname = new URL(source, window.location.href).pathname.toLowerCase();
    return /\.(mp4|webm|ogv|ogg|mov|m4v)$/.test(pathname);
  } catch {
    return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i.test(source);
  }
}

function applyGif(source, persist = true, mediaType = "") {
  const isVideo = isVideoSource(source, mediaType);

  if (isVideo) {
    elements.gifImage.removeAttribute("src");
    elements.gifImage.hidden = true;
    elements.gifVideo.src = source;
    elements.gifVideo.hidden = false;
    elements.gifVideo.load();
    elements.gifVideo.play().catch(() => {
      /* Autoplay can fail for some remote video sources. */
    });
  } else {
    elements.gifVideo.pause();
    elements.gifVideo.removeAttribute("src");
    elements.gifVideo.hidden = true;
    elements.gifImage.src = source;
    elements.gifImage.hidden = false;
  }

  elements.fallbackVisualizer.hidden = true;

  if (persist) {
    safeStore(storageKeys.gif, source);
    safeStore(storageKeys.gifType, isVideo ? "video" : "image");
    safeStore(storageKeys.gifMode, "url");
  }
}

function clearGif() {
  elements.gifImage.removeAttribute("src");
  elements.gifImage.hidden = true;
  elements.gifVideo.pause();
  elements.gifVideo.removeAttribute("src");
  elements.gifVideo.hidden = true;
  elements.fallbackVisualizer.hidden = false;
  localStorage.removeItem(storageKeys.gif);
  localStorage.removeItem(storageKeys.gifType);
  localStorage.removeItem(storageKeys.gifMode);
  deleteWidgetMediaFile().catch(() => {});
  elements.gifUrl.value = "";
}

function readImageInput(file, callback) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result));
  reader.readAsDataURL(file);
}

function readWidgetMediaInput(file, callback) {
  if (!file) {
    return;
  }

  if (file.type.startsWith("video/")) {
    callback(URL.createObjectURL(file), file.type, false);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result, file.type, true));
  reader.readAsDataURL(file);
}

async function applyWidgetMediaFile(file) {
  if (!file) {
    return;
  }

  const source = URL.createObjectURL(file);
  applyGif(source, false, file.type);
  elements.gifUrl.value = "";
  safeStore(storageKeys.gif, file.name || "local media");
  safeStore(storageKeys.gifType, file.type.startsWith("video/") ? "video" : "image");
  safeStore(storageKeys.gifMode, "file");

  try {
    await putWidgetMediaFile(file);
  } catch {
    if (!file.type.startsWith("video/")) {
      readWidgetMediaInput(file, (dataUrl, mediaType) => applyGif(dataUrl, true, mediaType));
    }
  }
}

function renderTracks() {
  updateTrackDisplay();
}

function updateTrackDisplay() {
  const track = tracks[state.currentIndex];
  elements.trackTitle.textContent = track.title;
  elements.trackSubtitle.textContent = track.subtitle;
  elements.trackType.textContent = track.type === "ambient" ? "Ambient" : "Audio";
  elements.playButton.classList.toggle("is-playing", state.isPlaying);
  elements.playButton.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
  elements.playButton.title = state.isPlaying ? "Pause" : "Play";

}

function updateVolume(value) {
  state.volume = Math.min(1, Math.max(0, Number(value)));
  elements.volumeSlider.value = String(state.volume);
  elements.audioPlayer.volume = state.volume;
  ambientEngine.setVolume(state.volume);
  safeStore(storageKeys.volume, String(state.volume));
}

function clearAutoAdvance() {
  if (state.autoAdvanceTimer) {
    window.clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = 0;
  }
}

function scheduleAutoAdvance(track) {
  clearAutoAdvance();

  if (!track.durationMs) {
    return;
  }

  state.autoAdvanceTimer = window.setTimeout(() => {
    if (state.isPlaying && tracks[state.currentIndex] === track) {
      nextTrack();
    }
  }, track.durationMs);
}

async function playCurrentTrack() {
  const track = tracks[state.currentIndex];
  state.isPlaying = true;
  clearAutoAdvance();
  elements.audioPlayer.volume = state.volume;

  if (track.type === "ambient") {
    elements.audioPlayer.pause();
    elements.audioPlayer.removeAttribute("src");
    state.activeAudioSrc = "";
    await ambientEngine.start(track.preset, state.volume);
    await ambientMixer.resumeIfActive();
  } else {
    ambientEngine.stop();
    if (state.activeAudioSrc !== track.src) {
      elements.audioPlayer.src = track.src;
      state.activeAudioSrc = track.src;
    }
    await elements.audioPlayer.play();
  }

  updateTrackDisplay();
  scheduleAutoAdvance(track);
}

function pausePlayback() {
  state.isPlaying = false;
  clearAutoAdvance();
  ambientEngine.stop();
  ambientMixer.silence();
  elements.audioPlayer.pause();
  updateTrackDisplay();
}

async function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
    return;
  }

  try {
    await playCurrentTrack();
  } catch {
    state.isPlaying = false;
    clearAutoAdvance();
    ambientMixer.silence();
    updateTrackDisplay();
  }
}

async function selectTrack(index, shouldPlay) {
  clearAutoAdvance();
  state.currentIndex = index;
  ambientEngine.stop();
  if (!shouldPlay) {
    ambientMixer.silence();
  }
  elements.audioPlayer.pause();
  updateTrackDisplay();

  if (shouldPlay) {
    await playCurrentTrack();
  }
}

async function nextTrack() {
  const shouldPlay = state.isPlaying;
  state.currentIndex = (state.currentIndex + 1) % tracks.length;
  await selectTrack(state.currentIndex, shouldPlay);
}

async function prevTrack() {
  const shouldPlay = state.isPlaying;
  state.currentIndex = (state.currentIndex - 1 + tracks.length) % tracks.length;
  await selectTrack(state.currentIndex, shouldPlay);
}

function setGifSize(value) {
  const clamped = Math.min(340, Math.max(160, Number(value) || 260));
  document.documentElement.style.setProperty("--gif-height", `${clamped}px`);
  elements.gifSizeSlider.value = String(clamped);
  safeStore(storageKeys.gifSize, String(clamped));
}

async function hydrateSettings() {
  const savedBackground = localStorage.getItem(storageKeys.background);
  const savedGif = localStorage.getItem(storageKeys.gif);
  const savedGifType = localStorage.getItem(storageKeys.gifType) || "";
  const savedGifMode = localStorage.getItem(storageKeys.gifMode) || "";
  const savedGifSize = localStorage.getItem(storageKeys.gifSize);

  if (savedBackground) {
    applyBackground(savedBackground, false);
    elements.backgroundUrl.value = savedBackground.startsWith("data:") ? "" : savedBackground;
  }

  if (savedGifMode === "file") {
    try {
      const record = await getWidgetMediaFile();
      if (record?.blob) {
        applyGif(URL.createObjectURL(record.blob), false, record.type || savedGifType);
      }
    } catch {
      localStorage.removeItem(storageKeys.gifMode);
    }
  } else if (savedGif) {
    applyGif(savedGif, false, savedGifType);
    elements.gifUrl.value = savedGif.startsWith("data:") ? "" : savedGif;
  }

  if (savedGifSize) {
    elements.gifSizeSlider.value = savedGifSize;
    setGifSize(savedGifSize);
  }

  elements.volumeSlider.value = String(state.volume);
  elements.audioPlayer.volume = state.volume;
  state.todos = parseStoredTodos();
  renderTodos();
  hydrateMixer();
  applyLightState(state.lightsOn, false);
}

elements.settingsButton.addEventListener("click", openSettings);
elements.closeSettingsButton.addEventListener("click", closeSettings);
elements.panelBackdrop.addEventListener("click", closeSettings);

elements.lampHotspot.addEventListener("click", () => {
  applyLightState(!state.lightsOn);
});

elements.todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(elements.todoInput.value);
});

elements.mixerRain.addEventListener("input", (event) => {
  setMixerVolume("rain", event.target.value);
});

elements.mixerCity.addEventListener("input", (event) => {
  setMixerVolume("city", event.target.value);
});

elements.mixerCoffee.addEventListener("input", (event) => {
  setMixerVolume("coffee", event.target.value);
});

document.addEventListener("keydown", (event) => {
  const isInteractiveTarget = event.target.closest?.("button, input, textarea, select, label, [contenteditable='true']");

  if (event.key === "Escape") {
    closeSettings();
    return;
  }

  if (isInteractiveTarget || elements.settingsPanel.classList.contains("open")) {
    return;
  }

  if (event.key === " " || event.key === "Spacebar") {
    event.preventDefault();
    togglePlayback();
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    nextTrack();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    prevTrack();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    updateVolume(state.volume + 0.05);
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    updateVolume(state.volume - 0.05);
  }
});

elements.backgroundFile.addEventListener("change", (event) => {
  readImageInput(event.target.files[0], (source) => applyBackground(source));
});

elements.applyBackgroundUrl.addEventListener("click", () => {
  if (elements.backgroundUrl.value.trim()) {
    applyBackground(elements.backgroundUrl.value.trim());
  }
});

elements.resetBackgroundButton.addEventListener("click", resetBackground);

elements.gifFile.addEventListener("change", (event) => {
  applyWidgetMediaFile(event.target.files[0]);
});

elements.applyGifUrl.addEventListener("click", () => {
  if (elements.gifUrl.value.trim()) {
    deleteWidgetMediaFile().catch(() => {});
    applyGif(elements.gifUrl.value.trim());
  }
});

elements.gifSizeSlider.addEventListener("input", (event) => setGifSize(event.target.value));
elements.clearGifButton.addEventListener("click", clearGif);

elements.volumeSlider.addEventListener("input", (event) => updateVolume(event.target.value));

elements.playButton.addEventListener("click", togglePlayback);
elements.nextButton.addEventListener("click", nextTrack);
elements.prevButton.addEventListener("click", prevTrack);
elements.audioPlayer.addEventListener("ended", nextTrack);

hydrateSettings().catch(() => {});
renderTracks();
updateClock();
window.setInterval(updateClock, 1000);
