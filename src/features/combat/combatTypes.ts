import type { EntityRegistry, RuntimeEntity } from '@/core/entityRegistry';
import type {
  DamageType,
  EntityId,
  StatusEffectId,
  Vector2,
  WeaponDefinition,
} from '@/types/contracts';

export type PlayerCommandState = {
  move: Vector2;
  aim: Vector2;
  firePrimary: boolean;
};

export type CombatResources = {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  heat: number;
  maxHeat: number;
};

export type ProjectileState = {
  sourceId: EntityId;
  weaponId: string;
  damage: number;
  damageType: WeaponDefinition['damageProfile']['type'];
  statusEffectId?: StatusEffectId;
  statusEffectChance: number;
  lifetimeMs: number;
};

export type ActiveStatusEffect = {
  statusId: StatusEffectId;
  sourceId?: EntityId;
  stacks: number;
  remainingMs: number;
  durationMs: number;
  tickAccumulatorMs: number;
};

export type EnemyBehaviorState = {
  moveSpeed: number;
  preferredRange: number;
  fireRange: number;
  fireCooldownMs: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  projectileDamage: number;
  projectileDamageType: DamageType;
};

export type CombatEntity = RuntimeEntity & {
  resources?: CombatResources;
  projectile?: ProjectileState;
  statuses?: ActiveStatusEffect[];
  weaponCooldownMs?: number;
  enemyBehavior?: EnemyBehaviorState;
};

export type CombatState = {
  registry: EntityRegistry<CombatEntity>;
  playerId: EntityId;
  elapsedMs: number;
  nextProjectileIndex: number;
};
