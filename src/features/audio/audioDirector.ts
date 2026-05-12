import type { EventBus } from '@/core/eventBus';

export class AudioDirector {
  private readonly unsubscribe: Array<() => void> = [];
  private audioContext: AudioContext | undefined;

  constructor(eventBus: EventBus) {
    this.unsubscribe.push(
      eventBus.subscribe('combat.damage_applied', (event) => {
        if (event.payload.targetId === 'player') {
          this.playTone(150, 0.04, 0.035);
        }
      }),
      eventBus.subscribe('combat.entity_destroyed', (event) => {
        this.playTone(event.payload.entityType === 'player' ? 90 : 260, 0.08, 0.05);
      }),
      eventBus.subscribe('mission.resolved', () => {
        this.playTone(420, 0.07, 0.04);
      }),
    );
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
    void this.audioContext?.close();
  }

  private playTone(frequency: number, durationSeconds: number, gainValue: number): void {
    const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    try {
      this.audioContext = this.audioContext ?? new AudioContextCtor();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue;
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + durationSeconds);
    } catch {
      // Browser autoplay policy may block early cues until the first trusted player gesture.
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }

  // Some Chromium builds expose the prefixed constructor on globalThis.
  // Keeping this declaration local avoids pulling a compatibility library into the alpha.
  // eslint-disable-next-line no-var
  var webkitAudioContext: typeof AudioContext | undefined;
}
