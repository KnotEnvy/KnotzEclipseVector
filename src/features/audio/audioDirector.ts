import type { EventBus } from '@/core/eventBus';

export class AudioDirector {
  private readonly unsubscribe: Array<() => void> = [];
  private audioContext: AudioContext | undefined;

  constructor(eventBus: EventBus) {
    this.unsubscribe.push(
      eventBus.subscribe('combat.damage_applied', (event) => {
        if (event.payload.targetId === 'player') {
          this.playTone(event.payload.shielded ? 180 : 110, 0.05, 0.045);
        } else {
          this.playTone(event.payload.shielded ? 520 : 680, 0.025, 0.018);
        }
      }),
      eventBus.subscribe('combat.entity_destroyed', (event) => {
        this.playTone(event.payload.entityType === 'player' ? 80 : 240, 0.09, 0.055);
        if (event.payload.entityType !== 'player') {
          window.setTimeout(() => this.playTone(360, 0.06, 0.035), 55);
        }
      }),
      eventBus.subscribe('combat.status_applied', (event) => {
        this.playTone(event.payload.statusId === 'veil_scar' ? 300 : 740, 0.045, 0.025);
      }),
      eventBus.subscribe('mission.choice_presented', () => {
        this.playTone(560, 0.05, 0.03);
      }),
      eventBus.subscribe('mission.resolved', (event) => {
        if (event.payload.status === 'full_success') {
          this.playTone(420, 0.08, 0.04);
          window.setTimeout(() => this.playTone(640, 0.1, 0.035), 85);
        } else {
          this.playTone(140, 0.12, 0.045);
        }
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
