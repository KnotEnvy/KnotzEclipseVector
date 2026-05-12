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
    {
      when: 'fail_forward',
      apply: {
        narrative: {
          incrementCounters: {
            'combat.prototype_failures': 1,
          },
        },
        faction: {
          repDelta: {
            freeports: -1,
          },
        },
        sector: {
          sectorId: 'freeport_lattice',
          delta: {
            civilianStability: -1,
            localSentiment: -1,
          },
          reason: 'The prototype was forced out before the breach could be sealed.',
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
        campaign: {
          unlockMissions: ['lattice_rescue_contract_03'],
        },
      },
    },
    {
      when: 'fail_forward',
      apply: {
        narrative: {
          incrementCounters: {
            'combat.prototype_failures': 1,
          },
        },
        faction: {
          repDelta: {
            ashwake: -1,
          },
        },
        sector: {
          sectorId: 'ashwake_cleft',
          delta: {
            anomalyIntensity: 1,
            infrastructureDamage: 1,
          },
          reason: 'The Ashwake relay kept broadcasting after the prototype withdrew.',
        },
      },
    },
  ],
};

export const latticeRescueContractMission: MissionDefinition = {
  id: 'lattice_rescue_contract_03',
  version: '1.0.0',
  chapterId: 'act1',
  sectorId: 'freeport_lattice',
  title: 'Lattice Rescue Contract',
  briefing:
    'Freeport dispatch has a repeatable rescue template ready for field proof. Clear two fracture scouts from a civilian lane, hold the lane while evac telemetry syncs, then choose the recovery priority.',
  tags: ['mvp', 'contract-template', 'multi-spawn', 'survive-objective'],
  objectives: [
    {
      id: 'destroy_fracture_scouts',
      kind: 'destroy',
      title: 'Destroy the fracture scout pair',
      targetEntityType: 'enemy',
      requiredCount: 2,
    },
    {
      id: 'hold_rescue_lane',
      kind: 'survive',
      title: 'Hold the rescue lane during evac sync',
      durationMs: 4500,
    },
    {
      id: 'choose_rescue_priority',
      kind: 'choice_gate',
      title: 'Choose the rescue priority',
      choiceId: 'lattice_rescue_contract_priority',
      prompt:
        'The evacuation lane is open. Do you prioritize civilian convoy routing or salvage recovery?',
      options: [
        {
          id: 'prioritize_convoy_routing',
          label: 'Prioritize convoy routing',
          resultingFlags: ['story.act1.prioritized_convoy_routing'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.prioritized_convoy_routing': true,
              },
            },
            faction: {
              repDelta: {
                freeports: 5,
              },
            },
            sector: {
              sectorId: 'freeport_lattice',
              delta: {
                civilianStability: 2,
                localSentiment: 1,
              },
              reason: 'The rescue lane stayed focused on convoy extraction and public trust.',
            },
          },
        },
        {
          id: 'secure_salvage_beacons',
          label: 'Secure salvage beacons',
          resultingFlags: ['story.act1.secured_rescue_salvage_beacons'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.secured_rescue_salvage_beacons': true,
              },
            },
            faction: {
              repDelta: {
                freeports: 2,
                ashwake: 1,
              },
            },
            inventory: {
              salvage: 35,
              unlocks: ['salvage_beacon_calibration'],
              idempotencyKey: 'lattice_rescue_contract_03_salvage_beacons',
            },
          },
        },
      ],
    },
  ],
  encounterSequence: [
    {
      id: 'fracture_scout_01',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_scout',
      at: { x: 900, y: 260 },
    },
    {
      id: 'fracture_scout_02',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_scout',
      at: { x: 1030, y: 470 },
    },
  ],
  rewards: {
    salvage: 70,
    unlocks: ['contract_template_rescue_pressure_alpha'],
    repeatable: false,
  },
  consequences: [
    {
      when: 'full_success',
      apply: {
        narrative: {
          setFlags: {
            'story.act1.rescue_contract_template_proven': true,
          },
          incrementCounters: {
            'contracts.rescue_templates_completed': 1,
            'combat.prototype_successes': 1,
          },
        },
        faction: {
          repDelta: {
            freeports: 3,
          },
        },
        sector: {
          sectorId: 'freeport_lattice',
          delta: {
            security: 1,
            anomalyIntensity: -1,
            infrastructureDamage: -1,
          },
          reason:
            'The first rescue contract template proved the lane can be reopened under pressure.',
        },
        inventory: {
          salvage: 70,
          unlocks: ['contract_template_rescue_pressure_alpha'],
          idempotencyKey: 'lattice_rescue_contract_03_full_success_rewards',
        },
        campaign: {
          unlockMissions: ['veil_lancer_intercept_04'],
        },
      },
    },
    {
      when: 'fail_forward',
      apply: {
        narrative: {
          incrementCounters: {
            'combat.prototype_failures': 1,
          },
        },
        faction: {
          repDelta: {
            freeports: -2,
          },
        },
        sector: {
          sectorId: 'freeport_lattice',
          delta: {
            civilianStability: -1,
            infrastructureDamage: 1,
          },
          reason: 'The rescue lane buckled after the prototype lost the field.',
        },
      },
    },
  ],
};

