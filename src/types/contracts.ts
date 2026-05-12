import type {
  ChoiceId,
  ContentVersion,
  DialogueNodeId,
  DialogueSpeakerId,
  EnemyArchetypeId,
  EntityId,
  FactionId,
  FlagKey,
  MissionId,
  ObjectiveId,
  SaveSlotId,
  SectorId,
  ShipId,
  StatusEffectId,
  WeaponId,
} from './ids';

export type {
  ChoiceId,
  ContentVersion,
  DialogueNodeId,
  DialogueSpeakerId,
  EnemyArchetypeId,
  EntityId,
  FactionId,
  FlagKey,
  MissionId,
  ObjectiveId,
  SaveSlotId,
  SectorId,
  ShipId,
  StatusEffectId,
  WeaponId,
} from './ids';

export type Vector2 = {
  x: number;
  y: number;
};

export type DamageType = 'kinetic' | 'energy' | 'plasma' | 'ion' | 'veil';
export type FactionDisposition = 'ally' | 'neutral' | 'hostile';
export type MissionPhase = 'briefing' | 'active' | 'resolved' | 'failed';
export type ObjectiveState = 'inactive' | 'active' | 'completed' | 'failed';
export type MissionOutcomeStatus = 'full_success' | 'costly_success' | 'fail_forward' | 'hard_fail';
export type QualityTier = 'low' | 'recommended' | 'ultra';

export type FlagValue = boolean | number | string;

export type Transform = {
  position: Vector2;
  rotation: number;
};

export type EntityType = 'player' | 'enemy' | 'projectile' | 'hazard';

export type EntitySnapshot = {
  id: EntityId;
  type: EntityType;
  factionId: FactionId;
  transform: Transform;
  radius: number;
  hull?: number;
  maxHull?: number;
  shield?: number;
  maxShield?: number;
  statuses?: Array<{
    statusId: StatusEffectId;
    displayName: string;
    visualKey: string;
    stacks: number;
    maxStacks: number;
    remainingMs: number;
    durationMs: number;
    tags: string[];
  }>;
};

export type DamageProfile = {
  amount: number;
  type: DamageType;
  critChance: number;
};

export type WeaponDefinition = {
  id: WeaponId;
  version: ContentVersion;
  displayName: string;
  fireMode: 'single' | 'burst' | 'beam';
  energyCost: number;
  heatGain: number;
  cooldownMs: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  damageProfile: DamageProfile;
  statusEffectId?: StatusEffectId;
  statusEffectChance?: number;
  tags: string[];
  effectKey: string;
};

export type ShipStats = {
  maxHull: number;
  maxShield: number;
  maxEnergy: number;
  maxHeat: number;
  moveSpeed: number;
  turnRate: number;
};

export type PlayerShipDefinition = {
  id: ShipId;
  version: ContentVersion;
  class: 'prototype' | 'skirmisher' | 'fortress' | 'control';
  displayName: string;
  slots: {
    hull: string;
    engine: string;
    reactor: string;
    shieldCore: string;
    hardpoints: WeaponId[];
    utilities: string[];
    aiCore?: string;
    droneBay?: string;
  };
  stats: ShipStats;
  tags: string[];
};

export type StatusEffectDefinition = {
  id: StatusEffectId;
  version: ContentVersion;
  displayName: string;
  stacking: 'refresh' | 'stack-duration' | 'stack-intensity' | 'unique';
  durationMs: number;
  tickRateMs?: number;
  maxStacks: number;
  visualKey: string;
  tags: string[];
};

export type EnemyArchetypeDefinition = {
  id: EnemyArchetypeId;
  version: ContentVersion;
  displayName: string;
  factionId: FactionId;
  radius: number;
  stats: {
    hull: number;
    shield: number;
    maxHeat: number;
  };
  behavior: {
    pattern?: 'pressure' | 'strafe';
    moveSpeed: number;
    preferredRange: number;
    fireRange: number;
    fireCooldownMs: number;
    volleyCount?: number;
    volleySpreadDegrees?: number;
    projectileSpeed: number;
    projectileLifetimeMs: number;
    projectileDamage: number;
    projectileDamageType: DamageType;
    statusEffectId?: StatusEffectId;
    statusEffectChance?: number;
  };
  tags: string[];
};

