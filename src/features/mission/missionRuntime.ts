import type { EventBus } from '@/core/eventBus';
import type {
  DomainEvent,
  MissionDefinition,
  MissionObjectiveProgress,
  MissionCommand,
  MissionCommandResult,
  MissionOutcome,
  MissionOutcomeStatus,
  MissionSnapshot,
  ObjectiveDefinition,
  ConsequenceBundle,
} from '@/types/contracts';

type MissionRuntimeOptions = {
  seed: number;
};

export class MissionRuntime {
  private phase: MissionSnapshot['phase'] = 'briefing';
  private elapsedMs = 0;
  private outcome: MissionOutcome | undefined;
  private selectedChoiceConsequence: ConsequenceBundle = {};
  private readonly objectiveProgress: MissionObjectiveProgress[];

  constructor(
    private readonly definition: MissionDefinition,
    private readonly eventBus: EventBus,
    private readonly options: MissionRuntimeOptions,
  ) {
    this.objectiveProgress = definition.objectives.map((objective) => ({
      id: objective.id,
      state: 'inactive',
      progress: 0,
      required: requiredForObjective(objective),
    }));
  }

  start(): void {
    this.phase = 'active';
    this.activateNextObjective();

    this.eventBus.publish('mission.loaded', {
      missionId: this.definition.id,
      sectorId: this.definition.sectorId,
      seed: this.options.seed,
      chapterId: this.definition.chapterId,
      modifiers: [],
    });
  }

  tick(deltaMs: number): void {
    if (this.phase !== 'active') {
      return;
    }

    this.elapsedMs += deltaMs;

    for (const objective of this.definition.objectives) {
      if (objective.kind === 'survive') {
        this.tickSurviveObjective(objective, deltaMs);
      }
    }

    if (this.objectiveProgress.every((objective) => objective.state === 'completed')) {
      this.resolve('full_success');
    }
  }

  dispatchCommand(command: MissionCommand): MissionCommandResult {
    if (this.phase !== 'active') {
      return {
        ok: false,
        error: 'INVALID_STATE',
      };
    }

    if (command.type === 'mission.choice.select') {
      return this.commitChoice(command);
    }

    return {
      ok: false,
      error: 'CONTENT_MISMATCH',
    };
  }

  fail(status: Extract<MissionOutcomeStatus, 'fail_forward' | 'hard_fail'> = 'fail_forward'): void {
    if (this.phase !== 'active') {
      return;
    }

    for (const progress of this.objectiveProgress) {
      if (progress.state === 'active' || progress.state === 'inactive') {
        progress.state = 'failed';
        this.publishObjective(progress);
      }
    }

    this.resolve(status);
  }

  handleEvent(event: DomainEvent<'combat.entity_destroyed'>): void {
    if (this.phase !== 'active') {
      return;
    }

    if (event.type === 'combat.entity_destroyed') {
      const payload = event.payload;
      if (payload.entityType === 'player') {
        this.fail('fail_forward');
        return;
      }

      for (const objective of this.definition.objectives) {
        if (objective.kind !== 'destroy' || objective.targetEntityType !== payload.entityType) {
          continue;
        }

        const progress = this.findProgress(objective.id);
        if (!progress || progress.state !== 'active') {
          continue;
        }

        progress.progress = Math.min(progress.required, progress.progress + 1);
        if (progress.progress >= progress.required) {
          progress.state = 'completed';
        }
        this.publishObjective(progress);
        this.advanceAfterCompletion();
      }
    }
  }

  snapshot(): MissionSnapshot {
    return {
      missionId: this.definition.id,
      sectorId: this.definition.sectorId,
      phase: this.phase,
      objectives: this.objectiveProgress.map((objective) => ({ ...objective })),
      elapsedMs: this.elapsedMs,
      activeChoice: this.getActiveChoiceSnapshot(),
      outcome: this.outcome,
    };
  }

