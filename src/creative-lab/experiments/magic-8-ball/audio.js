/** Procedural, quiet sound. Creating the instrument does not create an AudioContext. */
export function createOrbAudio() {
  let ctx = null,
    enabled = false,
    disposed = false,
    token = 0;
  const voices = new Set();
  function stop() {
    for (const v of voices) {
      try {
        v.source.stop();
      } catch {}
      v.source.disconnect();
      v.gain.disconnect();
      v.filter?.disconnect();
    }
    voices.clear();
  }
  return {
    async enable() {
      const n = ++token;
      try {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio || disposed) return false;
        ctx ||= new Audio();
        await ctx.resume();
        if (disposed || n !== token) return false;
        enabled = ctx.state === "running";
        return enabled;
      } catch {
        return false;
      }
    },
    play(kind) {
      if (!enabled || disposed || ctx?.state !== "running") return;
      stop();
      const now = ctx.currentTime,
        gain = ctx.createGain();
      let source, filter, duration;
      if (kind === "shake") {
        duration = 0.65;
        const buffer = ctx.createBuffer(
            1,
            Math.floor(ctx.sampleRate * duration),
            ctx.sampleRate,
          ),
          data = buffer.getChannelData(0);
        let n = 37;
        for (let i = 0; i < data.length; i++) {
          n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
          data[i] =
            ((n / 4294967296) * 2 - 1) * Math.sin((i / data.length) * Math.PI);
        }
        source = ctx.createBufferSource();
        source.buffer = buffer;
        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(520, now);
        filter.frequency.exponentialRampToValueAtTime(160, now + duration);
        source.connect(filter).connect(gain);
      } else {
        duration = 0.8;
        source = ctx.createOscillator();
        source.type = "sine";
        source.frequency.setValueAtTime(523.25, now);
        source.frequency.exponentialRampToValueAtTime(392, now + duration);
        source.connect(gain);
      }
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(
        kind === "shake" ? 0.065 : 0.035,
        now + 0.05,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      const voice = { source, gain, filter };
      voices.add(voice);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        filter?.disconnect();
        voices.delete(voice);
      };
      source.start(now);
      source.stop(now + duration + 0.02);
    },
    quiet: stop,
    mute() {
      token++;
      enabled = false;
      stop();
      if (ctx?.state === "running") void ctx.suspend();
    },
    get state() {
      return ctx?.state || "uncreated";
    },
    get enabled() {
      return enabled;
    },
    dispose() {
      disposed = true;
      token++;
      enabled = false;
      stop();
      if (ctx && ctx.state !== "closed") void ctx.close();
      ctx = null;
    },
  };
}
