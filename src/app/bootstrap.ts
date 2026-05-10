import { EventBus } from '@/core/eventBus';
import { FixedStepGameLoop } from '@/core/gameLoop';
import { GAME_CONFIG } from '@/config/gameConfig';
import { createContentRegistry } from '@/data/registry';
import { validateContentRegistry } from '@/data/validation';
import { AudioDirector } from '@/features/audio/audioDirector';
import { createCombatState, snapshotCombat, tickCombat } from '@/features/combat/combatSimulation';
import { DialogueDirector } from '@/features/dialogue/dialogueDirector';
import { MissionRuntime } from '@/features/mission/missionRuntime';
import { applyConsequenceBundle } from '@/features/narrative/narrativeState';
import { SaveService, createBrowserSaveAdapter } from '@/features/save/saveService';
import { PixiRenderer } from '@/rendering/PixiRenderer';
import type { EntitySnapshot, MissionDefinition, SaveGameRoot } from '@/types/contracts';
import { HudView } from './hud';
import { InputController } from './input';
import {
  getMissionPanelSummary,
  getNextMissionSummary,
  selectCurrentMission,
  selectNextUnlockedMission,
} from './missionSelection';

export async function bootstrapGame(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <main class="game-shell">
      <div class="pixi-host" aria-label="Eclipse Vector combat playfield"></div>
      <div class="hud" aria-live="polite"></div>
    </main>
  `;

  const pixiHost = requireElement(root, '.pixi-host');
  const hudRoot = requireElement(root, '.hud');
  const eventFeed: string[] = [];

  const eventBus = new EventBus();
  const content = createContentRegistry();
  const contentValidation = validateContentRegistry(content);
  if (!contentValidation.ok) {
    throw new Error(
      `Content validation failed: ${contentValidation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  const saveService = new SaveService(createBrowserSaveAdapter(), eventBus);
  const saveGame = await saveService.loadOrCreate();
  const ship = content.ships.get(saveGame.game.player.shipId);
  const initialMission = selectCurrentMission(saveGame, content.missions);

  if (!ship || !initialMission) {
    throw new Error('Starter ship or mission content is missing.');
  }

  const renderer = new PixiRenderer(pixiHost, saveGame.settings.qualityTier, eventBus);
  const hud = new HudView(hudRoot);
  const input = new InputController(pixiHost);
  const audio = new AudioDirector(eventBus);

  let missionDef = initialMission;
  let combatState = createCombatState(content, ship, missionDef);
  let missionRuntime = new MissionRuntime(missionDef, eventBus, {
    seed: saveGame.debug.campaignSeed,
  });
  let dialogue = new DialogueDirector([...content.dialogueNodes.values()], eventBus, missionDef.id);
  let latestEntities: EntitySnapshot[] = snapshotCombat(combatState);
  let latestMission = missionRuntime.snapshot();

  const launchMission = (nextMission: MissionDefinition): void => {
    dialogue.destroy();
    missionDef = nextMission;
    combatState = createCombatState(content, ship, missionDef);
    missionRuntime = new MissionRuntime(missionDef, eventBus, {
      seed: saveGame.debug.campaignSeed,
    });
    dialogue = new DialogueDirector([...content.dialogueNodes.values()], eventBus, missionDef.id);
    latestEntities = snapshotCombat(combatState);
    latestMission = missionRuntime.snapshot();
    missionRuntime.start();
  };

  wireEventFeed(eventBus, eventFeed, saveGame, saveService);
  eventBus.subscribe('combat.entity_destroyed', (event) => missionRuntime.handleEvent(event));
  eventBus.subscribe('mission.resolved', (event) => {
    applyConsequenceBundle(
      saveGame.game,
      event.payload.missionId,
      event.payload.consequence,
      eventBus,
    );
    void saveService.save(saveGame);
  });

  eventBus.publish('session.started', {
    slotId: saveGame.meta.slotId,
    seed: saveGame.debug.campaignSeed,
  });
  missionRuntime.start();

  const loop = new FixedStepGameLoop(
    {
      update: (deltaMs) => {
        const player = combatState.registry.get(combatState.playerId);
        const command = input.getCommand(player?.transform.position ?? { x: 0, y: 0 });
        const choiceSelection = input.consumeChoiceSelection();
        const continueMission = input.consumeContinueMission();

        if (missionRuntime.snapshot().phase === 'resolved' && continueMission) {
          const nextMission = selectNextUnlockedMission(saveGame, content.missions);
          if (nextMission) {
            launchMission(nextMission);
          }
        }

        tickCombat(combatState, command, content, eventBus, deltaMs);
        const activeChoice = missionRuntime.snapshot().activeChoice;
        if (activeChoice && choiceSelection !== null) {
          const selectedOption = activeChoice.options[choiceSelection];
          if (selectedOption) {
            missionRuntime.dispatchCommand({
              type: 'mission.choice.select',
              choiceId: activeChoice.choiceId,
              optionId: selectedOption.id,
              source: 'keyboard',
            });
          }
        }
        missionRuntime.tick(deltaMs);
        saveGame.meta.playtimeMs += deltaMs;

        latestEntities = snapshotCombat(combatState);
        latestMission = missionRuntime.snapshot();
      },
      render: () => {
        renderer.render({
          entities: latestEntities,
          mission: latestMission,
        });
        hud.update({
          entities: latestEntities,
          mission: latestMission,
          currentMission: getMissionPanelSummary(missionDef),
          gameState: saveGame.game,
          dialogue: dialogue.snapshot(),
          nextMission: getNextMissionSummary(saveGame, content.missions),
          feed: eventFeed,
        });
      },
    },
    GAME_CONFIG.simulation.fixedDeltaMs,
  );

  loop.start();

  window.addEventListener('beforeunload', () => {
    loop.stop();
    input.destroy();
    audio.destroy();
    dialogue.destroy();
    renderer.destroy();
  });
}

function wireEventFeed(
  eventBus: EventBus,
  eventFeed: string[],
  saveGame: SaveGameRoot,
  saveService: SaveService,
): void {
  const push = (message: string): void => {
    eventFeed.unshift(message);
    eventFeed.splice(5);
  };

  eventBus.subscribe('combat.damage_applied', (event) => {
    push(
      `Damage: ${event.payload.amount} ${event.payload.damageType} hit ${event.payload.targetId}.`,
    );
  });
  eventBus.subscribe('mission.loaded', (event) => {
    push(`Mission loaded: ${event.payload.missionId.replaceAll('_', ' ')}.`);
  });
  eventBus.subscribe('combat.entity_destroyed', (event) => {
    push(`Destroyed: ${event.payload.entityId}.`);
  });
  eventBus.subscribe('mission.resolved', (event) => {
    push(`Outcome: ${event.payload.status.replaceAll('_', ' ')}.`);
  });
  eventBus.subscribe('sector.state_changed', (event) => {
    push(`Sector changed: ${event.payload.reason}`);
  });
  eventBus.subscribe('save.completed', () => {
    push(`Save updated for slot ${saveGame.meta.slotId}.`);
  });

  window.setInterval(() => {
    void saveService.save(saveGame);
  }, 30000);
}

function requireElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Missing bootstrap element: ${selector}`);
  }

  return element;
}