  private tickSurviveObjective(
    objective: Extract<ObjectiveDefinition, { kind: 'survive' }>,
    deltaMs: number,
  ): void {
    const progress = this.findProgress(objective.id);
    if (!progress || progress.state !== 'active') {
      return;
    }

    progress.progress = Math.min(progress.required, progress.progress + deltaMs);
    if (progress.progress >= progress.required) {
      progress.state = 'completed';
    }
    this.publishObjective(progress);
    this.advanceAfterCompletion();
  }

  private commitChoice(
    command: Extract<MissionCommand, { type: 'mission.choice.select' }>,
  ): MissionCommandResult {
    const activeProgress = this.objectiveProgress.find((objective) => objective.state === 'active');
    const objective = this.definition.objectives.find(
      (candidate) => candidate.id === activeProgress?.id,
    );

    if (!activeProgress || !objective || objective.kind !== 'choice_gate') {
      return {
        ok: false,
        error: 'INVALID_STATE',
      };
    }

    if (objective.choiceId !== command.choiceId) {
      return {
        ok: false,
        error: 'CONTENT_MISMATCH',
      };
    }

    const option = objective.options.find((candidate) => candidate.id === command.optionId);
    if (!option) {
      return {
        ok: false,
        error: 'CONTENT_MISMATCH',
      };
    }

    this.selectedChoiceConsequence = mergeConsequenceBundles(
      this.selectedChoiceConsequence,
      option.consequence,
    );
    activeProgress.progress = 1;
    activeProgress.state = 'completed';
    this.publishObjective(activeProgress);
    this.eventBus.publish(
      'mission.choice_committed',
      {
        choiceId: command.choiceId,
        selectedOption: option.id,
        source: command.source,
        resultingFlags: option.resultingFlags,
      },
      {
        missionId: this.definition.id,
      },
    );

    this.advanceAfterCompletion();

    return {
      ok: true,
    };
  }

  private resolve(status: MissionOutcomeStatus): void {
    if (this.phase === 'resolved' || this.phase === 'failed') {
      return;
    }

    const consequence =
      this.definition.consequences.find((rule) => rule.when === status)?.apply ??
      this.definition.consequences[0]?.apply ??
      {};

    this.phase = status === 'fail_forward' || status === 'hard_fail' ? 'failed' : 'resolved';
    this.outcome = {
      missionId: this.definition.id,
      status,
      completedObjectives: this.objectiveProgress
        .filter((objective) => objective.state === 'completed')
        .map((objective) => objective.id),
      failedObjectives: this.objectiveProgress
        .filter((objective) => objective.state === 'failed')
        .map((objective) => objective.id),
      consequence: mergeConsequenceBundles(consequence, this.selectedChoiceConsequence),
    };

    this.eventBus.publish('mission.resolved', this.outcome, {
      missionId: this.definition.id,
    });
  }

  private publishObjective(objective: MissionObjectiveProgress): void {
    this.eventBus.publish(
      'mission.objective_updated',
      {
        missionId: this.definition.id,
        objectiveId: objective.id,
        state: objective.state,
        progress: objective.progress,
        required: objective.required,
      },
      {
        missionId: this.definition.id,
      },
    );
  }

  private findProgress(objectiveId: string): MissionObjectiveProgress | undefined {
    return this.objectiveProgress.find((objective) => objective.id === objectiveId);
  }

  private advanceAfterCompletion(): void {
    if (this.objectiveProgress.every((objective) => objective.state === 'completed')) {
      this.resolve('full_success');
      return;
    }

    this.activateNextObjective();
  }

  private activateNextObjective(): void {
    const hasActiveObjective = this.objectiveProgress.some(
      (objective) => objective.state === 'active',
    );
    if (hasActiveObjective) {
      return;
    }

    const nextObjective = this.objectiveProgress.find(
      (objective) => objective.state === 'inactive',
    );
    if (!nextObjective) {
      return;
    }

    nextObjective.state = 'active';
    this.publishObjective(nextObjective);

    const definition = this.definition.objectives.find(
      (objective) => objective.id === nextObjective.id,
    );
    if (definition?.kind === 'choice_gate') {
      this.eventBus.publish(
        'mission.choice_presented',
        {
          choiceId: definition.choiceId,
          promptKey: definition.prompt,
          options: definition.options.map((option) => option.id),
        },
        {
          missionId: this.definition.id,
        },
      );
    }
  }

