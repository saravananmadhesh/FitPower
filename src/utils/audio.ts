let audioContext: AudioContext | null = null;

/** Must be called from a user gesture (pointerdown/keydown) — browsers block autoplay otherwise. */
export function armAudio(): void {
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
  } catch {
    // Web Audio unavailable — sound cues silently no-op.
  }
}

export function beep(frequency = 880): void {
  if (!audioContext) return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // ignore
  }
}
