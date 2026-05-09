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
        campaign: {
          unlockMissions: ['ashwake_wake_02'],
        },
      },
    },
  ],
};

export const ashwakeWakeMission: MissionDefinition = {
  id: 'ashwake_wake_02',
  version: '1.0.0',
  chapterId: 'act1',
  sectorId: 'ashwake_cleft',
  title: 'Ashwake Wake',
  briefing:
    'Ashwake scouts traced the drone signal into a torn salvage lane. Enter the cleft, clear the fracture relay, and decide who receives the telemetry.',
  tags: ['mvp', 'second-sector', 'visible-consequence'],
  objectives: [
    {
      id: 'destroy_fracture_relay',
      kind: 'destroy',
      title: 'Destroy the fracture relay escort',
      targetEntityType: 'enemy',
      requiredCount: 1,
    },
    {
      id: 'route_telemetry',
      kind: 'choice_gate',
      title: 'Route the recovered telemetry',
      choiceId: 'ashwake_wake_telemetry_route',
      prompt:
        'The relay memory is intact. Do you share it with Ashwake researchers or route it to Freeport traffic control?',
      options: [
        {
          id: 'share_with_ashwake',
          label: 'Share with Ashwake researchers',
          resultingFlags: ['story.act1.shared_relay_telemetry_with_ashwake'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.shared_relay_telemetry_with_ashwake': true,
              },
              incrementCounters: {
                'research.veil_observations': 2,
              },
            },
            faction: {
              repDelta: {
                ashwake: 5,
                freeports: -1,
              },
            },
            sector: {
              sectorId: 'ashwake_cleft',
              delta: {
                anomalyIntensity: -1,
                localSentiment: 2,
              },
              reason: 'Ashwake researchers used the relay telemetry to stabilize cleft readings.',
            },
          },
        },
        {
          id: 'route_to_freeports',
          label: 'Route to Freeport traffic control',
          resultingFlags: ['story.act1.routed_relay_telemetry_to_freeports'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.routed_relay_telemetry_to_freeports': true,
              },
            },
            faction: {
              repDelta: {
                freeports: 4,
                ashwake: -1,
              },
            },
            sector: {
              sectorId: 'freeport_lattice',
              delta: {
                security: 1,
                civilianStability: 1,
              },
              reason: 'Freeport control folded the relay telemetry into safer civilian routing.',
            },
          },
        },
      ],
    },
  ],
  encounterSequence: [
    {
      id: 'fracture_relay_escort_01',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_drone',
      at: { x: 980, y: 300 },
    },
  ],
  rewards: {
    salvage: 95,
    unlocks: ['contract_template_anomaly_survey'],
    repeatable: false,
  },
  consequences: [
    {
      when: 'full_success',
      apply: {
        narrative: {
          setFlags: {
            'story.act1.ashwake_relay_destroyed': true,
          },
          incrementCounters: {
            'combat.prototype_successes': 1,
          },
        },
        faction: {
          repDelta: {
            ashwake: 4,
          },
        },
        sector: {
          sectorId: 'ashwake_cleft',
          delta: {
            security: 1,
            anomalyIntensity: -1,
            infrastructureDamage: -1,
          },
          reason: 'The Ashwake Cleft stabilized after the fracture relay escort was destroyed.',
        },
        inventory: {
          salvage: 95,
          unlocks: ['contract_template_anomaly_survey'],
          idempotencyKey: 'ashwake_wake_02_full_success_rewards',
        },
      },
    },
  ],
};

export const starterMissions: MissionDefinition[] = [starterMission, ashwakeWakeMission];