export type FactionReputationState = {
  factionId: FactionId;
  reputation: number;
  trust: number;
  disposition: FactionDisposition;
  embargoed: boolean;
  activePacts: string[];
};

export type SectorState = {
  sectorId: SectorId;
  control: FactionId | 'contested';
  security: number;
  civilianStability: number;
  anomalyIntensity: number;
  marketVolatility: number;
  infrastructureDamage: number;
  localSentiment: number;
};

export type RewardTable = {
  salvage: number;
  unlocks: string[];
  repeatable: boolean;
};

export type ObjectiveDefinition =
  | {
      id: ObjectiveId;
      kind: 'destroy';
      title: string;
      targetEntityType: EntityType;
      requiredCount: number;
    }
  | {
      id: ObjectiveId;
      kind: 'survive';
      title: string;
      durationMs: number;
    }
  | {
      id: ObjectiveId;
      kind: 'choice_gate';
      title: string;
      choiceId: ChoiceId;
      prompt: string;
      options: ChoiceOptionDefinition[];
    };

export type ChoiceOptionDefinition = {
  id: string;
  label: string;
  consequence: ConsequenceBundle;
  resultingFlags: FlagKey[];
};

export type MissionObjectiveProgress = {
  id: ObjectiveId;
  state: ObjectiveState;
  progress: number;
  required: number;
};

export type ConsequenceBundle = {
  narrative?: {
    setFlags?: Record<FlagKey, FlagValue>;
    incrementCounters?: Record<FlagKey, number>;
  };
  campaign?: {
    unlockMissions?: MissionId[];
  };
  faction?: {
    repDelta?: Record<FactionId, number>;
  };
  sector?: {
    sectorId: SectorId;
    delta: Partial<Omit<SectorState, 'sectorId' | 'control'>>;
    reason: string;
  };
  inventory?: {
    salvage?: number;
    unlocks?: string[];
    idempotencyKey: string;
  };
};

export type ConsequenceRule = {
  when: MissionOutcomeStatus;
  apply: ConsequenceBundle;
};

export type MissionDefinition = {
  id: MissionId;
  version: ContentVersion;
  chapterId: string;
  sectorId: SectorId;
  title: string;
  briefing: string;
  tags: string[];
  objectives: ObjectiveDefinition[];
  encounterSequence: Array<{
    id: string;
    kind: 'spawn_enemy';
    archetypeId: EnemyArchetypeId;
    at: Vector2;
  }>;
  rewards: RewardTable;
  consequences: ConsequenceRule[];
};

export type MissionOutcome = {
  missionId: MissionId;
  status: MissionOutcomeStatus;
  completedObjectives: ObjectiveId[];
  failedObjectives: ObjectiveId[];
  consequence: ConsequenceBundle;
};

export type MissionSnapshot = {
  missionId: MissionId;
  sectorId: SectorId;
  phase: MissionPhase;
  objectives: MissionObjectiveProgress[];
  elapsedMs: number;
  activeChoice?: {
    objectiveId: ObjectiveId;
    choiceId: ChoiceId;
    prompt: string;
    options: Array<Pick<ChoiceOptionDefinition, 'id' | 'label'>>;
  };
  outcome?: MissionOutcome;
};

export type MissionCommand = {
  type: 'mission.choice.select';
  choiceId: ChoiceId;
  optionId: string;
  source: 'keyboard' | 'ui' | 'test';
};

export type MissionCommandResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: 'INVALID_STATE' | 'CONTENT_MISMATCH';
    };

export type StoryState = {
  flags: Record<FlagKey, FlagValue>;
  counters: Record<FlagKey, number>;
  committedChoices: Array<{
    choiceId: ChoiceId;
    selectedOption: string;
    source: string;
  }>;
  endingVectors: Record<string, number>;
};

export type PlayerProgressionState = {
  shipId: ShipId;
  loadout: {
    primaryWeaponId: WeaponId;
  };
  salvage: number;
  unlocks: string[];
};

