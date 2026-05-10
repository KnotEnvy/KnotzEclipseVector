import { describe, expect, it } from 'vitest';
import {
  IndexedDbSaveAdapter,
  createInitialSave,
  type SaveStorageAdapter,
} from '@/features/save/saveService';
import type { SaveGameRoot, SaveSlotId } from '@/types/contracts';

describe('save storage adapters', () => {
  it('stores, lists, hydrates, and deletes saves through IndexedDB', async () => {
    const adapter = new IndexedDbSaveAdapter({
      databaseName: 'adapter-test',
      indexedDbFactory: new FakeIndexedDbFactory().asIdbFactory(),
    });
    const save = createInitialSave('indexed-a');

    await adapter.saveSlot(save.meta.slotId, save);

    expect((await adapter.loadSlot('indexed-a'))?.meta.slotId).toBe('indexed-a');
    expect(await adapter.listSlots()).toEqual([expect.objectContaining({ slotId: 'indexed-a' })]);

    await adapter.deleteSlot('indexed-a');

    expect(await adapter.loadSlot('indexed-a')).toBeNull();
    expect(await adapter.listSlots()).toEqual([]);
  });

  it('migrates a fallback save into IndexedDB when the primary store is empty', async () => {
    const fallbackAdapter = new MemorySaveStorageAdapter();
    const save = createInitialSave('fallback-a');
    await fallbackAdapter.saveSlot(save.meta.slotId, save);

    const adapter = new IndexedDbSaveAdapter({
      databaseName: 'migration-test',
      fallbackAdapter,
      indexedDbFactory: new FakeIndexedDbFactory().asIdbFactory(),
    });

    expect((await adapter.loadSlot('fallback-a'))?.meta.slotId).toBe('fallback-a');

    await fallbackAdapter.deleteSlot('fallback-a');

    expect((await adapter.loadSlot('fallback-a'))?.meta.slotId).toBe('fallback-a');
  });
});

class MemorySaveStorageAdapter implements SaveStorageAdapter {
  private readonly saves = new Map<string, SaveGameRoot>();

  async loadSlot(slotId: SaveSlotId): Promise<SaveGameRoot | null> {
    return structuredClone(this.saves.get(slotId)) ?? null;
  }

  async saveSlot(slotId: SaveSlotId, saveGame: SaveGameRoot): Promise<void> {
    this.saves.set(slotId, structuredClone(saveGame));
  }

  async listSlots(): Promise<Array<SaveGameRoot['meta']>> {
    return [...this.saves.values()].map((save) => structuredClone(save.meta));
  }

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    this.saves.delete(slotId);
  }
}

class FakeIndexedDbFactory {
  private readonly databases = new Map<string, FakeDatabase>();

  asIdbFactory(): IDBFactory {
    return {
      open: (name: string) => {
        const request = new FakeOpenRequest();
        const existingDatabase = this.databases.get(name);
        const database = existingDatabase ?? new FakeDatabase();
        this.databases.set(name, database);

        queueMicrotask(() => {
          request.result = database.asIdbDatabase();
          if (!existingDatabase) {
            request.onupgradeneeded?.({} as IDBVersionChangeEvent);
          }
          request.onsuccess?.({} as Event);
        });

        return request.asIdbOpenRequest();
      },
    } as IDBFactory;
  }
}

class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();

  asIdbDatabase(): IDBDatabase {
    return {
      objectStoreNames: {
        contains: (name: string) => this.stores.has(name),
      },
      createObjectStore: (name: string) => {
        if (!this.stores.has(name)) {
          this.stores.set(name, new Map<string, unknown>());
        }
        return {} as IDBObjectStore;
      },
      transaction: (storeName: string) =>
        new FakeTransaction(this.store(storeName)).asTransaction(),
    } as IDBDatabase;
  }

  private store(storeName: string): Map<string, unknown> {
    const store = this.stores.get(storeName);
    if (!store) {
      throw new Error(`Missing fake object store: ${storeName}`);
    }

    return store;
  }
}

class FakeTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  error: DOMException | null = null;

  constructor(private readonly store: Map<string, unknown>) {}

  asTransaction(): IDBTransaction {
    return this as unknown as IDBTransaction;
  }

  objectStore(): IDBObjectStore {
    return new FakeObjectStore(this.store, this).asObjectStore();
  }

  complete(): void {
    queueMicrotask(() => {
      this.oncomplete?.({} as Event);
    });
  }
}

class FakeObjectStore {
  constructor(
    private readonly store: Map<string, unknown>,
    private readonly transaction: FakeTransaction,
  ) {}

  asObjectStore(): IDBObjectStore {
    return {
      get: (key: IDBValidKey) =>
        this.makeRequest(structuredClone(this.store.get(String(key))) as unknown),
      getAll: () =>
        this.makeRequest([...this.store.values()].map((value) => structuredClone(value))),
      put: (value: unknown, key?: IDBValidKey) => {
        if (key === undefined) {
          throw new Error('Fake IndexedDB requires explicit keys.');
        }
        this.store.set(String(key), structuredClone(value));
        return this.makeRequest(key);
      },
      delete: (key: IDBValidKey) => {
        this.store.delete(String(key));
        return this.makeRequest(undefined);
      },
    } as IDBObjectStore;
  }

  private makeRequest<T>(result: T): IDBRequest<T> {
    const request = new FakeRequest<T>(result);
    queueMicrotask(() => {
      request.onsuccess?.({} as Event);
      this.transaction.complete();
    });

    return request.asIdbRequest();
  }
}

class FakeRequest<T> {
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  error: DOMException | null = null;

  constructor(public result: T) {}

  asIdbRequest(): IDBRequest<T> {
    return this as unknown as IDBRequest<T>;
  }
}

class FakeOpenRequest extends FakeRequest<IDBDatabase> {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
  onblocked: ((event: Event) => void) | null = null;

  constructor() {
    super(undefined as unknown as IDBDatabase);
  }

  asIdbOpenRequest(): IDBOpenDBRequest {
    return this as unknown as IDBOpenDBRequest;
  }
}