  private getActiveChoiceSnapshot(): MissionSnapshot['activeChoice'] {
    const activeProgress = this.objectiveProgress.find((objective) => objective.state === 'active');
    const definition = this.definition.objectives.find(
      (objective) => objective.id === activeProgress?.id,
    );

    if (!activeProgress || definition?.kind !== 'choice_gate') {
      return undefined;
    }

    return {
      objectiveId: definition.id,
      choiceId: definition.choiceId,
      prompt: definition.prompt,
      options: definition.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    };
  }
}

function requiredForObjective(objective: ObjectiveDefinition): number {
  if (objective.kind === 'destroy') {
    return objective.requiredCount;
  }

  if (objective.kind === 'survive') {
    return objective.durationMs;
  }

  return 1;
}

function mergeConsequenceBundles(
  base: ConsequenceBundle,
  addition: ConsequenceBundle,
): ConsequenceBundle {
  return {
    narrative: {
      setFlags: {
        ...(base.narrative?.setFlags ?? {}),
        ...(addition.narrative?.setFlags ?? {}),
      },
      incrementCounters: sumRecords(
        base.narrative?.incrementCounters,
        addition.narrative?.incrementCounters,
      ),
    },
    campaign: mergeCampaignConsequence(base, addition),
    faction: {
      repDelta: sumRecords(base.faction?.repDelta, addition.faction?.repDelta),
    },
    sector: mergeSectorConsequence(base, addition),
    inventory: mergeInventoryConsequence(base, addition),
  };
}

function mergeCampaignConsequence(
  base: ConsequenceBundle,
  addition: ConsequenceBundle,
): ConsequenceBundle['campaign'] {
  const unlockMissions = [
    ...new Set([
      ...(base.campaign?.unlockMissions ?? []),
      ...(addition.campaign?.unlockMissions ?? []),
    ]),
  ];

  return unlockMissions.length > 0 ? { unlockMissions } : undefined;
}

function sumRecords(
  base: Record<string, number> | undefined,
  addition: Record<string, number> | undefined,
): Record<string, number> | undefined {
  const result = { ...(base ?? {}) };

  for (const [key, value] of Object.entries(addition ?? {})) {
    result[key] = (result[key] ?? 0) + value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function mergeSectorConsequence(
  base: ConsequenceBundle,
  addition: ConsequenceBundle,
): ConsequenceBundle['sector'] {
  if (!base.sector) {
    return addition.sector;
  }

  if (!addition.sector || addition.sector.sectorId !== base.sector.sectorId) {
    return base.sector;
  }

  return {
    sectorId: base.sector.sectorId,
    reason: `${base.sector.reason} ${addition.sector.reason}`,
    delta: sumSectorDeltas(base.sector.delta, addition.sector.delta),
  };
}

function sumSectorDeltas(
  base: NonNullable<ConsequenceBundle['sector']>['delta'],
  addition: NonNullable<ConsequenceBundle['sector']>['delta'],
): NonNullable<ConsequenceBundle['sector']>['delta'] {
  const result = { ...base };

  for (const [key, value] of Object.entries(addition)) {
    const field = key as keyof typeof result;
    result[field] = (result[field] ?? 0) + value;
  }

  return result;
}

function mergeInventoryConsequence(
  base: ConsequenceBundle,
  addition: ConsequenceBundle,
): ConsequenceBundle['inventory'] {
  if (!base.inventory) {
    return addition.inventory;
  }

  if (!addition.inventory) {
    return base.inventory;
  }

  return {
    salvage: (base.inventory.salvage ?? 0) + (addition.inventory.salvage ?? 0),
    unlocks: [
      ...new Set([...(base.inventory.unlocks ?? []), ...(addition.inventory.unlocks ?? [])]),
    ],
    idempotencyKey: `${base.inventory.idempotencyKey}+${addition.inventory.idempotencyKey}`,
  };
}
