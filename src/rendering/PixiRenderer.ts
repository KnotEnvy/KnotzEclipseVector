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
  }> = [];
  private readonly damageFlashes = new Map<string, number>();
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
        }),
        eventBus.subscribe('combat.damage_applied', (event) => {
          this.damageFlashes.set(event.payload.targetId, 160);
          const target = this.entities.get(event.payload.targetId);
          if (target) {
            this.spawnImpact(
              target.position.x,
              target.position.y,
              event.payload.shielded ? 0x7fe7ff : 0xff5d7a,
            );
          }
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
      lifetimeMs: this.qualityTier === 'low' ? 360 : 560,
      color: 0xf7d06a,
      secondaryColor: 0x7fe7ff,
      radius: 18,
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
      effect.graphic.lineStyle(3, effect.color, alpha);
      effect.graphic.drawCircle(0, 0, radius);
      effect.graphic.lineStyle(1, effect.secondaryColor, alpha * 0.7);
      effect.graphic.drawCircle(0, 0, radius * 0.55);
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
    this.world.position.set(
      (this.app.screen.width - GAME_CONFIG.world.width * scale) / 2,
      (this.app.screen.height - GAME_CONFIG.world.height * scale) / 2,
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
    graphic.drawPolygon([24, 0, -18, -14, -10, 0, -18, 14]);
  } else if (entity.type === 'enemy') {
    graphic.drawPolygon([0, -28, 28, 0, 0, 28, -28, 0]);
  } else if (entity.type === 'projectile') {
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
