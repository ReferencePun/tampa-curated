/** Optional soft toy sounds. No AudioContext until enable() from a user gesture. */
export function createToyAudio() {
  let ctx = null,
    enabled = false,
    disposed = false,
    token = 0;
  const voices = new Set();
  function stop() {
    for (const v of voices) {
      try {
        v.o.stop();
      } catch {}
      v.o.disconnect();
      v.g.disconnect();
    }
    voices.clear();
  }
  return {
    async enable() {
      const current = ++token;
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio || disposed) return false;
      try {
        ctx ||= new Audio();
        await ctx.resume();
        if (disposed || current !== token) return false;
        enabled = ctx.state === "running";
        return enabled;
      } catch {
        return false;
      }
    },
    play(type) {
      if (!enabled || ctx?.state !== "running" || disposed) return;
      const t = ctx.currentTime,
        o = ctx.createOscillator(),
        g = ctx.createGain(),
        duration = type === "contact" ? 0.17 : 0.22;
      o.type = type === "contact" ? "triangle" : "sine";
      o.frequency.setValueAtTime(type === "contact" ? 96 : 440, t);
      o.frequency.exponentialRampToValueAtTime(
        type === "contact" ? 75 : 660,
        t + duration,
      );
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g).connect(ctx.destination);
      const v = { o, g };
      voices.add(v);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        voices.delete(v);
      };
      o.start(t);
      o.stop(t + duration + 0.02);
    },
    mute() {
      token++;
      enabled = false;
      stop();
      if (ctx?.state === "running") void ctx.suspend();
    },
    quiet: stop,
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
