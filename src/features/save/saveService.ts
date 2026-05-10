import type { EventBus } from '@/core/eventBus';
import { GAME_CONFIG } from '@/config/gameConfig';
import { starterMissions } from '@/data/missions';
import { createNewGameState } from '@/game/createGameState';
import type { SaveGameRoot, SaveSlotId } from '@/types/contracts';

export const CURRENT_SAVE_VERSION = 1;

export interface SaveStorageAdapter {
  loadSlot(slotId: SaveSlotId): Promise<SaveGameRoot | null>;
  saveSlot(slotId: SaveSlotId, saveGame: SaveGameRoot): Promise<void>;
  listSlots(): Promise<Array<SaveGameRoot['meta']>>;
  deleteSlot(slotId: SaveSlotId): Promise<void>;
}

type IndexedDbSaveAdapterOptions = {
  databaseName?: string;
  storeName?: string;
  indexedDbFactory?: IDBFactory;
  fallbackAdapter?: SaveStorageAdapter;
};

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

export class IndexedDbSaveAdapter implements SaveStorageAdapter {
  private readonly databaseName: string;
  private readonly storeName: string;
  private readonly indexedDbFactory: IDBFactory | undefined;
  private readonly fallbackAdapter: SaveStorageAdapter | undefined;
  private dbPromise: Promise<IDBDatabase> | undefined;

  constructor(options: IndexedDbSaveAdapterOptions = {}) {
    this.databaseName = options.databaseName ?? 'eclipse-vector-saves';
    this.storeName = options.storeName ?? 'slots';
    this.indexedDbFactory = options.indexedDbFactory;
    this.fallbackAdapter = options.fallbackAdapter;
  }

  async loadSlot(slotId: SaveSlotId): Promise<SaveGameRoot | null> {
    return this.withFallback(
      async () => {
        const value = await this.runStoreRequest('readonly', (store) => store.get(slotId));
        const save = hydrateSaveGameRoot(value);
        if (save) {
          return save;
        }

        const fallbackSave = await this.fallbackAdapter?.loadSlot(slotId);
        if (fallbackSave) {
          await this.saveSlot(slotId, fallbackSave);
        }

        return fallbackSave ?? null;
      },
      () => this.fallbackAdapter?.loadSlot(slotId) ?? Promise.resolve(null),
    );
  }

  async saveSlot(slotId: SaveSlotId, saveGame: SaveGameRoot): Promise<void> {
    await this.withFallback(
      async () => {
        await this.runStoreRequest('readwrite', (store) =>
          store.put(structuredClone(saveGame), slotId),
        );
      },
      () => this.fallbackAdapter?.saveSlot(slotId, saveGame) ?? Promise.resolve(),
    );
  }

  async listSlots(): Promise<Array<SaveGameRoot['meta']>> {
    return this.withFallback(
      async () => {
        const saves = await this.runStoreRequest('readonly', (store) => store.getAll());
        const hydratedSaves = saves
          .map((save) => hydrateSaveGameRoot(save))
          .filter((save): save is SaveGameRoot => Boolean(save));
        const slotsById = new Map<string, SaveGameRoot['meta']>();

        for (const save of hydratedSaves) {
          slotsById.set(save.meta.slotId, save.meta);
        }

        for (const fallbackMeta of (await this.fallbackAdapter?.listSlots()) ?? []) {
          if (!slotsById.has(fallbackMeta.slotId)) {
            slotsById.set(fallbackMeta.slotId, fallbackMeta);
          }
        }

        return [...slotsById.values()].sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        );
      },
      () => this.fallbackAdapter?.listSlots() ?? Promise.resolve([]),
    );
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    await this.withFallback(
      async () => {
        await this.runStoreRequest('readwrite', (store) => store.delete(slotId));
        await this.fallbackAdapter?.deleteSlot(slotId);
      },
      () => this.fallbackAdapter?.deleteSlot(slotId) ?? Promise.resolve(),
    );
  }

  private async withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      if (!this.fallbackAdapter) {
        throw error;
      }

      return fallback();
    }
  }

  private async runStoreRequest<T>(
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.openDb();

    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, mode);
      const store = transaction.objectStore(this.storeName);
      const request = createRequest(store);
      let result: T | undefined;

      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB save request failed.'));
      };
      transaction.oncomplete = () => {
        resolve(result as T);
      };
      transaction.onerror = () => {
        reject(transaction.error ?? request.error ?? new Error('IndexedDB transaction failed.'));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? request.error ?? new Error('IndexedDB transaction aborted.'));
      };
    });
  }

  private async openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    const indexedDb = this.indexedDbFactory ?? globalThis.indexedDB;
    if (!indexedDb) {
      throw new Error('IndexedDB is not available in this browser.');
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open(this.databaseName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        this.dbPromise = undefined;
        reject(request.error ?? new Error('Failed to open IndexedDB save database.'));
      };
      request.onblocked = () => {
        this.dbPromise = undefined;
        reject(new Error('IndexedDB save database upgrade was blocked.'));
      };
    });

    return this.dbPromise;
  }
}

export function createBrowserSaveAdapter(): SaveStorageAdapter {
  const localStorageAdapter = new LocalStorageSaveAdapter();
  if (!globalThis.indexedDB) {
    return localStorageAdapter;
  }

  return new IndexedDbSaveAdapter({
    fallbackAdapter: localStorageAdapter,
  });
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

  for (const completedMissionId of saveGame.game.campaign.completedMissions) {
    const completedMission = starterMissions.find((mission) => mission.id === completedMissionId);
    for (const consequence of completedMission?.consequences ?? []) {
      if (consequence.when !== 'full_success') {
        continue;
      }

      for (const unlockedMissionId of consequence.apply.campaign?.unlockMissions ?? []) {
        if (!saveGame.game.campaign.availableMissions.includes(unlockedMissionId)) {
          saveGame.game.campaign.availableMissions.push(unlockedMissionId);
        }
      }
    }
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
