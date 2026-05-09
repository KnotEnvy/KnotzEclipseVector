import { describe, expect, it } from 'vitest';
import legacySave from '../../fixtures/saves/save-v0-legacy.json';
import {
  CURRENT_SAVE_VERSION,
  createInitialSave,
  hydrateSaveGameRoot,
} from '@/features/save/saveService';

describe('save hydration and migration', () => {
  it('hydrates current save roots', () => {
    const save = createInitialSave('A');

    expect(hydrateSaveGameRoot(save)?.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });

  it('migrates legacy v0 saves to the current root shape', () => {
    const migrated = hydrateSaveGameRoot(legacySave);

    expect(migrated?.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(migrated?.meta.slotId).toBe('legacy-a');
    expect(migrated?.settings.qualityTier).toBe('recommended');
    expect(migrated?.debug.campaignSeed).toBe(20260501);
  });

  it('rejects invalid save payloads', () => {
    expect(hydrateSaveGameRoot({ saveVersion: 1 })).toBeNull();
  });
});
