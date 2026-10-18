// Created only inside an explicit sound-toggle gesture, never by autoplay or settings restore.
export function createClickAudio() {
  let ctx = null,
    enabled = false;
  return {
    async enable() {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      try {
        ctx ||= new Audio();
        await ctx.resume();
        enabled = ctx.state === "running";
        return enabled;
      } catch {
        return false;
      }
    },
    click() {
      if (!enabled || ctx?.state !== "running") return;
      const t = ctx.currentTime,
        o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(470, t);
      o.frequency.exponentialRampToValueAtTime(125, t + 0.045);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.07);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    },
    mute() {
      enabled = false;
      if (ctx?.state === "running") void ctx.suspend();
    },
    get state() {
      return ctx?.state || "uncreated";
    },
    dispose() {
      enabled = false;
      if (ctx && ctx.state !== "closed") void ctx.close();
      ctx = null;
    },
  };
}
