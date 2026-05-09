import type {
  DomainEvent,
  DomainEventPayloadMap,
  DomainEventType,
  MissionId,
} from '@/types/contracts';

type Handler<TType extends DomainEventType> = (event: DomainEvent<TType>) => void;
type UntypedHandler = (event: DomainEvent<DomainEventType>) => void;

export type PublishOptions = {
  missionId?: MissionId | null;
  actorId?: string | null;
  timestampMs?: number;
  version?: number;
};

export class EventBus {
  private readonly handlers = new Map<DomainEventType, Set<UntypedHandler>>();
  private readonly history: DomainEvent<DomainEventType>[] = [];
  private nowMs = 0;

  setClock(timestampMs: number): void {
    this.nowMs = timestampMs;
  }

  subscribe<TType extends DomainEventType>(type: TType, handler: Handler<TType>): () => void {
    const handlersForType = this.handlers.get(type) ?? new Set<UntypedHandler>();
    const untypedHandler: UntypedHandler = (event) => {
      handler(event as DomainEvent<TType>);
    };

    handlersForType.add(untypedHandler);
    this.handlers.set(type, handlersForType);

    return () => {
      handlersForType.delete(untypedHandler);
    };
  }

  publish<TType extends DomainEventType>(
    type: TType,
    payload: DomainEventPayloadMap[TType],
    options: PublishOptions = {},
  ): DomainEvent<TType> {
    const event: DomainEvent<TType> = {
      type,
      version: options.version ?? 1,
      timestampMs: options.timestampMs ?? this.nowMs,
      missionId: options.missionId ?? null,
      actorId: options.actorId ?? null,
      payload,
    };

    const historyEvent = event as DomainEvent<DomainEventType>;
    this.history.push(historyEvent);

    for (const handler of this.handlers.get(type) ?? []) {
      handler(historyEvent);
    }

    return event;
  }

  getHistory(): readonly DomainEvent<DomainEventType>[] {
    return this.history;
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}
