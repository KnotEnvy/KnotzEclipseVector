import type { EventBus } from '@/core/eventBus';
import { GAME_CONFIG } from '@/config/gameConfig';
import { ashwakeWakeMission, starterMission } from '@/data/missions';
import { createNewGameState } from '@/game/createGameState';
import type { SaveGameRoot, SaveSlotId } from '@/types/contracts';

export const CURRENT_SAVE_VERSION = 1;

export interface SaveStorageAdapter {
  loadSlot(slotId: SaveSlotId): Promise<SaveGameRoot | null>;
  saveSlot(slotId: SaveSlotId, saveGame: SaveGameRoot): Promise<void>;
  listSlots(): Promise<Array<SaveGameRoot['meta']>>;
  deleteSlot(slotId: SaveSlotId): Promise<void>;
}

export class LocalStorageSaveAdapter implements SaveStorageAdapter {
  private readonly prefix = 'eclipse-vector.save.';

  async loadSlot(slotId: SaveSlotId): Promise<SaveGameRoot | null> {
    const raw = localStorage.getItem(this.key(slotId));
    if (!raw) {
      return null;
    }

    return hydrateSaveGameRoot(JSON.parse(raw) as unknown);
  }

  async saveSlot(slotId: SaveSlotId, saveGame: SaveGameRoot): Promise<void> {
    localStorage.setItem(this.key(slotId), JSON.stringify(saveGame));
  }

  async listSlots(): Promise<Array<SaveGameRoot['meta']>> {
    const slots: Array<SaveGameRoot['meta']> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(this.prefix)) {
        continue;
      }

      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (isSaveGameRoot(parsed)) {
        slots.push(parsed.meta);
      }
    }

    return slots;
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    localStorage.removeItem(this.key(slotId));
  }

  private key(slotId: SaveSlotId): string {
    return `${this.prefix}${slotId}`;
  }
}

export class SaveService {
  constructor(
    private readonly adapter: SaveStorageAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async loadOrCreate(slotId = GAME_CONFIG.save.defaultSlotId): Promise<SaveGameRoot> {
    const existing = await this.adapter.loadSlot(slotId);
    if (existing) {
      return existing;
    }

    return createInitialSave(slotId);
  }

  async save(saveGame: SaveGameRoot): Promise<void> {
    saveGame.meta.updatedAt = new Date().toISOString();
    await this.adapter.saveSlot(saveGame.meta.slotId, saveGame);
    this.eventBus.publish('save.completed', {
      slotId: saveGame.meta.slotId,
      version: saveGame.saveVersion,
      timestamp: saveGame.meta.updatedAt,
    });
  }
}

export function createInitialSave(slotId: SaveSlotId): SaveGameRoot {
  const now = new Date().toISOString();

  return {
    saveVersion: CURRENT_SAVE_VERSION,
    meta: {
      slotId,
      createdAt: now,
      updatedAt: now,
      playtimeMs: 0,
      buildHash: GAME_CONFIG.save.buildHash,
    },
    game: createNewGameState(),
    settings: {
      qualityTier: 'recommended',
      reducedMotion: false,
      masterVolume: 0.8,
      controlsProfileId: 'default-keyboard-mouse',
    },
    debug: {
      campaignSeed: 20260507,
    },
  };
}

export function hydrateSaveGameRoot(value: unknown): SaveGameRoot | null {
  if (isSaveGameRoot(value)) {
    return normalizeKnownContent(value);
  }

  if (isLegacySaveGameV0(value)) {
    return migrateSaveGameV0(value);
  }

  return null;
}

function migrateSaveGameV0(value: LegacySaveGameV0): SaveGameRoot {
  const now = new Date().toISOString();

  return normalizeKnownContent({
    saveVersion: CURRENT_SAVE_VERSION,
    meta: {
      slotId: value.meta.slotId,
      createdAt: value.meta.createdAt ?? now,
      updatedAt: now,
      playtimeMs: value.meta.playtimeMs ?? 0,
      buildHash: value.meta.buildHash ?? GAME_CONFIG.save.buildHash,
    },
    game: value.game,
    settings: {
      qualityTier: 'recommended',
      reducedMotion: false,
      masterVolume: 0.8,
      controlsProfileId: 'default-keyboard-mouse',
    },
    debug: {
      campaignSeed: value.debug?.campaignSeed ?? 20260507,
    },
  });
}

function normalizeKnownContent(saveGame: SaveGameRoot): SaveGameRoot {
  const baseline = createNewGameState();

  saveGame.game.world.sectors = {
    ...structuredClone(baseline.world.sectors),
    ...saveGame.game.world.sectors,
  };
  saveGame.game.world.factions = {
    ...structuredClone(baseline.world.factions),
    ...saveGame.game.world.factions,
  };

  if (
    saveGame.game.campaign.completedMissions.includes(starterMission.id) &&
    !saveGame.game.campaign.availableMissions.includes(ashwakeWakeMission.id)
  ) {
    saveGame.game.campaign.availableMissions.push(ashwakeWakeMission.id);
  }

  return saveGame;
}

function isSaveGameRoot(value: unknown): value is SaveGameRoot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SaveGameRoot>;
  return (
    candidate.saveVersion === CURRENT_SAVE_VERSION &&
    Boolean(candidate.meta) &&
    Boolean(candidate.game) &&
    Boolean(candidate.settings) &&
    Boolean(candidate.debug)
  );
}

type LegacySaveGameV0 = {
  saveVersion: 0;
  meta: {
    slotId: SaveSlotId;
    createdAt?: string;
    playtimeMs?: number;
    buildHash?: string;
  };
  game: SaveGameRoot['game'];
  debug?: {
    campaignSeed?: number;
  };
};

function isLegacySaveGameV0(value: unknown): value is LegacySaveGameV0 {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LegacySaveGameV0>;
  return candidate.saveVersion === 0 && Boolean(candidate.meta) && Boolean(candidate.game);
}
