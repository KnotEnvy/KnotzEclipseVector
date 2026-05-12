import { EventBus } from '@/core/eventBus';
import { FixedStepGameLoop } from '@/core/gameLoop';
import { GAME_CONFIG } from '@/config/gameConfig';
import { createContentRegistry } from '@/data/registry';
import { validateContentRegistry } from '@/data/validation';
import { AudioDirector } from '@/features/audio/audioDirector';
import {
  clearCombatProjectiles,
  createCombatState,
  snapshotCombat,
  tickCombat,
} from '@/features/combat/combatSimulation';
import { DialogueDirector } from '@/features/dialogue/dialogueDirector';
import { MissionRuntime } from '@/features/mission/missionRuntime';
import { applyConsequenceBundle } from '@/features/narrative/narrativeState';
import {
  canPurchaseFieldCapacitor,
  purchaseFieldCapacitor,
} from '@/features/progression/progressionState';
import {
  SaveService,
  createBrowserSaveAdapter,
  createInitialSave,
} from '@/features/save/saveService';
import { PixiRenderer } from '@/rendering/PixiRenderer';
import type { EntitySnapshot, MissionDefinition, SaveGameRoot } from '@/types/contracts';
import { HudView } from './hud';
import { InputController } from './input';
import {
  updateMissionContinuation,
  shouldHoldCombatForMission,
  type MissionContinuationState,
} from './missionFlow';
import {
  getMissionPanelSummary,
  getContinuationMissionSummary,
  getMissionBoardSummaries,
  selectCurrentMission,
  selectContinuationMission,
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
  let saveGame = await saveService.loadOrCreate();
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
  let combatState = createCombatState(content, ship, missionDef, saveGame.game.player);
  let missionRuntime = new MissionRuntime(missionDef, eventBus, {
    seed: saveGame.debug.campaignSeed,
  });
  let dialogue = new DialogueDirector([...content.dialogueNodes.values()], eventBus, missionDef.id);
  let latestEntities: EntitySnapshot[] = snapshotCombat(combatState, content);
  let latestMission = missionRuntime.snapshot();
  let missionContinuationState: MissionContinuationState = {
    resolvedElapsedMs: 0,
  };
  let autoLaunchRemainingMs: number | undefined;
  let isMissionBoardOpen = false;
  let resetPromptOpen = false;

  const launchMission = (nextMission: MissionDefinition): void => {
    dialogue.destroy();
    missionDef = nextMission;
    combatState = createCombatState(content, ship, missionDef, saveGame.game.player);
    missionRuntime = new MissionRuntime(missionDef, eventBus, {
      seed: saveGame.debug.campaignSeed,
    });
    dialogue = new DialogueDirector([...content.dialogueNodes.values()], eventBus, missionDef.id);
    latestEntities = snapshotCombat(combatState, content);
    latestMission = missionRuntime.snapshot();
    missionContinuationState = {
      resolvedElapsedMs: 0,
    };
    autoLaunchRemainingMs = undefined;
    missionRuntime.start();
  };

  const resetSlot = (): void => {
    saveGame = createInitialSave(saveGame.meta.slotId);
    resetPromptOpen = false;
    isMissionBoardOpen = false;
    const resetMission = selectCurrentMission(saveGame, content.missions);
    if (!resetMission) {
      throw new Error('Starter mission content is missing after slot reset.');
    }
    launchMission(resetMission);
    void saveService.save(saveGame);
  };

  wireEventFeed(eventBus, eventFeed, () => saveGame, saveService);
  eventBus.subscribe('combat.entity_destroyed', (event) => missionRuntime.handleEvent(event));
  eventBus.subscribe('mission.choice_presented', () => {
    clearCombatProjectiles(combatState);
  });
  eventBus.subscribe('mission.resolved', (event) => {
    clearCombatProjectiles(combatState);
    applyConsequenceBundle(
      saveGame.game,
      event.payload.missionId,
      event.payload.consequence,
      eventBus,
      {
        markCompleted:
          event.payload.status === 'full_success' || event.payload.status === 'costly_success',
      },
    );
    missionContinuationState = {
      resolvedElapsedMs: 0,
    };
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
        const missionSnapshot = missionRuntime.snapshot();
        const missionBoard = getMissionBoardSummaries(saveGame, content.missions, missionDef);
        const choiceSelection = input.consumeChoiceSelection();
        const missionSelection = input.consumeMissionSelection();
        const retryMission = input.consumeRetryMission();
        const upgradePurchase = input.consumeUpgradePurchase();
        const resetPrompt = input.consumeResetPrompt();
        const resetConfirm = input.consumeResetConfirm();
        if (input.consumeMissionBoardToggle()) {
          isMissionBoardOpen = missionBoard.length > 1 ? !isMissionBoardOpen : false;
        }
        if (resetPrompt) {
          resetPromptOpen = !resetPromptOpen;
        }
        if (resetPromptOpen && resetConfirm) {
          resetSlot();
          saveGame.meta.playtimeMs += deltaMs;
          return;
        }
        if (
          upgradePurchase &&
          (missionSnapshot.phase === 'resolved' || missionSnapshot.phase === 'failed') &&
          canPurchaseFieldCapacitor(saveGame.game.player)
        ) {
          purchaseFieldCapacitor(saveGame.game.player);
          void saveService.save(saveGame);
        }
        if (missionSnapshot.phase === 'failed' && retryMission) {
          launchMission(missionDef);
          saveGame.meta.playtimeMs += deltaMs;
          return;
        }
        if (!missionSnapshot.activeChoice && isMissionBoardOpen && missionSelection !== null) {
          const selectedMission = missionBoard[missionSelection];
          const mission = selectedMission ? content.missions.get(selectedMission.id) : undefined;
          if (mission) {
            isMissionBoardOpen = false;
            launchMission(mission);
            saveGame.meta.playtimeMs += deltaMs;
            return;
          }
        }
        const requestedContinue = input.consumeContinueMission();
        const continueMission = missionSnapshot.phase === 'resolved' ? requestedContinue : false;
        const nextMission = selectContinuationMission(saveGame, content.missions, missionDef);
        const continuation = updateMissionContinuation({
          state: missionContinuationState,
          missionPhase: missionSnapshot.phase,
          deltaMs,
          requestedContinue: continueMission,
          hasNextMission: Boolean(nextMission) && !isMissionBoardOpen,
        });
        missionContinuationState = continuation.state;
        autoLaunchRemainingMs = continuation.autoLaunchRemainingMs;

        if (continuation.shouldLaunchNext && nextMission) {
          launchMission(nextMission);
          saveGame.meta.playtimeMs += deltaMs;
          return;
        }

        const activeChoice = missionSnapshot.activeChoice;
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

        if (!shouldHoldCombatForMission(missionSnapshot)) {
          tickCombat(combatState, command, content, eventBus, deltaMs);
        }

        missionRuntime.tick(deltaMs);
        saveGame.meta.playtimeMs += deltaMs;

        latestEntities = snapshotCombat(combatState, content);
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
          nextMission: getContinuationMissionSummary(saveGame, content.missions, missionDef),
          missionBoard: getMissionBoardSummaries(saveGame, content.missions, missionDef),
          isMissionBoardOpen,
          canPurchaseUpgrade: canPurchaseFieldCapacitor(saveGame.game.player),
          resetPromptOpen,
          autoLaunchRemainingMs,
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
  getSaveGame: () => SaveGameRoot,
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
  eventBus.subscribe('combat.status_applied', (event) => {
    push(
      `Status: ${event.payload.statusId} x${event.payload.stacks} on ${event.payload.targetId}.`,
    );
  });
  eventBus.subscribe('combat.status_expired', (event) => {
    push(`Status expired: ${event.payload.statusId} on ${event.payload.targetId}.`);
  });
  eventBus.subscribe('mission.resolved', (event) => {
    push(`Outcome: ${event.payload.status.replaceAll('_', ' ')}.`);
  });
  eventBus.subscribe('inventory.reward_granted', (event) => {
    push(`Reward: ${event.payload.salvage} salvage granted.`);
  });
  eventBus.subscribe('sector.state_changed', (event) => {
    push(`Sector changed: ${event.payload.reason}`);
  });
  eventBus.subscribe('save.completed', () => {
    const saveGame = getSaveGame();
    push(`Save updated for slot ${saveGame.meta.slotId}.`);
  });

  window.setInterval(() => {
    const saveGame = getSaveGame();
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
