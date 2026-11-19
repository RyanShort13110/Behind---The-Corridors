/** Adaptive render scale in AUTO mode and lightweight opt-in FPS diagnostics. */
export function createPerformanceMonitor(renderer, resize, getQuality, hud) {
  let adaptiveScale = 1;
  let sampleSeconds = 0;
  let frames = 0;
  let lastFPS = 0;
  let slowSamples = 0;
  let fastSamples = 0;
  let elapsed = 0;

  function update(dt, started, visible) {
    if (!started || !visible || dt <= 0 || dt > 0.095) return;
    sampleSeconds += dt;
    frames++;
    elapsed += dt;
    if (sampleSeconds < 2.5) return;
    lastFPS = Math.round(frames / sampleSeconds);
    frames = 0;
    sampleSeconds = 0;

    if (getQuality() === 'auto' && elapsed > 7) {
      slowSamples = lastFPS < 44 ? slowSamples + 1 : 0;
      fastSamples = lastFPS > 57 ? fastSamples + 1 : 0;
      if (slowSamples >= 2 && adaptiveScale > 0.65) {
        adaptiveScale = Math.max(0.65, +(adaptiveScale - 0.10).toFixed(2));
        slowSamples = 0;
        fastSamples = 0;
        resize();
        console.info(`[Behind.] AUTO quality adjusted to ${Math.round(adaptiveScale * 100)}% render scale`);
      } else if (fastSamples >= 5 && adaptiveScale < 1) {
        adaptiveScale = Math.min(1, +(adaptiveScale + 0.05).toFixed(2));
        fastSamples = 0;
        resize();
      }
    }
    if (hud) {
      const info = renderer.info.render;
      hud.textContent = `${lastFPS} FPS · ${info.calls} draws · ${info.triangles.toLocaleString()} triangles · DPR ${renderer.getPixelRatio().toFixed(2)} · ${getQuality().toUpperCase()}`;
    }
  }
  return {
    update,
    get scale() { return getQuality() === 'auto' ? adaptiveScale : 1; },
    reset() { sampleSeconds = 0; frames = 0; slowSamples = 0; fastSamples = 0; elapsed = 0; },
  };
}
