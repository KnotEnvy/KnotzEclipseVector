import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';
import { createContentRegistry } from '@/data/registry';
import { DialogueDirector } from '@/features/dialogue/dialogueDirector';

describe('dialogue director', () => {
  it('surfaces authored mission comms from domain events once per node', () => {
    const content = createContentRegistry();
    const bus = new EventBus();
    const director = new DialogueDirector(
      [...content.dialogueNodes.values()],
      bus,
      'corridor_breach_01',
    );

    bus.publish('mission.loaded', {
      missionId: 'corridor_breach_01',
      sectorId: 'freeport_lattice',
      seed: 123,
      chapterId: 'act1',
      modifiers: [],
    });

    expect(director.snapshot().currentLine?.id).toBe('corridor_breach_entry');

    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_drone_01',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 960, y: 360 },
    });
    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_drone_01',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 960, y: 360 },
    });

    const snapshot = director.snapshot();
    expect(snapshot.currentLine?.id).toBe('corridor_breach_drone_down');
    expect(
      snapshot.history.filter((line) => line.id === 'corridor_breach_drone_down'),
    ).toHaveLength(1);

    director.destroy();
  });
});
