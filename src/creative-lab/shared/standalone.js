/** Minimal application adapter used by exported examples; no Tampa dependencies. */
export function runStandalone(mount, settings) {
  const host = document.querySelector('.impossible-effect');
  const button = document.querySelector('#pause'), replay = document.querySelector('#replay');
  const status = document.querySelector('#status'), image = host.querySelector('img');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup, paused = motion.matches;
  function start() {
    cleanup?.();
    let effect, visible = false, disposed = false;
    const abort = new AbortController(), signal = abort.signal;
    function sync() {
      if (disposed) return;
      try {
        if (visible && !document.hidden && !effect) { effect = mount(host, settings); image.hidden = true; }
        effect?.setRunning(visible && !paused && !document.hidden);
        button.textContent = paused ? 'Resume' : 'Pause';
        status.textContent = paused ? 'Paused' : 'Move over the drawing to explore.';
      } catch (error) { status.textContent = error.message; }
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(host);
    button.addEventListener('click', () => { paused = !paused; sync(); }, {signal});
    host.addEventListener('lab:set-pause', event => { paused = Boolean(event.detail); sync(); }, {signal});
    replay.addEventListener('click', () => effect?.replay(), {signal});
    document.addEventListener('visibilitychange', sync, {signal});
    motion.addEventListener('change', () => { paused = motion.matches; sync(); }, {signal});
    cleanup = () => { if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); effect?.dispose(); image.hidden = false; };
    sync();
  }
  start();
  window.addEventListener('pagehide', () => cleanup?.());
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
}
