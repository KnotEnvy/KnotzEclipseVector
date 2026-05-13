import { Application, Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { EventBus } from '@/core/eventBus';
import type { EntitySnapshot, MissionSnapshot, QualityTier } from '@/types/contracts';

const COLORS = {
  player: 0x7fe7ff,
  enemy: 0xff5d7a,
  projectile: 0xf7d06a,
  enemyProjectile: 0xff6a9c,
  hazard: 0x9b7cff,
};

export class PixiRenderer {
  private readonly app: Application<HTMLCanvasElement>;
  private readonly world = new Container();
  private readonly entities = new Map<string, Graphics>();
  private readonly effectLayer = new Container();
  private readonly starfield = new Graphics();
  private readonly effects: Array<{
    graphic: Graphics;
    ageMs: number;
    lifetimeMs: number;
    color: number;
    secondaryColor: number;
    radius: number;
    kind: 'ring' | 'burst' | 'scar' | 'success';
  }> = [];
  private readonly damageFlashes = new Map<string, number>();
  private shakeMs = 0;
  private shakeStrength = 0;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(
    host: HTMLElement,
    private readonly qualityTier: QualityTier,
    eventBus?: EventBus,
  ) {
    this.app = new Application<HTMLCanvasElement>({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: qualityTier !== 'low',
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, qualityTier === 'ultra' ? 2 : 1.5),
    });

    host.appendChild(this.app.view);
    this.world.addChild(this.starfield);
    this.world.addChild(this.effectLayer);
    this.app.stage.addChild(this.world);
    this.drawStarfield();

    if (eventBus) {
      this.unsubscribe.push(
        eventBus.subscribe('combat.entity_destroyed', (event) => {
          this.spawnExplosion(event.payload.position.x, event.payload.position.y);
          this.shakeMs = event.payload.entityType === 'player' ? 520 : 180;
          this.shakeStrength = event.payload.entityType === 'player' ? 12 : 4;
        }),
        eventBus.subscribe('combat.damage_applied', (event) => {
          this.damageFlashes.set(event.payload.targetId, event.payload.shielded ? 130 : 220);
          const target = this.entities.get(event.payload.targetId);
          if (target) {
            this.spawnImpact(
              target.position.x,
              target.position.y,
              event.payload.shielded
                ? 0x7fe7ff
                : event.payload.damageType === 'veil'
                  ? 0xbf7dff
                  : 0xff5d7a,
            );
          }
          if (event.payload.targetId === 'player' && !event.payload.shielded) {
            this.shakeMs = 160;
            this.shakeStrength = 5;
          }
        }),
        eventBus.subscribe('combat.status_applied', (event) => {
          const target = this.entities.get(event.payload.targetId);
          if (target) {
            this.spawnStatusPulse(target.position.x, target.position.y, event.payload.statusId);
          }
        }),
        eventBus.subscribe('mission.resolved', (event) => {
          this.spawnMissionPulse(event.payload.status === 'full_success');
        }),
      );
    }
  }

  render(input: { entities: EntitySnapshot[]; mission: MissionSnapshot }): void {
    this.layoutWorld();
    this.syncEntities(input.entities, input.mission);
    this.updateEffects();
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
    this.app.destroy(true, {
      children: true,
      texture: false,
      baseTexture: false,
    });
  }

  private spawnExplosion(x: number, y: number): void {
    const graphic = new Graphics();
    graphic.position.set(x, y);
    this.effectLayer.addChild(graphic);
    this.effects.push({
      graphic,
      ageMs: 0,
      lifetimeMs: this.qualityTier === 'low' ? 420 : 700,
      color: 0xf7d06a,
      secondaryColor: 0xff5d7a,
      radius: 20,
      kind: 'burst',
    });
  }

  private spawnImpact(x: number, y: number, color: number): void {
    const graphic = new Graphics();
    graphic.position.set(x, y);
    this.effectLayer.addChild(graphic);
    this.effects.push({
      graphic,
      ageMs: 0,
      lifetimeMs: 220,
      color,
      secondaryColor: 0xffffff,
      radius: 8,
      kind: 'ring',
    });
  }

  private spawnStatusPulse(x: number, y: number, statusId: string): void {
    const graphic = new Graphics();
    graphic.position.set(x, y);
    this.effectLayer.addChild(graphic);
    this.effects.push({
      graphic,
      ageMs: 0,
      lifetimeMs: 460,
      color: statusId === 'veil_scar' ? 0xbf7dff : 0x8df4ff,
      secondaryColor: statusId === 'veil_scar' ? 0xff6a9c : 0xf7d06a,
      radius: 14,
      kind: 'scar',
    });
  }

  private spawnMissionPulse(success: boolean): void {
    const graphic = new Graphics();
    graphic.position.set(GAME_CONFIG.world.width / 2, GAME_CONFIG.world.height / 2);
    this.effectLayer.addChild(graphic);
    this.effects.push({
      graphic,
      ageMs: 0,
      lifetimeMs: success ? 900 : 620,
      color: success ? 0x7fe7ff : 0xff5d7a,
      secondaryColor: success ? 0xf7d06a : 0xbf7dff,
      radius: 80,
      kind: 'success',
    });
  }

  private updateEffects(): void {
    const deltaMs = this.app.ticker.deltaMS;
    for (const effect of this.effects) {
      effect.ageMs += deltaMs;
      const progress = Math.min(1, effect.ageMs / effect.lifetimeMs);
      const radius = effect.radius + progress * (this.qualityTier === 'ultra' ? 72 : 48);
      const alpha = 1 - progress;

      effect.graphic.clear();
      if (effect.kind === 'burst') {
        effect.graphic.lineStyle(4, effect.color, alpha);
        effect.graphic.drawCircle(0, 0, radius);
        effect.graphic.lineStyle(2, effect.secondaryColor, alpha * 0.75);
        effect.graphic.drawCircle(0, 0, radius * 0.52);
        for (let spoke = 0; spoke < 8; spoke += 1) {
          const angle = (Math.PI * 2 * spoke) / 8 + progress;
          effect.graphic.lineStyle(
            2,
            spoke % 2 === 0 ? effect.color : effect.secondaryColor,
            alpha,
          );
          effect.graphic.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2);
          effect.graphic.lineTo(Math.cos(angle) * radius * 1.15, Math.sin(angle) * radius * 1.15);
        }
      } else if (effect.kind === 'scar') {
        effect.graphic.lineStyle(3, effect.color, alpha);
        effect.graphic.drawCircle(0, 0, radius);
        effect.graphic.lineStyle(2, effect.secondaryColor, alpha * 0.8);
        effect.graphic.moveTo(-radius * 0.7, 0);
        effect.graphic.lineTo(radius * 0.7, 0);
      } else if (effect.kind === 'success') {
        effect.graphic.lineStyle(4, effect.color, alpha * 0.85);
        effect.graphic.drawCircle(0, 0, radius);
        effect.graphic.lineStyle(1, effect.secondaryColor, alpha * 0.55);
        effect.graphic.drawCircle(0, 0, radius * 1.45);
      } else {
        effect.graphic.lineStyle(3, effect.color, alpha);
        effect.graphic.drawCircle(0, 0, radius);
        effect.graphic.lineStyle(1, effect.secondaryColor, alpha * 0.7);
        effect.graphic.drawCircle(0, 0, radius * 0.55);
      }
    }

    for (const [id, remainingMs] of this.damageFlashes.entries()) {
      const nextRemainingMs = remainingMs - deltaMs;
      if (nextRemainingMs <= 0) {
        this.damageFlashes.delete(id);
      } else {
        this.damageFlashes.set(id, nextRemainingMs);
      }
    }

    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      if (effect.ageMs < effect.lifetimeMs) {
        continue;
      }

      this.effectLayer.removeChild(effect.graphic);
      effect.graphic.destroy();
      this.effects.splice(index, 1);
    }
  }

  private layoutWorld(): void {
    const scale = Math.min(
      this.app.screen.width / GAME_CONFIG.world.width,
      this.app.screen.height / GAME_CONFIG.world.height,
    );

    this.world.scale.set(scale);
    const deltaMs = this.app.ticker.deltaMS;
    this.shakeMs = Math.max(0, this.shakeMs - deltaMs);
    const shake = this.shakeMs > 0 ? (this.shakeMs / 520) * this.shakeStrength : 0;
    this.world.position.set(
      (this.app.screen.width - GAME_CONFIG.world.width * scale) / 2 +
        Math.sin(this.app.ticker.lastTime / 18) * shake,
      (this.app.screen.height - GAME_CONFIG.world.height * scale) / 2 +
        Math.cos(this.app.ticker.lastTime / 22) * shake,
    );
  }

  private syncEntities(entities: EntitySnapshot[], mission: MissionSnapshot): void {
    const visibleIds = new Set(entities.map((entity) => entity.id));

    for (const [id, graphic] of this.entities.entries()) {
      if (!visibleIds.has(id)) {
        this.world.removeChild(graphic);
        graphic.destroy();
        this.entities.delete(id);
      }
    }

    for (const entity of entities) {
      const graphic = this.entities.get(entity.id) ?? this.createGraphic(entity.id);
      graphic.clear();
      graphic.position.set(entity.transform.position.x, entity.transform.position.y);
      graphic.rotation = entity.transform.rotation;
      drawEntity(
        graphic,
        entity,
        mission.phase === 'resolved' || mission.phase === 'failed',
        this.damageFlashes.get(entity.id) ?? 0,
      );
    }
  }

  private createGraphic(id: string): Graphics {
    const graphic = new Graphics();
    this.entities.set(id, graphic);
    this.world.addChild(graphic);
    return graphic;
  }

  private drawStarfield(): void {
    this.starfield.clear();
    this.starfield.beginFill(0x254766, 0.28);
    for (let index = 0; index < 96; index += 1) {
      const x = (index * 97) % GAME_CONFIG.world.width;
      const y = (index * 193) % GAME_CONFIG.world.height;
      const radius = index % 7 === 0 ? 1.6 : 1;
      this.starfield.drawCircle(x, y, radius);
    }
    this.starfield.endFill();

    this.starfield.lineStyle(1, 0x315a86, 0.15);
    for (let index = 0; index < 6; index += 1) {
      const y = 80 + index * 104;
      this.starfield.moveTo(0, y);
      this.starfield.lineTo(GAME_CONFIG.world.width, y + 40);
    }
  }
}

