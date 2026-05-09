import type { MissionDefinition } from '@/types/contracts';

export const starterMission: MissionDefinition = {
  id: 'corridor_breach_01',
  version: '1.0.0',
  chapterId: 'act1',
  sectorId: 'freeport_lattice',
  title: 'Corridor Breach',
  briefing:
    'A fracture drone is pinning civilian traffic in the Freeport Lattice. Break the lock and prove the prototype can survive live Veil interference.',
  tags: ['mvp', 'combat-proof', 'visible-consequence'],
  objectives: [
    {
      id: 'destroy_fracture_drone',
      kind: 'destroy',
      title: 'Destroy the fracture drone',
      targetEntityType: 'enemy',
      requiredCount: 1,
    },
    {
      id: 'choose_recovery_doctrine',
      kind: 'choice_gate',
      title: 'Choose the recovery doctrine',
      choiceId: 'corridor_breach_recovery_doctrine',
      prompt:
        'The drone core is collapsing. Do you stabilize civilian lanes or scan the anomaly wake?',
      options: [
        {
          id: 'stabilize_civilian_lanes',
          label: 'Stabilize civilian lanes',
          resultingFlags: ['story.act1.prioritized_civilian_stability'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.prioritized_civilian_stability': true,
              },
            },
            faction: {
              repDelta: {
                freeports: 4,
              },
            },
            sector: {
              sectorId: 'freeport_lattice',
              delta: {
                civilianStability: 2,
                localSentiment: 1,
              },
              reason:
                'The prototype spent its post-combat window restoring civilian lane telemetry.',
            },
          },
        },
        {
          id: 'scan_anomaly_wake',
          label: 'Scan the anomaly wake',
          resultingFlags: ['story.act1.prioritized_anomaly_intel'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.prioritized_anomaly_intel': true,
              },
              incrementCounters: {
                'research.veil_observations': 1,
              },
            },
            faction: {
              repDelta: {
                ashwake: 3,
                freeports: -1,
              },
            },
            inventory: {
              salvage: 25,
              unlocks: ['intel_veil_wake_residue'],
              idempotencyKey: 'corridor_breach_01_anomaly_scan',
            },
          },
        },
      ],
    },
  ],
  encounterSequence: [
    {
      id: 'fracture_drone_01',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_drone',
      at: { x: 960, y: 360 },
    },
  ],
  rewards: {
    salvage: 80,
    unlocks: ['contract_template_rescue_pressure'],
    repeatable: false,
  },
  consequences: [
    {
      when: 'full_success',
      apply: {
        narrative: {
          setFlags: {
            'story.act1.fracture_drone_destroyed': true,
          },
          incrementCounters: {
            'combat.prototype_successes': 1,
          },
        },
        faction: {
          repDelta: {
            freeports: 6,
            ashwake: -2,
          },
        },
        sector: {
          sectorId: 'freeport_lattice',
          delta: {
            security: 1,
            civilianStability: 1,
            anomalyIntensity: -1,
            localSentiment: 2,
          },
          reason: 'Civilian lanes reopened after the fracture drone was destroyed.',
        },
        inventory: {
          salvage: 80,
          unlocks: ['contract_template_rescue_pressure'],
          idempotencyKey: 'corridor_breach_01_full_success_rewards',
        },
      },
    },
  ],
};
