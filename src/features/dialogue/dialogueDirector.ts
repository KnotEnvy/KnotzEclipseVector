import type { EventBus } from '@/core/eventBus';
import type {
  DialogueNodeDefinition,
  DomainEvent,
  DomainEventType,
  MissionId,
} from '@/types/contracts';

type AnyDomainEvent = {
  [TType in DomainEventType]: DomainEvent<TType>;
}[DomainEventType];

export type DialogueLine = {
  id: string;
  speakerName: string;
  text: string;
};

export type DialogueSnapshot = {
  currentLine?: DialogueLine;
  history: DialogueLine[];
};

const DIALOGUE_EVENT_TYPES = [
  'mission.loaded',
  'combat.entity_destroyed',
  'mission.objective_updated',
  'mission.choice_presented',
  'mission.choice_committed',
  'mission.resolved',
] as const;

export class DialogueDirector {
  private readonly unsubscribe: Array<() => void> = [];
  private readonly playedNodeIds = new Set<string>();
  private readonly history: DialogueLine[] = [];
  private currentLine: DialogueLine | undefined;

  constructor(
    private readonly nodes: readonly DialogueNodeDefinition[],
    eventBus: EventBus,
    private readonly missionId: MissionId,
  ) {
    for (const eventType of DIALOGUE_EVENT_TYPES) {
      this.unsubscribe.push(
        eventBus.subscribe(eventType, (event) => {
          this.handleEvent(event as AnyDomainEvent);
        }),
      );
    }
  }

  snapshot(): DialogueSnapshot {
    return {
      currentLine: this.currentLine ? { ...this.currentLine } : undefined,
      history: this.history.map((line) => ({ ...line })),
    };
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
  }

  private handleEvent(event: AnyDomainEvent): void {
    const matchingNodes = this.nodes
      .filter((node) => !this.playedNodeIds.has(node.id))
      .filter((node) => node.missionId === this.missionId)
      .filter((node) => dialogueNodeMatchesEvent(node, event))
      .sort((left, right) => right.priority - left.priority);

    const node = matchingNodes[0];
    if (!node) {
      return;
    }

    this.playedNodeIds.add(node.id);
    this.currentLine = {
      id: node.id,
      speakerName: node.speakerName,
      text: node.text,
    };
    this.history.unshift(this.currentLine);
    this.history.splice(4);
  }
}

function dialogueNodeMatchesEvent(node: DialogueNodeDefinition, event: AnyDomainEvent): boolean {
  const trigger = node.trigger;
  if (trigger.eventType !== event.type) {
    return false;
  }

  switch (event.type) {
    case 'mission.loaded':
      return event.payload.missionId === node.missionId;
    case 'combat.entity_destroyed':
      if (trigger.eventType !== 'combat.entity_destroyed') {
        return false;
      }
      return (
        (!trigger.entityId || event.payload.entityId === trigger.entityId) &&
        (!trigger.entityType || event.payload.entityType === trigger.entityType)
      );
    case 'mission.objective_updated':
      if (trigger.eventType !== 'mission.objective_updated') {
        return false;
      }
      return (
        event.payload.missionId === node.missionId &&
        (!trigger.objectiveId || event.payload.objectiveId === trigger.objectiveId) &&
        (!trigger.state || event.payload.state === trigger.state)
      );
    case 'mission.choice_presented':
      if (trigger.eventType !== 'mission.choice_presented') {
        return false;
      }
      return !trigger.choiceId || event.payload.choiceId === trigger.choiceId;
    case 'mission.choice_committed':
      if (trigger.eventType !== 'mission.choice_committed') {
        return false;
      }
      return (
        (!trigger.choiceId || event.payload.choiceId === trigger.choiceId) &&
        (!trigger.selectedOption || event.payload.selectedOption === trigger.selectedOption)
      );
    case 'mission.resolved':
      if (trigger.eventType !== 'mission.resolved') {
        return false;
      }
      return (
        event.payload.missionId === node.missionId &&
        (!trigger.status || event.payload.status === trigger.status)
      );
    default:
      return false;
  }
}