function drawEntity(
  graphic: Graphics,
  entity: EntitySnapshot,
  missionResolved: boolean,
  flashRemainingMs: number,
): void {
  const alpha = missionResolved && entity.type === 'enemy' ? 0.35 : 1;
  const fillColor =
    entity.type === 'projectile' && entity.factionId !== 'player'
      ? COLORS.enemyProjectile
      : COLORS[entity.type];
  graphic.beginFill(fillColor, alpha);

  if (entity.type === 'player') {
    graphic.lineStyle(2, 0xffffff, 0.5);
    graphic.drawPolygon([24, 0, -18, -14, -10, 0, -18, 14]);
  } else if (entity.type === 'enemy') {
    const isAnchor = entity.radius >= 30;
    graphic.drawPolygon(
      isAnchor
        ? [0, -38, 32, -12, 26, 24, 0, 38, -26, 24, -32, -12]
        : [0, -28, 28, 0, 0, 28, -28, 0],
    );
  } else if (entity.type === 'projectile') {
    const trailColor = entity.factionId === 'player' ? 0x8df4ff : 0xff6a9c;
    graphic.lineStyle(entity.factionId === 'player' ? 3 : 2, trailColor, 0.65);
    graphic.moveTo(-entity.radius * 4, 0);
    graphic.lineTo(entity.radius * 1.6, 0);
    graphic.drawCircle(0, 0, entity.radius);
  } else {
    graphic.drawCircle(0, 0, entity.radius);
  }

  graphic.endFill();

  if (entity.type !== 'projectile' && entity.maxShield && entity.shield !== undefined) {
    const shieldPct = entity.shield / Math.max(entity.maxShield, 1);
    graphic.lineStyle(2, 0x7fe7ff, Math.max(0.15, shieldPct));
    graphic.drawCircle(0, 0, entity.radius + 7);
  }

  if (flashRemainingMs > 0 && entity.type !== 'projectile') {
    graphic.lineStyle(3, entity.type === 'player' ? 0xff5d7a : 0xffffff, 0.8);
    graphic.drawCircle(0, 0, entity.radius + 12);
  }

  if (entity.statuses?.some((status) => status.statusId === 'ionized')) {
    graphic.lineStyle(2, 0x8df4ff, 0.82);
    graphic.moveTo(-entity.radius - 10, -entity.radius - 10);
    graphic.lineTo(entity.radius + 10, entity.radius + 10);
    graphic.moveTo(entity.radius + 10, -entity.radius - 10);
    graphic.lineTo(-entity.radius - 10, entity.radius + 10);
  }

  if (entity.statuses?.some((status) => status.statusId === 'veil_scar')) {
    graphic.lineStyle(2, 0xbf7dff, 0.86);
    graphic.drawCircle(0, 0, entity.radius + 13);
    graphic.moveTo(-entity.radius - 8, 0);
    graphic.lineTo(entity.radius + 8, 0);
  }
}
