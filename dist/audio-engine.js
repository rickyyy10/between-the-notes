/**
 * Small deterministic accompaniment engine for the midterm prototype.
 * The MP3 is played at its original speed and pitch. Synthesized accompaniment
 * is routed separately, so comparison never replaces or restarts the singer.
 * Event locations are energy-guided heuristics, not annotated beats/syllables.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.record = null;
    this.buffer = null;
    this.cache = new Map();
    this.mix = { accompaniment: false, texture: 'soft', activity: 0.4, presence: 0.35, events: null };
    this.onTick = null;
    this._playing = false;
    this._offset = 0;
    this._anchor = 0;
    this._end = 0;
    this._request = 0;
    this._loadRequest = 0;
    this._voice = null;
    this._synths = new Set();
    this._events = [];
    this._raf = null;
    this._eventKey = '';
  }

  _ensureContext() {
    if (this.context) return this.context;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support Web Audio.');
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.context.destination);
    this.accompanimentGain = this.context.createGain();
    this.accompanimentGain.gain.value = 0;
    this.accompanimentGain.connect(this.master);
    return this.context;
  }

  async load(record) {
    if (!record?.audio) throw new Error('The recording has no audio path.');
    const loadRequest = ++this._loadRequest;
    const context = this._ensureContext();
    const url = new URL(record.audio, document.baseURI).href;
    if (!this.cache.has(url)) {
      const request = fetch(url).then(async response => {
        if (!response.ok) throw new Error(`Audio could not be loaded (${response.status}).`);
        return context.decodeAudioData(await response.arrayBuffer());
      }).catch(error => {
        this.cache.delete(url);
        throw error;
      });
      this.cache.set(url, request);
    }
    const buffer = await this.cache.get(url);
    if (!this._playing && loadRequest === this._loadRequest) {
      if (this.record?.id !== record.id) this._offset = 0;
      this.record = record;
      this.buffer = buffer;
      this._end = Math.min(record.duration || buffer.duration, buffer.duration);
      this._eventKey = '';
    }
    return buffer;
  }

  get currentTime() {
    if (!this._playing || !this.context) return this._offset;
    return Math.min(this._end, this._offset + Math.max(0, this.context.currentTime - this._anchor));
  }

  get playing() { return this._playing; }

  async play(record = this.record, options = {}) {
    if (!record) throw new Error('Choose a recording first.');
    const request = ++this._request;
    this._halt(false);
    const context = this._ensureContext();
    // Call resume before awaiting network requests to retain user activation.
    const resumed = context.resume();
    const buffer = await this.load(record);
    await resumed;
    if (request !== this._request) return false;
    this.record = record;
    this.buffer = buffer;
    this._applyMixOptions(options);
    const duration = Math.min(record.duration || buffer.duration, buffer.duration);
    const start = clamp(Number.isFinite(options.start) ? options.start : 0, 0, duration);
    const end = clamp(Number.isFinite(options.end) ? options.end : duration, start, duration);
    if (end - start < 0.01) {
      this._offset = start;
      this._end = end;
      this._notify();
      return false;
    }
    this._offset = start;
    this._end = end;
    this._anchor = context.currentTime + 0.035;
    this._playing = true;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 1;
    source.connect(gain);
    gain.connect(this.master);
    gain.gain.setValueAtTime(0, this._anchor);
    gain.gain.linearRampToValueAtTime(1, this._anchor + 0.008);
    const finish = this._anchor + end - start;
    gain.gain.setValueAtTime(1, Math.max(this._anchor + 0.008, finish - 0.008));
    gain.gain.linearRampToValueAtTime(0, finish);
    this._voice = { source, gain };
    source.onended = () => {
      if (this._voice?.source !== source) return;
      this._offset = this._end;
      this._playing = false;
      this._voice = null;
      source.disconnect();
      gain.disconnect();
      this._clearSynths();
      this._cancelTick();
      this._notify();
    };
    source.start(this._anchor, start, end - start);
    this._updateAccompanimentGain();
    this._scheduleAccompaniment(start);
    this._tick();
    return true;
  }

  pause() {
    ++this._request;
    this._halt(true);
  }

  stop() {
    ++this._request;
    this._halt(false);
    this._offset = 0;
    this._notify();
  }

  async seek(time) {
    if (!this.record) return false;
    const duration = Math.min(this.record.duration || Infinity, this.buffer?.duration || Infinity);
    const target = clamp(Number(time) || 0, 0, duration);
    if (this._playing) {
      // A free seek exits a selected passage. The UI clears its region at the
      // same time, so retaining a previous clip end would stop unexpectedly.
      return this.play(this.record, { ...this.mix, start: target, end: duration });
    }
    this._offset = target;
    this._end = duration;
    this._notify();
    return true;
  }

  setMix(options = {}) {
    const old = { ...this.mix };
    const oldEvents = JSON.stringify(this.mix.events ?? null);
    this._applyMixOptions(options);
    this._updateAccompanimentGain();
    if (this._playing && (old.texture !== this.mix.texture || old.activity !== this.mix.activity || oldEvents !== JSON.stringify(this.mix.events ?? null))) {
      const now = this.currentTime;
      this._clearSynths();
      this._scheduleAccompaniment(now);
    }
    this._notify();
    return { ...this.mix, events: this.mix.events?.map(event => ({ ...event })) ?? null };
  }

  _applyMixOptions(options) {
    if ('accompaniment' in options) this.mix.accompaniment = Boolean(options.accompaniment);
    if (['soft', 'pluck', 'percussion'].includes(options.texture)) this.mix.texture = options.texture;
    if (Number.isFinite(options.activity)) this.mix.activity = clamp(options.activity, 0, 1);
    if (Number.isFinite(options.presence)) this.mix.presence = clamp(options.presence, 0, 1);
    // null returns to the generated pattern; [] intentionally removes every event.
    if ('events' in options && (options.events === null || Array.isArray(options.events))) {
      this.mix.events = options.events === null ? null : options.events.map(event => ({ ...event }));
    }
  }

  _updateAccompanimentGain() {
    if (!this.context) return;
    const target = this.mix.accompaniment ? this.mix.presence * 0.9 : 0;
    const param = this.accompanimentGain.gain;
    const now = this.context.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(target, now, 0.018);
  }

  /** Return all proposed events, even in Original mode, to visualize the design. */
  getEvents() {
    if (!this.record) return [];
    if (Array.isArray(this.mix.events)) return normalizeArrangementEvents(this.mix.events, this.record, this.mix.texture, this.buffer?.duration);
    const key = `${this.record.id}|${this.mix.texture}|${this.mix.activity}`;
    if (key === this._eventKey) return this._events.map(event => ({ ...event }));
    this._eventKey = key;
    const frames = (this.record.frames || []).filter(f => Number.isFinite(f.t));
    const duration = Math.min(this.record.duration || this.buffer?.duration || 0, this.buffer?.duration || Infinity);
    const valid = frames.filter(f => Number.isFinite(f.f0) && f.f0 > 50 && f.f0 < 1100);
    const median = this.record.metrics?.pitchMedianHz || medianOf(valid.map(f => f.f0));
    const events = [];
    const stride = this.mix.activity < 0.34 ? 4 : this.mix.activity < 0.67 ? 2 : 1;
    const slot = this.mix.texture === 'soft' ? 1.5 : 0.72;
    // A fixed candidate lattice is nudged to nearby high-energy observations.
    // Activity takes nested subsets; it does not change a claimed musical tempo.
    for (let i = 0, t = 0.35; t < duration - 0.1; i++, t += slot) {
      if (i % stride) continue;
      const nearby = frames.filter(f => Math.abs(f.t - t) < 0.22 && Number.isFinite(f.rmsDb));
      const anchor = nearby.reduce((best, f) => !best || f.rmsDb > best.rmsDb ? f : best, null);
      if (anchor && anchor.rmsDb < -32) continue;
      const time = anchor ? anchor.t : t;
      if (events.length && time - events.at(-1).time < 0.35) continue;
      const pitchFrames = valid.filter(f => Math.abs(f.t - time) < 0.3);
      let frequency = medianOf(pitchFrames.map(f => f.f0));
      if (!frequency) frequency = median;
      if (this.mix.texture !== 'percussion' && !frequency) continue;
      // Octave transposition retains continuous pitch; no key or chord inferred.
      if (frequency) {
        while (frequency > 220) frequency /= 2;
        while (frequency < 85) frequency *= 2;
      }
      const length = this.mix.texture === 'soft' ? Math.min(slot * stride * 0.86, 3.6) : this.mix.texture === 'pluck' ? 0.78 : 0.19;
      events.push({ time, duration: Math.min(length, duration - time), kind: this.mix.texture, frequency });
    }
    this._events = events;
    return events.map(event => ({ ...event }));
  }

  _scheduleAccompaniment(position) {
    if (!this._playing) return;
    const context = this.context;
    for (const event of this.getEvents()) {
      if (event.time >= this._end || event.time + event.duration <= position) continue;
      // Percussive/plucked events already heard are not retriggered on editing.
      if (event.kind !== 'soft' && event.time < position - 0.025) continue;
      const effectiveStart = Math.max(position, event.time);
      const at = Math.max(context.currentTime + 0.012, this._anchor + effectiveStart - this._offset);
      const remaining = Math.min(event.time + event.duration, this._end) - effectiveStart;
      if (remaining > 0.015) this._sound(event, at, remaining);
    }
  }

  _sound(event, at, duration) {
    const context = this.context;
    const gain = context.createGain();
    gain.connect(this.accompanimentGain);
    const oscillator = context.createOscillator();
    oscillator.connect(gain);
    const end = at + duration;
    gain.gain.setValueAtTime(0, at);
    if (event.kind === 'soft') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(event.frequency, at);
      const attack = Math.min(0.23, duration * 0.2);
      const release = Math.min(0.4, duration * 0.3);
      gain.gain.linearRampToValueAtTime(0.17, at + attack);
      gain.gain.setValueAtTime(0.17, Math.max(at + attack, end - release));
      gain.gain.linearRampToValueAtTime(0, end);
    } else if (event.kind === 'pluck') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(event.frequency * 2, at);
      gain.gain.linearRampToValueAtTime(0.25, at + Math.min(0.007, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(360, at);
      oscillator.frequency.exponentialRampToValueAtTime(120, at + Math.min(0.055, duration));
      gain.gain.linearRampToValueAtTime(0.38, at + Math.min(0.002, duration * 0.1));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    const item = { source: oscillator, gain };
    this._synths.add(item);
    oscillator.onended = () => {
      this._synths.delete(item);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(end + 0.01);
  }

  _clearSynths() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const item of this._synths) {
      item.gain.gain.cancelScheduledValues(now);
      item.gain.gain.setTargetAtTime(0, now, 0.006);
      try { item.source.stop(now + 0.025); } catch (_) { /* Already ended. */ }
    }
    this._synths.clear();
  }

  _halt(keepPosition) {
    const position = this.currentTime;
    this._playing = false;
    this._offset = keepPosition ? position : 0;
    if (this._voice && this.context) {
      const { source, gain } = this._voice;
      const now = this.context.currentTime;
      this._voice = null;
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.005);
      try { source.stop(now + 0.025); } catch (_) { /* Already ended. */ }
    }
    this._clearSynths();
    this._cancelTick();
    if (keepPosition) this._notify();
  }

  _notify() {
    if (typeof this.onTick === 'function') this.onTick(this.currentTime, this._playing);
  }

  _tick() {
    this._cancelTick();
    const tick = () => {
      this._notify();
      if (this._playing) this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _cancelTick() {
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}

/** Clone and constrain user-authored events to the selected recording. */
export function normalizeArrangementEvents(events, record, defaultKind = 'soft', bufferDuration = Infinity) {
  const duration = Math.min(Number(record?.duration) || 0, bufferDuration || Infinity);
  if (!(duration > .02) || !Array.isArray(events)) return [];
  let fallbackFrequency = Number(record?.metrics?.pitchMedianHz) || 140;
  while (fallbackFrequency > 220) fallbackFrequency /= 2;
  while (fallbackFrequency < 85) fallbackFrequency *= 2;
  return events.slice(0, 256).flatMap((event, index) => {
    if (!event || !Number.isFinite(event.time) || !Number.isFinite(event.duration) || event.duration <= 0) return [];
    const kind = ['soft', 'pluck', 'percussion'].includes(event.kind) ? event.kind : ['soft', 'pluck', 'percussion'].includes(defaultKind) ? defaultKind : 'soft';
    const time = clamp(event.time, 0, duration - .02);
    const frequency = kind === 'percussion' ? null : clamp(Number.isFinite(event.frequency) && event.frequency > 0 ? event.frequency : fallbackFrequency, 40, 2000);
    return [{id: String(event.id ?? `event-${index}`).slice(0, 100), time, duration: clamp(event.duration, .02, duration - time), kind, frequency}];
  }).sort((a, b) => a.time - b.time);
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function medianOf(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export default AudioEngine;
