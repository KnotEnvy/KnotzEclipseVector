import type { DialogueNodeDefinition } from '@/types/contracts';

export const starterDialogueNodes: DialogueNodeDefinition[] = [
  {
    id: 'corridor_breach_entry',
    version: '1.0.0',
    missionId: 'corridor_breach_01',
    speakerId: 'ops_control',
    speakerName: 'Ops Control',
    trigger: {
      eventType: 'mission.loaded',
    },
    text: 'Veilrunner, civilian lanes are locked under fracture pressure. Cut the drone loose before traffic collapses.',
    priority: 10,
    tags: ['mission', 'comms', 'mvp'],
  },
  {
    id: 'corridor_breach_drone_down',
    version: '1.0.0',
    missionId: 'corridor_breach_01',
    speakerId: 'synthetic_advisor',
    speakerName: 'Synthetic Advisor',
    trigger: {
      eventType: 'combat.entity_destroyed',
      entityId: 'enemy_fracture_drone_01',
      entityType: 'enemy',
    },
    text: 'Fracture anchor destroyed. The drone core is still radiating usable telemetry.',
    priority: 20,
    tags: ['combat', 'comms', 'mvp'],
  },
  {
    id: 'corridor_breach_doctrine_prompt',
    version: '1.0.0',
    missionId: 'corridor_breach_01',
    speakerId: 'ops_control',
    speakerName: 'Ops Control',
    trigger: {
      eventType: 'mission.choice_presented',
      choiceId: 'corridor_breach_recovery_doctrine',
    },
    text: 'Choose the recovery doctrine. Civilian stability buys trust; anomaly scans buy answers.',
    priority: 30,
    tags: ['choice', 'comms', 'mvp'],
  },
  {
    id: 'corridor_breach_complete',
    version: '1.0.0',
    missionId: 'corridor_breach_01',
    speakerId: 'ops_control',
    speakerName: 'Ops Control',
    trigger: {
      eventType: 'mission.resolved',
      status: 'full_success',
    },
    text: 'Corridor Breach is resolved. The lattice is breathing again, and the prototype has its first field proof.',
    priority: 40,
    tags: ['resolution', 'comms', 'mvp'],
  },
];