export const veilLancerInterceptMission: MissionDefinition = {
  id: 'veil_lancer_intercept_04',
  version: '1.0.0',
  chapterId: 'act1',
  sectorId: 'ashwake_cleft',
  title: 'Veil Lancer Intercept',
  briefing:
    'A fracture lancer is skimming the Ashwake Cleft and tagging rescue traffic with Veil scars. Break its screen, survive the scar volley, then decide whether to spend the opening on repairs or pursuit telemetry.',
  tags: ['alpha', 'enemy_variant', 'status_pressure', 'mission_four'],
  objectives: [
    {
      id: 'destroy_lancer_screen',
      kind: 'destroy',
      title: 'Destroy the fracture lancer screen',
      targetEntityType: 'enemy',
      requiredCount: 3,
    },
    {
      id: 'survive_scar_echo',
      kind: 'survive',
      title: 'Survive the Veil scar echo',
      durationMs: 6000,
    },
    {
      id: 'choose_intercept_priority',
      kind: 'choice_gate',
      title: 'Choose the intercept priority',
      choiceId: 'veil_lancer_intercept_priority',
      prompt:
        'The lancer wake is unstable. Do you stabilize the damaged ships or burn the window for pursuit telemetry?',
      options: [
        {
          id: 'stabilize_damaged_ships',
          label: 'Stabilize damaged ships',
          resultingFlags: ['story.act1.stabilized_lancer_wounded'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.stabilized_lancer_wounded': true,
              },
            },
            faction: {
              repDelta: {
                freeports: 4,
                ashwake: 1,
              },
            },
            sector: {
              sectorId: 'ashwake_cleft',
              delta: {
                civilianStability: 2,
                infrastructureDamage: -1,
              },
              reason: 'The prototype held position long enough to stabilize scarred convoy hulls.',
            },
          },
        },
        {
          id: 'capture_pursuit_telemetry',
          label: 'Capture pursuit telemetry',
          resultingFlags: ['story.act1.captured_lancer_pursuit_telemetry'],
          consequence: {
            narrative: {
              setFlags: {
                'story.act1.captured_lancer_pursuit_telemetry': true,
              },
              incrementCounters: {
                'research.veil_observations': 3,
              },
            },
            faction: {
              repDelta: {
                ashwake: 5,
                freeports: -1,
              },
            },
            inventory: {
              salvage: 45,
              unlocks: ['lancer_pursuit_telemetry'],
              idempotencyKey: 'veil_lancer_intercept_04_pursuit_telemetry',
            },
          },
        },
      ],
    },
  ],
  encounterSequence: [
    {
      id: 'fracture_lancer_01',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_lancer',
      at: { x: 920, y: 250 },
    },
    {
      id: 'fracture_scout_lancer_guard_01',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_scout',
      at: { x: 1030, y: 380 },
    },
    {
      id: 'fracture_scout_lancer_guard_02',
      kind: 'spawn_enemy',
      archetypeId: 'fracture_scout',
      at: { x: 900, y: 510 },
    },
  ],
  rewards: {
    salvage: 120,
    unlocks: ['field_capacitor_blueprint'],
    repeatable: false,
  },
  consequences: [
    {
      when: 'full_success',
      apply: {
        narrative: {
          setFlags: {
            'story.act1.lancer_intercept_complete': true,
          },
          incrementCounters: {
            'combat.prototype_successes': 1,
          },
        },
        faction: {
          repDelta: {
            ashwake: 4,
            freeports: 2,
          },
        },
        sector: {
          sectorId: 'ashwake_cleft',
          delta: {
            security: 1,
            anomalyIntensity: -2,
            localSentiment: 1,
          },
          reason: 'The fracture lancer was driven off before its Veil scars could spread.',
        },
        inventory: {
          salvage: 120,
          unlocks: ['field_capacitor_blueprint'],
          idempotencyKey: 'veil_lancer_intercept_04_full_success_rewards',
        },
      },
    },
    {
      when: 'fail_forward',
      apply: {
        narrative: {
          incrementCounters: {
            'combat.prototype_failures': 1,
            'hazards.veil_scar_incidents': 1,
          },
        },
        faction: {
          repDelta: {
            ashwake: -2,
          },
        },
        sector: {
          sectorId: 'ashwake_cleft',
          delta: {
            anomalyIntensity: 2,
            infrastructureDamage: 1,
          },
          reason:
            'The fracture lancer marked the cleft before the prototype could finish the intercept.',
        },
      },
    },
  ],
};

export const starterMissions: MissionDefinition[] = [
  starterMission,
  ashwakeWakeMission,
  latticeRescueContractMission,
  veilLancerInterceptMission,
];
