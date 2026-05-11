import type { CombatState } from './combatTypes';

export function cleanupInactiveProjectiles(state: CombatState): void {
  for (const entity of state.registry.values()) {
    if (entity.type === 'projectile' && !entity.active) {
      state.registry.remove(entity.id);
    }
  }
}
