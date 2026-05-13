import type { DialogueSnapshot } from '@/features/dialogue/dialogueDirector';
import {
  FIELD_CAPACITOR_COST,
  FIELD_CAPACITOR_UNLOCK,
  RESONANCE_INJECTOR_COST,
  RESONANCE_INJECTOR_DAMAGE_BONUS,
  RESONANCE_INJECTOR_UNLOCK,
  canPurchaseResonanceInjector,
} from '@/features/progression/progressionState';
import type { MissionBoardSummary, MissionPanelSummary } from './missionSelection';
import type { EntitySnapshot, GameState, MissionSnapshot } from '@/types/contracts';

export class HudView {
  constructor(private readonly root: HTMLElement) {}

  update(input: {
    entities: EntitySnapshot[];
    mission: MissionSnapshot;
    currentMission: MissionPanelSummary;
    gameState: GameState;
    dialogue: DialogueSnapshot;
    nextMission?: MissionPanelSummary;
    missionBoard: MissionBoardSummary[];
    isMissionBoardOpen: boolean;
    canPurchaseUpgrade: boolean;
    resetPromptOpen: boolean;
    autoLaunchRemainingMs?: number;
    feed: string[];
  }): void {
    const player = input.entities.find((entity) => entity.type === 'player');
    const sector =
      input.gameState.world.sectors[input.mission.sectorId] ??
      input.gameState.world.sectors.freeport_lattice;
    const freeports = input.gameState.world.factions.freeports;

    const isLowShield =
      player?.shield !== undefined &&
      player?.maxShield !== undefined &&
      player.maxShield > 0 &&
      player.shield / player.maxShield <= 0.35;
    const isFailed = input.mission.phase === 'failed';

    this.root.innerHTML = `
      <div class="hud__top">
        <section class="hud-panel ${isLowShield ? 'hud-panel--danger' : ''}" aria-label="Player status">
          <h2>Prototype</h2>
          ${meter('Hull', player?.hull ?? 0, player?.maxHull ?? 1)}
          ${meter('Shield', player?.shield ?? 0, player?.maxShield ?? 1)}
          ${statusList(player)}
          ${fieldStatusList(input.entities)}
          ${isLowShield ? '<div class="hud-alert">Low shield. Break pressure or commit to the kill.</div>' : ''}
          <div class="hud-help">WASD/arrows move. Mouse aims. Space/click fires. M mission board.</div>
        </section>
        <section class="hud-panel hud-mission" aria-label="Mission objectives">
          <h2>${isFailed ? 'Mission Failed' : input.mission.phase === 'resolved' ? 'Mission Resolved' : input.currentMission.title}</h2>
          <p class="hud-briefing">${input.currentMission.briefing}</p>
          <ul class="hud-list">
            ${input.mission.objectives
              .map(
                (objective) =>
                  `<li>${objective.state === 'completed' ? '[x]' : '[ ]'} ${
                    input.currentMission.objectiveTitles[objective.id] ??
                    objective.id.replaceAll('_', ' ')
                  } (${formatProgress(objective.progress, objective.required)})</li>`,
              )
              .join('')}
          </ul>
          <div class="hud-mission__meta">
            <span>${sectorLabel(input.currentMission.sectorId)}</span>
            <span>${input.currentMission.salvage} salvage</span>
            <span>${input.gameState.campaign.completedMissions.length} complete</span>
          </div>
          ${
            input.mission.activeChoice
              ? `<div class="hud-choice">
                  <p>${input.mission.activeChoice.prompt}</p>
                  ${input.mission.activeChoice.options
                    .map((option, index) => `<p>${index + 1}. ${option.label}</p>`)
                    .join('')}
                </div>`
              : ''
          }
          ${
            input.mission.phase === 'resolved' || isFailed
              ? `<div class="hud-choice">
                  ${
                    isFailed
                      ? `<p>Prototype recovered with sector fallout. Press R to retry this mission.</p>
                         <p>Open the mission board with M or reset the slot with Delete, then Y.</p>`
                      : input.nextMission
                        ? `<p>Next: ${input.nextMission.title} / ${sectorLabel(input.nextMission.sectorId)}</p>
                         <p>Reward: ${input.nextMission.salvage} salvage${
                           input.nextMission.unlocks.length > 0
                             ? ` + ${input.nextMission.unlocks.map(formatUnlockLabel).join(', ')}`
                             : ''
                         }</p>
                         <p>${formatAutoLaunch(input.autoLaunchRemainingMs)} Press Enter or N now.</p>`
                        : '<p>No additional missions are currently unlocked.</p>'
                  }
                </div>`
              : ''
          }
          ${upgradePrompt(input.gameState, input.canPurchaseUpgrade)}
        </section>
      </div>
      <div class="hud__center">
        ${
          input.resetPromptOpen
            ? `<section class="hud-panel hud-modal" aria-label="Reset slot confirmation">
                <h2>Reset Slot</h2>
                <p>Press Y to start a clean campaign slot. Press Delete again to cancel.</p>
              </section>`
            : input.isMissionBoardOpen
              ? missionBoard(input.missionBoard)
              : ''
        }
        ${
          input.dialogue.currentLine
            ? `<section class="hud-panel hud-comms" aria-label="Mission comms">
                <h2>${input.dialogue.currentLine.speakerName}</h2>
                <p>${input.dialogue.currentLine.text}</p>
              </section>`
            : ''
        }
      </div>
      <div class="hud__bottom">
        <section class="hud-panel" aria-label="World state">
          <h2>${sectorLabel(sector.sectorId)}</h2>
          <ul class="hud-list">
            <li>Freeports rep: ${freeports.reputation}</li>
            <li>Security: ${sector.security}</li>
            <li>Civilian stability: ${sector.civilianStability}</li>
            <li>Anomaly intensity: ${sector.anomalyIntensity}</li>
            <li>Salvage: ${input.gameState.player.salvage}</li>
          </ul>
        </section>
        <section class="hud-panel hud-feed" aria-label="Event feed">
          <h2>Event Feed</h2>
          ${input.feed.map((entry) => `<p>${entry}</p>`).join('')}
        </section>
      </div>
    `;
  }
}

