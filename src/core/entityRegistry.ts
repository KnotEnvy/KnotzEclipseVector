import type { EntityId, EntityType, FactionId, Transform, Vector2 } from '@/types/contracts';

export type RuntimeEntity = {
  id: EntityId;
  type: EntityType;
  factionId: FactionId;
  transform: Transform;
  velocity: Vector2;
  radius: number;
  active: boolean;
  tags: string[];
};

export class EntityRegistry<TEntity extends RuntimeEntity> {
  private readonly entities = new Map<EntityId, TEntity>();

  add(entity: TEntity): TEntity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  get(id: EntityId): TEntity | undefined {
    return this.entities.get(id);
  }

  remove(id: EntityId): void {
    this.entities.delete(id);
  }

  values(): TEntity[] {
    return [...this.entities.values()];
  }

  activeValues(): TEntity[] {
    return this.values().filter((entity) => entity.active);
  }
}