export type GameState = {
  player: PlayerProgressionState;
  campaign: {
    chapter: number;
    completedMissions: MissionId[];
    availableMissions: MissionId[];
  };
  story: StoryState;
  world: {
    sectors: Record<SectorId, SectorState>;
    factions: Record<FactionId, FactionReputationState>;
  };
};

export type SaveGameRoot = {
  saveVersion: 1;
  meta: {
    slotId: SaveSlotId;
    createdAt: string;
    updatedAt: string;
    playtimeMs: number;
    buildHash: string;
  };
  game: GameState;
  settings: {
    qualityTier: QualityTier;
    reducedMotion: boolean;
    masterVolume: number;
    controlsProfileId: string;
  };
  debug: {
    campaignSeed: number;
  };
};

export type DomainEventPayloadMap = {
  'session.started': {
    slotId: SaveSlotId;
    seed: number;
  };
  'combat.damage_applied': {
    targetId: EntityId;
    sourceId: EntityId;
    amount: number;
    damageType: DamageType;
    shielded: boolean;
    crit: boolean;
    remainingHull: number;
    remainingShield: number;
  };
  'combat.status_applied': {
    targetId: EntityId;
    statusId: StatusEffectId;
    stacks: number;
    durationMs: number;
    sourceId: EntityId;
  };
  'combat.status_expired': {
    targetId: EntityId;
    statusId: StatusEffectId;
    sourceId?: EntityId;
  };
  'combat.entity_destroyed': {
    entityId: EntityId;
    entityType: EntityType;
    killerId: EntityId;
    factionId: FactionId;
    position: Vector2;
  };
  'mission.loaded': {
    missionId: MissionId;
    sectorId: SectorId;
    seed: number;
    chapterId: string;
    modifiers: string[];
  };
  'mission.objective_updated': {
    missionId: MissionId;
    objectiveId: ObjectiveId;
    state: ObjectiveState;
    progress: number;
    required: number;
  };
  'mission.resolved': MissionOutcome;
  'mission.choice_presented': {
    choiceId: ChoiceId;
    promptKey: string;
    options: string[];
    expiresAtMs?: number;
  };
  'mission.choice_committed': {
    choiceId: ChoiceId;
    selectedOption: string;
    source: string;
    resultingFlags: FlagKey[];
  };
  'sector.state_changed': {
    sectorId: SectorId;
    deltas: Partial<SectorState>;
    reason: string;
    previewEffects: string[];
  };
  'faction.rep_changed': {
    factionId: FactionId;
    before: number;
    after: number;
    reason: string;
  };
  'inventory.reward_granted': {
    salvage: number;
    unlocks: string[];
    sourceMissionId: MissionId;
  };
  'save.completed': {
    slotId: SaveSlotId;
    version: number;
    timestamp: string;
  };
};

export type DomainEventType = keyof DomainEventPayloadMap;

export type DialogueTrigger =
  | {
      eventType: 'mission.loaded';
    }
  | {
      eventType: 'combat.entity_destroyed';
      entityId?: EntityId;
      entityType?: EntityType;
    }
  | {
      eventType: 'mission.objective_updated';
      objectiveId?: ObjectiveId;
      state?: ObjectiveState;
    }
  | {
      eventType: 'mission.choice_presented';
      choiceId?: ChoiceId;
    }
  | {
      eventType: 'mission.choice_committed';
      choiceId?: ChoiceId;
      selectedOption?: string;
    }
  | {
      eventType: 'mission.resolved';
      status?: MissionOutcomeStatus;
    };

export type DialogueNodeDefinition = {
  id: DialogueNodeId;
  version: ContentVersion;
  missionId: MissionId;
  speakerId: DialogueSpeakerId;
  speakerName: string;
  trigger: DialogueTrigger;
  text: string;
  priority: number;
  tags: string[];
};

export type DomainEvent<TType extends DomainEventType = DomainEventType> = {
  type: TType;
  version: number;
  timestampMs: number;
  missionId?: MissionId | null;
  actorId?: string | null;
  payload: DomainEventPayloadMap[TType];
};