function sectorLabel(sectorId: string): string {
  return sectorId
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function formatProgress(progress: number, required: number): string {
  if (required >= 1000) {
    return `${Math.ceil(Math.max(0, required - progress) / 1000)}s`;
  }

  return `${Math.round(progress)}/${Math.round(required)}`;
}

function formatAutoLaunch(remainingMs: number | undefined): string {
  if (remainingMs === undefined) {
    return 'Next mission ready.';
  }

  return `Launching in ${Math.max(1, Math.ceil(remainingMs / 1000))}s.`;
}

function formatUnlockLabel(unlock: string): string {
  return unlock
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function upgradePrompt(gameState: GameState, canPurchaseUpgrade: boolean): string {
  const hasUpgrade = gameState.player.unlocks.includes(FIELD_CAPACITOR_UNLOCK);
  const hasInjector = gameState.player.unlocks.includes(RESONANCE_INJECTOR_UNLOCK);
  const installed = [
    hasUpgrade ? 'Field Capacitor: +24 shield, +8 hull' : '',
    hasInjector ? `Resonance Injector: +${RESONANCE_INJECTOR_DAMAGE_BONUS} pulse damage` : '',
  ].filter(Boolean);

  if (canPurchaseResonanceInjector(gameState.player)) {
    return `<div class="hud-upgrade">Press U to install Resonance Injector (${RESONANCE_INJECTOR_COST} salvage): +${RESONANCE_INJECTOR_DAMAGE_BONUS} pulse damage.</div>${
      installed.length > 0 ? `<div class="hud-upgrade">${installed.join(' / ')}</div>` : ''
    }`;
  }

  if (installed.length > 0 && !canPurchaseUpgrade) {
    return `<div class="hud-upgrade">${installed.join(' / ')}</div>`;
  }

  if (!canPurchaseUpgrade) {
    return '';
  }

  return `<div class="hud-upgrade">Press U to install Field Capacitor (${FIELD_CAPACITOR_COST} salvage): +24 shield, +8 hull.</div>`;
}

function missionBoard(missions: MissionBoardSummary[]): string {
  return `
    <section class="hud-panel hud-board" aria-label="Mission board">
      <h2>Mission Board</h2>
      <ul class="hud-list">
        ${missions
          .slice(0, 5)
          .map(
            (mission, index) =>
              `<li>${index + 1}. ${mission.title} / ${sectorLabel(mission.sectorId)} / ${mission.state}</li>`,
          )
          .join('')}
      </ul>
    </section>
  `;
}

function meter(label: string, value: number, max: number): string {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));

  return `
    <div class="hud-stat">
      <span>${label}</span>
      <span class="hud-meter" style="--value: ${pct}%"><span></span></span>
      <span>${Math.round(value)}</span>
    </div>
  `;
}

function statusList(entity: EntitySnapshot | undefined): string {
  if (!entity?.statuses || entity.statuses.length === 0) {
    return '';
  }

  return `
    <div class="hud-statuses" aria-label="Active status effects">
      ${entity.statuses.map(statusPill).join('')}
    </div>
  `;
}

function statusPill(status: NonNullable<EntitySnapshot['statuses']>[number]): string {
  const remainingSeconds = Math.max(1, Math.ceil(status.remainingMs / 1000));
  const stackLabel = status.maxStacks > 1 ? ` x${status.stacks}` : '';

  return `<span class="hud-status">${status.displayName}${stackLabel} ${remainingSeconds}s</span>`;
}

function fieldStatusList(entities: EntitySnapshot[]): string {
  const statuses = entities
    .filter((entity) => entity.type !== 'player')
    .flatMap((entity) =>
      (entity.statuses ?? []).map((status) => ({
        entity,
        status,
      })),
    );

  if (statuses.length === 0) {
    return '';
  }

  return `
    <div class="hud-statuses" aria-label="Combat field status effects">
      ${statuses
        .map(
          ({ entity, status }) =>
            `<span class="hud-status">${status.displayName} ${formatEntityLabel(entity.id)}</span>`,
        )
        .join('')}
    </div>
  `;
}

function formatEntityLabel(entityId: string): string {
  return entityId
    .replace(/^enemy_/, '')
    .split('_')
    .slice(0, 3)
    .join(' ');
}
