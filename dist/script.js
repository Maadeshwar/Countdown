(() => {
  'use strict';

  const launchAt = Date.parse('2026-10-30T00:00:00+05:30');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const title = document.querySelector('[data-title]');
  let audioContext = null;
  let masterGain = null;
  let soundActive = false;
  let nextBeatAt = 0;
  let beatNumber = 0;
  let schedulerId = null;

  function setTime(unit, value) {
    const field = document.querySelector(`[data-${unit}]`);
    if (field) field.textContent = String(value).padStart(2, '0');
  }

  function updateCountdown() {
    const now = Date.now();
    const remaining = Math.max(0, launchAt - now);
    const day = 24 * 60 * 60 * 1000;
    const hour = 60 * 60 * 1000;
    const minute = 60 * 1000;

    setTime('days', Math.floor(remaining / day));
    setTime('hours', Math.floor((remaining % day) / hour));
    setTime('minutes', Math.floor((remaining % hour) / minute));
    setTime('seconds', Math.floor((remaining % minute) / 1000));

    if (now >= launchAt) {
      if (title) title.textContent = 'Something is Here';
      stopSound();
      return;
    }

    window.setTimeout(updateCountdown, 1000 - (now % 1000));
  }

  function playBeat(when, isTock) {
    if (!audioContext || !masterGain || audioContext.state !== 'running') return;

    const duration = 0.055;
    const frameCount = Math.ceil(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const seconds = index / audioContext.sampleRate;
      const attack = Math.min(1, seconds / 0.0012);
      samples[index] = (Math.random() * 2 - 1) * attack * Math.exp(-seconds * (isTock ? 78 : 92));
    }

    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isTock ? 1120 : 1580, when);
    filter.Q.setValueAtTime(0.9, when);
    noiseGain.gain.setValueAtTime(0.0001, when);
    noiseGain.gain.linearRampToValueAtTime(0.29, when + 0.0015);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(when);
    noise.stop(when + duration);

    const body = audioContext.createOscillator();
    const bodyGain = audioContext.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(isTock ? 910 : 1240, when);
    body.frequency.exponentialRampToValueAtTime(isTock ? 700 : 880, when + 0.035);
    bodyGain.gain.setValueAtTime(0.0001, when);
    bodyGain.gain.linearRampToValueAtTime(0.075, when + 0.001);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    body.connect(bodyGain);
    bodyGain.connect(masterGain);
    body.start(when);
    body.stop(when + 0.047);
  }

  function scheduleBeats() {
    if (!audioContext || audioContext.state !== 'running' || !soundActive) return;
    const horizon = audioContext.currentTime + 0.12;
    while (nextBeatAt < horizon) {
      playBeat(nextBeatAt, beatNumber % 2 === 1);
      nextBeatAt += 1;
      beatNumber += 1;
    }
  }

  function startScheduler() {
    if (soundActive || !audioContext || audioContext.state !== 'running') return;
    soundActive = true;
    nextBeatAt = audioContext.currentTime + 0.08;
    beatNumber = 0;
    scheduleBeats();
    schedulerId = window.setInterval(scheduleBeats, 25);
    window.removeEventListener('pointerdown', tryStartSound);
    window.removeEventListener('keydown', tryStartSound);
  }

  async function tryStartSound() {
    if (!AudioContextClass || Date.now() >= launchAt || soundActive) return;
    try {
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextClass();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.2;
        masterGain.connect(audioContext.destination);
      }
      if (audioContext.state !== 'running') await audioContext.resume();
      startScheduler();
    } catch {
      // Autoplay may remain suspended until the visitor interacts with the page.
    }
  }

  function stopSound() {
    window.removeEventListener('pointerdown', tryStartSound);
    window.removeEventListener('keydown', tryStartSound);
    window.clearInterval(schedulerId);
    schedulerId = null;
    soundActive = false;
    if (audioContext && audioContext.state !== 'closed') {
      const contextToClose = audioContext;
      audioContext = null;
      masterGain = null;
      void contextToClose.close().catch(() => {});
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!audioContext || !soundActive) return;
    if (document.hidden) {
      window.clearInterval(schedulerId);
      schedulerId = null;
      void audioContext.suspend().catch(() => {});
    } else {
      void audioContext.resume().then(() => {
        if (!soundActive || !audioContext) return;
        nextBeatAt = audioContext.currentTime + 0.1;
        scheduleBeats();
        schedulerId = window.setInterval(scheduleBeats, 25);
      }).catch(() => stopSound());
    }
  });

  if (AudioContextClass && Date.now() < launchAt) {
    window.addEventListener('pointerdown', tryStartSound);
    window.addEventListener('keydown', tryStartSound);
    void tryStartSound();
  }
  updateCountdown();
})();
