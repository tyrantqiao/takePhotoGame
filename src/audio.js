const DEFAULTS = { muted: false, ambient: .28, effects: .65 };
export function audioPreferences(value = {}) {
  const level = (key) => typeof value?.[key] === 'number' && Number.isFinite(value[key]) ? Math.max(0, Math.min(1, value[key])) : DEFAULTS[key];
  return { muted: value?.muted === true, ambient: level('ambient'), effects: level('effects') };
}

// Original, locally synthesized soundscapes. No recordings or external audio requests.
export function createAudio() {
  let prefs;try { prefs = audioPreferences(JSON.parse(localStorage.getItem('wildframe-audio'))); } catch { prefs = audioPreferences(); }
  let context, master, ambience, effects, wind, tone, noise, timer;
  let location = 'kyoto', paused = false, unavailable = false;
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn({ ...prefs, status: unavailable ? '当前浏览器不支持音频' : !context ? '点击开始游戏后启用声音' : context.state === 'running' ? '声音已就绪' : '声音已挂起，点击游戏可恢复' }));
  function gains() {
    if (!context) return;
    const at = context.currentTime;
    master.gain.setTargetAtTime(prefs.muted || document.hidden ? 0 : .6, at, .08);
    ambience.gain.setTargetAtTime(prefs.ambient * (paused ? .18 : 1), at, .3);
    effects.gain.setTargetAtTime(prefs.effects, at, .03);
  }
  function note(frequency, at, duration = .15, volume = .15, dest = effects) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine';oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(.001, at);gain.gain.exponentialRampToValueAtTime(volume, at + .012);gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    oscillator.connect(gain).connect(dest);oscillator.start(at);oscillator.stop(at + duration + .02);
    oscillator.onended = () => { oscillator.disconnect();gain.disconnect(); };
  }
  function burst(at, duration, frequency, volume) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise;filter.type = 'highpass';filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    source.connect(filter).connect(gain).connect(effects);source.start(at);source.stop(at + duration);
    source.onended = () => { source.disconnect();filter.disconnect();gain.disconnect(); };
  }
  function soundscape() {
    if (!context) return;
    wind.frequency.setTargetAtTime(location === 'santorini' ? 600 : location === 'paris' ? 180 : 1000, context.currentTime, .8);
    tone.frequency.setTargetAtTime(location === 'santorini' ? .12 : .07, context.currentTime, .8);
  }
  async function unlock() {
    if (unavailable) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { unavailable = true;emit();return; }
        context = new Audio();master = context.createGain();ambience = context.createGain();effects = context.createGain();
        master.connect(context.destination);ambience.connect(master);effects.connect(master);
        noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        const samples = noise.getChannelData(0);let last = 0;
        for (let i = 0; i < samples.length; i++) { last = (last + (Math.random() * 2 - 1) * .04) / 1.04;samples[i] = last * 4; }
        const source = context.createBufferSource();source.buffer = noise;source.loop = true;
        wind = context.createBiquadFilter();wind.type = 'lowpass';
        const swell = context.createGain();swell.gain.value = .22;
        tone = context.createOscillator();const modulation = context.createGain();modulation.gain.value = .1;
        tone.connect(modulation).connect(swell.gain);tone.start();source.connect(wind).connect(swell).connect(ambience);source.start();
        soundscape();gains();
        // Sparse birds in Kyoto, soft distant bells in Paris, sea breeze on the coast.
        timer = setInterval(() => {
          if (context.state !== 'running' || prefs.muted || paused || document.hidden || location === 'santorini') return;
          const at = context.currentTime;
          if (location === 'kyoto') { note(1800 + Math.random() * 800, at, .13, .045, ambience);note(2400, at + .18, .1, .03, ambience); }
          else note(523.25, at, 1.3, .025, ambience);
        }, 5500);
        context.onstatechange = emit;
      }
      if (context.state === 'suspended' && !document.hidden) await context.resume();
      gains();emit();
    } catch { unavailable = true;emit(); }
  }
  // AudioContext creation/resume stays inside a trusted user gesture.
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', event => { if (!event.repeat) unlock(); });
  document.addEventListener('visibilitychange', () => { gains();if (document.hidden) context?.suspend().catch(() => {});else emit(); });
  return {
    unlock,
    subscribe(fn) { listeners.add(fn);emit();return () => listeners.delete(fn); },
    set(next) { prefs = audioPreferences({ ...prefs, ...next });try { localStorage.setItem('wildframe-audio', JSON.stringify(prefs)); } catch {}gains();emit(); },
    setLocation(id) { location = id;soundscape(); },
    setPaused(value) { if (paused !== value) { paused = value;gains(); } },
    play(kind) {
      if (!context || context.state !== 'running' || prefs.muted || document.hidden) return;
      const at = context.currentTime;
      if (kind === 'shutter') { burst(at, .035, 1300, .7);burst(at + .055, .065, 750, .45);note(140, at, .07, .12); }
      else if (kind === 'award') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, at + i * .16, .55, .12));
      else if (kind === 'success') { note(659.25, at, .16, .12);note(987.77, at + .12, .25, .1); }
      else note(660, at, .045, .035);
    },
    dispose() { clearInterval(timer);context?.close(); },
  };
}
