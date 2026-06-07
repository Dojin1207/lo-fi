const tracks = [
  {
    name: "Window Seat",
    mood: "mellow keys",
    root: 196.0,
    progression: [0, 7, 3, 10],
    color: "#f3a95f"
  },
  {
    name: "Sleepless Tape",
    mood: "dusty chords",
    root: 174.61,
    progression: [0, 5, 8, 3],
    color: "#d98fa4"
  },
  {
    name: "Afterglow Station",
    mood: "soft bass",
    root: 220.0,
    progression: [0, 4, 9, 7],
    color: "#77c7b9"
  },
  {
    name: "Cafe Static",
    mood: "rainy swing",
    root: 164.81,
    progression: [0, 3, 7, 12],
    color: "#f3cf74"
  }
];

const state = {
  audio: null,
  isPlaying: false,
  currentTrack: 0,
  chordStep: 0,
  chordTimer: null,
  animationId: null,
  timerDuration: 25 * 60,
  timerLeft: 25 * 60,
  timerRunning: false,
  timerId: null
};

const els = {
  playToggle: document.querySelector("#playToggle"),
  prevTrack: document.querySelector("#prevTrack"),
  nextTrack: document.querySelector("#nextTrack"),
  shuffleTracks: document.querySelector("#shuffleTracks"),
  themeToggle: document.querySelector("#themeToggle"),
  trackName: document.querySelector("#trackName"),
  trackMood: document.querySelector("#trackMood"),
  trackList: document.querySelector("#trackList"),
  rainLevel: document.querySelector("#rainLevel"),
  vinylLevel: document.querySelector("#vinylLevel"),
  keysLevel: document.querySelector("#keysLevel"),
  visualizer: document.querySelector("#visualizer"),
  timerToggle: document.querySelector("#timerToggle"),
  focusTitle: document.querySelector("#focus-title"),
  sessionLabel: document.querySelector("#sessionLabel"),
  ringProgress: document.querySelector("#ringProgress"),
  notePad: document.querySelector("#notePad"),
  clearNotes: document.querySelector("#clearNotes"),
  timerButtons: document.querySelectorAll(".segmented button")
};

function setButtonIcon(button, name) {
  const span = button.querySelector("span");
  span.className = `icon-${name}`;
}

function semitone(base, offset) {
  return base * Math.pow(2, offset / 12);
}

function makeNoiseBuffer(context, seconds) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createAudioGraph() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const master = context.createGain();
  const keysGain = context.createGain();
  const rainGain = context.createGain();
  const vinylGain = context.createGain();
  const analyser = context.createAnalyser();

  master.gain.value = 0.72;
  analyser.fftSize = 256;
  keysGain.gain.value = Number(els.keysLevel.value) / 100;
  rainGain.gain.value = Number(els.rainLevel.value) / 100 * 0.24;
  vinylGain.gain.value = Number(els.vinylLevel.value) / 100 * 0.16;

  keysGain.connect(master);
  rainGain.connect(master);
  vinylGain.connect(master);
  master.connect(analyser);
  analyser.connect(context.destination);

  const rain = context.createBufferSource();
  rain.buffer = makeNoiseBuffer(context, 3);
  rain.loop = true;
  const rainFilter = context.createBiquadFilter();
  rainFilter.type = "bandpass";
  rainFilter.frequency.value = 980;
  rainFilter.Q.value = 0.7;
  rain.connect(rainFilter);
  rainFilter.connect(rainGain);
  rain.start();

  const vinyl = context.createBufferSource();
  vinyl.buffer = makeNoiseBuffer(context, 2);
  vinyl.loop = true;
  const vinylFilter = context.createBiquadFilter();
  vinylFilter.type = "highpass";
  vinylFilter.frequency.value = 1800;
  vinyl.connect(vinylFilter);
  vinylFilter.connect(vinylGain);
  vinyl.start();

  state.audio = {
    context,
    master,
    keysGain,
    rainGain,
    vinylGain,
    analyser,
    activeNodes: []
  };
}

function stopActiveChord() {
  if (!state.audio) return;
  const now = state.audio.context.currentTime;
  state.audio.activeNodes.forEach(({ gain, osc }) => {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.12);
    osc.stop(now + 0.5);
  });
  state.audio.activeNodes = [];
}

function playChord() {
  if (!state.audio || !state.isPlaying) return;
  stopActiveChord();

  const { context, keysGain } = state.audio;
  const track = tracks[state.currentTrack];
  const offset = track.progression[state.chordStep % track.progression.length];
  const now = context.currentTime;
  const notes = [0, 3, 7, 12].map((interval) => semitone(track.root, offset + interval));

  notes.forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
    filter.type = "lowpass";
    filter.frequency.value = 840 + index * 140;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(index === 0 ? 0.12 : 0.075, now + 0.18);
    gain.gain.setTargetAtTime(0.015, now + 1.4, 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(keysGain);
    osc.start(now);
    state.audio.activeNodes.push({ osc, gain });
  });

  state.chordStep += 1;
}

function startAudio() {
  if (!state.audio) createAudioGraph();
  state.audio.context.resume();
  state.isPlaying = true;
  setButtonIcon(els.playToggle, "pause");
  els.playToggle.title = "Pause";
  els.playToggle.setAttribute("aria-label", "Pause");
  playChord();
  state.chordTimer = window.setInterval(playChord, 2400);
  drawVisualizer();
}

function stopAudio() {
  state.isPlaying = false;
  window.clearInterval(state.chordTimer);
  state.chordTimer = null;
  stopActiveChord();
  setButtonIcon(els.playToggle, "play");
  els.playToggle.title = "Play";
  els.playToggle.setAttribute("aria-label", "Play");
  window.cancelAnimationFrame(state.animationId);
  drawIdleVisualizer();
}

