import { GAME_CONFIG } from '@/config/gameConfig';
import type { PlayerShipDefinition } from '@/types/contracts';
import { clamp, normalize } from '@/utils/math';
import type { CombatEntity, PlayerCommandState } from './combatTypes';

export function updatePlayerMovement(
  player: CombatEntity,
  command: PlayerCommandState,
  ship: PlayerShipDefinition,
  deltaMs: number,
): void {
  const move = normalize(command.move);
  const seconds = deltaMs / 1000;

  player.velocity = {
    x: move.x * ship.stats.moveSpeed,
    y: move.y * ship.stats.moveSpeed,
  };
  player.transform.position.x = clamp(
    player.transform.position.x + player.velocity.x * seconds,
    32,
    GAME_CONFIG.world.width - 32,
  );
  player.transform.position.y = clamp(
    player.transform.position.y + player.velocity.y * seconds,
    32,
    GAME_CONFIG.world.height - 32,
  );

  const aim = normalize(command.aim);
  if (aim.x !== 0 || aim.y !== 0) {
    player.transform.rotation = Math.atan2(aim.y, aim.x);
  }
}
