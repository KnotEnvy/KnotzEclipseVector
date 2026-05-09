import type { EventBus } from '@/core/eventBus';

export class AudioDirector {
  private readonly unsubscribe: Array<() => void> = [];

  constructor(eventBus: EventBus) {
    this.unsubscribe.push(
      eventBus.subscribe('combat.damage_applied', () => {
        // Placeholder boundary: future Web Audio routing subscribes here.
      }),
      eventBus.subscribe('mission.resolved', () => {
        // Mission music state transitions belong here, not in combat or rendering.
      }),
    );
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
  }
}