function setTrack(index) {
  state.currentTrack = (index + tracks.length) % tracks.length;
  state.chordStep = 0;
  const track = tracks[state.currentTrack];
  els.trackName.textContent = track.name;
  els.trackMood.textContent = track.mood;
  document.documentElement.style.setProperty("--accent", track.color);
  renderTrackList();
  if (state.isPlaying) playChord();
}

function renderTrackList() {
  els.trackList.innerHTML = "";
  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    item.className = index === state.currentTrack ? "active" : "";
    item.innerHTML = `
      <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
      <span>
        <span class="track-title">${track.name}</span>
        <span class="track-subtitle">${track.mood}</span>
      </span>
    `;
    item.addEventListener("click", () => setTrack(index));
    els.trackList.append(item);
  });
}

function drawIdleVisualizer() {
  const canvas = els.visualizer;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim();
  ctx.globalAlpha = 0.48;
  ctx.beginPath();
  for (let x = 0; x < width; x += 12) {
    const y = height * 0.52 + Math.sin(x * 0.018) * 10 + Math.sin(x * 0.057) * 4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawVisualizer() {
  if (!state.audio || !state.isPlaying) return;
  const canvas = els.visualizer;
  const ctx = canvas.getContext("2d");
  const analyser = state.audio.analyser;
  const data = new Uint8Array(analyser.frequencyBinCount);
  const width = canvas.width;
  const height = canvas.height;
  const styles = getComputedStyle(document.documentElement);

  analyser.getByteFrequencyData(data);
  ctx.clearRect(0, 0, width, height);

  const bars = 46;
  const gap = 5;
  const barWidth = (width - gap * (bars - 1)) / bars;
  for (let i = 0; i < bars; i += 1) {
    const value = data[i + 3] / 255;
    const barHeight = Math.max(8, value * height * 0.72 + Math.sin(Date.now() * 0.002 + i) * 6);
    const x = i * (barWidth + gap);
    const y = height - barHeight - 18;
    ctx.fillStyle = i % 3 === 0
      ? styles.getPropertyValue("--accent").trim()
      : styles.getPropertyValue("--accent-2").trim();
    ctx.globalAlpha = 0.42 + value * 0.5;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
  ctx.globalAlpha = 1;
  state.animationId = window.requestAnimationFrame(drawVisualizer);
}

function updateMixer() {
  if (!state.audio) return;
  const now = state.audio.context.currentTime;
  state.audio.rainGain.gain.setTargetAtTime(Number(els.rainLevel.value) / 100 * 0.24, now, 0.08);
  state.audio.vinylGain.gain.setTargetAtTime(Number(els.vinylLevel.value) / 100 * 0.16, now, 0.08);
  state.audio.keysGain.gain.setTargetAtTime(Number(els.keysLevel.value) / 100, now, 0.08);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimerView() {
  els.focusTitle.textContent = formatTime(state.timerLeft);
  const progress = 1 - state.timerLeft / state.timerDuration;
  const circumference = 326.73;
  els.ringProgress.style.strokeDashoffset = String(circumference * progress);
  els.sessionLabel.textContent = state.timerRunning ? "in session" : "deep work";
}

function startTimer() {
  state.timerRunning = true;
  setButtonIcon(els.timerToggle, "pause");
  els.timerToggle.title = "Pause focus";
  els.timerToggle.setAttribute("aria-label", "Pause focus");
  state.timerId = window.setInterval(() => {
    state.timerLeft = Math.max(0, state.timerLeft - 1);
    updateTimerView();
    if (state.timerLeft === 0) pauseTimer();
  }, 1000);
}

function pauseTimer() {
  state.timerRunning = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  setButtonIcon(els.timerToggle, "play");
  els.timerToggle.title = "Start focus";
  els.timerToggle.setAttribute("aria-label", "Start focus");
  updateTimerView();
}

function setTimerMinutes(minutes) {
  pauseTimer();
  state.timerDuration = minutes * 60;
  state.timerLeft = state.timerDuration;
  els.timerButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.minutes) === minutes);
  });
  updateTimerView();
}

function loadNotes() {
  els.notePad.value = window.localStorage.getItem("rainy-desk-notes") || "";
}

function saveNotes() {
  window.localStorage.setItem("rainy-desk-notes", els.notePad.value);
}

els.playToggle.addEventListener("click", () => {
  if (state.isPlaying) stopAudio();
  else startAudio();
});

els.prevTrack.addEventListener("click", () => setTrack(state.currentTrack - 1));
els.nextTrack.addEventListener("click", () => setTrack(state.currentTrack + 1));
els.shuffleTracks.addEventListener("click", () => {
  let next = Math.floor(Math.random() * tracks.length);
  if (next === state.currentTrack) next = (next + 1) % tracks.length;
  setTrack(next);
});

els.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  drawIdleVisualizer();
});

[els.rainLevel, els.vinylLevel, els.keysLevel].forEach((input) => {
  input.addEventListener("input", updateMixer);
});

els.timerToggle.addEventListener("click", () => {
  if (state.timerRunning) pauseTimer();
  else startTimer();
});

els.timerButtons.forEach((button) => {
  button.addEventListener("click", () => setTimerMinutes(Number(button.dataset.minutes)));
});

els.notePad.addEventListener("input", saveNotes);
els.clearNotes.addEventListener("click", () => {
  els.notePad.value = "";
  saveNotes();
});

renderTrackList();
loadNotes();
updateTimerView();
drawIdleVisualizer();
