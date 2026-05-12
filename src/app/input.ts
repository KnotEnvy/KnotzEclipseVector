import { GAME_CONFIG } from '@/config/gameConfig';
import type { PlayerCommandState } from '@/features/combat/combatSimulation';
import type { Vector2 } from '@/types/contracts';
import { normalize } from '@/utils/math';

const MOVE_KEYS = {
  up: new Set(['KeyW', 'ArrowUp']),
  down: new Set(['KeyS', 'ArrowDown']),
  left: new Set(['KeyA', 'ArrowLeft']),
  right: new Set(['KeyD', 'ArrowRight']),
};

export class InputController {
  private readonly pressedKeys = new Set<string>();
  private queuedChoiceOption: 0 | 1 | null = null;
  private queuedMissionSelection: number | null = null;
  private queuedContinueMission = false;
  private queuedRetryMission = false;
  private queuedMissionBoardToggle = false;
  private queuedUpgradePurchase = false;
  private queuedResetPrompt = false;
  private queuedResetConfirm = false;
  private pointerWorld: Vector2 | null = null;
  private pointerDown = false;

  constructor(private readonly host: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    host.addEventListener('pointermove', this.handlePointerMove);
    host.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.host.removeEventListener('pointermove', this.handlePointerMove);
    this.host.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }

  getCommand(origin: Vector2): PlayerCommandState {
    const move = {
      x: (this.isPressed(MOVE_KEYS.right) ? 1 : 0) - (this.isPressed(MOVE_KEYS.left) ? 1 : 0),
      y: (this.isPressed(MOVE_KEYS.down) ? 1 : 0) - (this.isPressed(MOVE_KEYS.up) ? 1 : 0),
    };

    const aim = this.pointerWorld
      ? normalize({
          x: this.pointerWorld.x - origin.x,
          y: this.pointerWorld.y - origin.y,
        })
      : { x: 1, y: 0 };

    return {
      move,
      aim,
      firePrimary: this.pointerDown || this.pressedKeys.has('Space'),
    };
  }

  consumeChoiceSelection(): 0 | 1 | null {
    const selection = this.queuedChoiceOption;
    this.queuedChoiceOption = null;
    return selection;
  }

  consumeContinueMission(): boolean {
    const shouldContinue = this.queuedContinueMission;
    this.queuedContinueMission = false;
    return shouldContinue;
  }

  consumeRetryMission(): boolean {
    const shouldRetry = this.queuedRetryMission;
    this.queuedRetryMission = false;
    return shouldRetry;
  }

  consumeMissionSelection(): number | null {
    const selection = this.queuedMissionSelection;
    this.queuedMissionSelection = null;
    return selection;
  }

  consumeMissionBoardToggle(): boolean {
    const shouldToggle = this.queuedMissionBoardToggle;
    this.queuedMissionBoardToggle = false;
    return shouldToggle;
  }

  consumeUpgradePurchase(): boolean {
    const shouldPurchase = this.queuedUpgradePurchase;
    this.queuedUpgradePurchase = false;
    return shouldPurchase;
  }

  consumeResetPrompt(): boolean {
    const shouldPrompt = this.queuedResetPrompt;
    this.queuedResetPrompt = false;
    return shouldPrompt;
  }

  consumeResetConfirm(): boolean {
    const shouldConfirm = this.queuedResetConfirm;
    this.queuedResetConfirm = false;
    return shouldConfirm;
  }

  private isPressed(keys: Set<string>): boolean {
    for (const key of keys) {
      if (this.pressedKeys.has(key)) {
        return true;
      }
    }

    return false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.pressedKeys.add(event.code);

    if (event.code === 'Digit1') {
      this.queuedChoiceOption = 0;
      this.queuedMissionSelection = 0;
    }

    if (event.code === 'Digit2') {
      this.queuedChoiceOption = 1;
      this.queuedMissionSelection = 1;
    }

    if (event.code === 'Digit3') {
      this.queuedMissionSelection = 2;
    }

    if (event.code === 'Digit4') {
      this.queuedMissionSelection = 3;
    }

    if (event.code === 'Digit5') {
      this.queuedMissionSelection = 4;
    }

    if (event.code === 'Enter' || event.code === 'KeyN') {
      this.queuedContinueMission = true;
    }

    if (event.code === 'KeyR') {
      this.queuedRetryMission = true;
    }

    if (event.code === 'KeyM') {
      this.queuedMissionBoardToggle = true;
    }

    if (event.code === 'KeyU') {
      this.queuedUpgradePurchase = true;
    }

    if (event.code === 'Delete') {
      this.queuedResetPrompt = true;
    }

    if (event.code === 'KeyY') {
      this.queuedResetConfirm = true;
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.code);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerWorld = this.toWorldPosition(event.clientX, event.clientY);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = true;
    this.pointerWorld = this.toWorldPosition(event.clientX, event.clientY);
    this.host.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerUp = (): void => {
    this.pointerDown = false;
  };

  private toWorldPosition(clientX: number, clientY: number): Vector2 {
    const rect = this.host.getBoundingClientRect();

    return {
      x: ((clientX - rect.left) / Math.max(rect.width, 1)) * GAME_CONFIG.world.width,
      y: ((clientY - rect.top) / Math.max(rect.height, 1)) * GAME_CONFIG.world.height,
    };
  }
}
