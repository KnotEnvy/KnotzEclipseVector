import type { DialogueSnapshot } from '@/features/dialogue/dialogueDirector';
import type { EntitySnapshot, GameState, MissionSnapshot } from '@/types/contracts';

export class HudView {
  constructor(private readonly root: HTMLElement) {}

  update(input: {
    entities: EntitySnapshot[];
    mission: MissionSnapshot;
    gameState: GameState;
    dialogue: DialogueSnapshot;
    nextMission?: {
      title: string;
      sectorId: string;
    };
    feed: string[];
  }): void {
    const player = input.entities.find((entity) => entity.type === 'player');
    const sector =
      input.gameState.world.sectors[input.mission.sectorId] ??
      input.gameState.world.sectors.freeport_lattice;
    const freeports = input.gameState.world.factions.freeports;

    this.root.innerHTML = `
      <div class="hud__top">
        <section class="hud-panel" aria-label="Player status">
          <h2>Prototype</h2>
          ${meter('Hull', player?.hull ?? 0, player?.maxHull ?? 1)}
          ${meter('Shield', player?.shield ?? 0, player?.maxShield ?? 1)}
          <div class="hud-help">WASD or arrows move. Mouse aims. Space or left mouse fires.</div>
        </section>
        <section class="hud-panel" aria-label="Mission objectives">
          <h2>${input.mission.phase === 'resolved' ? 'Mission Resolved' : 'Mission'}</h2>
          <ul class="hud-list">
            ${input.mission.objectives
              .map(
                (objective) =>
                  `<li>${objective.state === 'completed' ? '[x]' : '[ ]'} ${objective.id.replaceAll('_', ' ')} (${Math.round(objective.progress)}/${Math.round(objective.required)})</li>`,
              )
              .join('')}
          </ul>
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
            input.mission.phase === 'resolved'
              ? `<div class="hud-choice">
                  ${
                    input.nextMission
                      ? `<p>Next: ${input.nextMission.title} / ${sectorLabel(input.nextMission.sectorId)}</p>
                         <p>Press Enter or N to launch.</p>`
                      : '<p>No additional missions are currently unlocked.</p>'
                  }
                </div>`
              : ''
          }
        </section>
      </div>
      <div class="hud__center">
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
