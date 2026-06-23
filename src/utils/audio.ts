// Global sound state
if (typeof window !== 'undefined' && (window as any).soundEnabled === undefined) {
  (window as any).soundEnabled = true;
}

export const playClick = (type: 'hover' | 'click') => {
  try {
    if (typeof window !== 'undefined' && (window as any).soundEnabled === false) {
      return;
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else {
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.015);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.015);
    }
  } catch (e) {
    // Suppress audio issues
  }
};
