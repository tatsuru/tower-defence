import Phaser from 'phaser';
import { ALL_ENEMY_DEFS } from '../data/enemies';
import { getWaveDef, PREPARATION_SECONDS } from '../data/waves';
import { Enemy } from '../entities/Enemy';
import { GameState } from '../state/GameState';

type SpawnTask = { kind: string; remainingMs: number };

export class WaveManager {
  private scene: Phaser.Scene;
  private state: GameState;
  private path: { col: number; row: number }[];
  enemies: Enemy[] = [];

  private spawnQueue: SpawnTask[] = [];
  private preparationMsRemaining: number = 0;
  private onWaveComplete: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    state: GameState,
    path: { col: number; row: number }[],
    onWaveComplete: () => void,
  ) {
    this.scene = scene;
    this.state = state;
    this.path = path;
    this.onWaveComplete = onWaveComplete;
    // 最初の準備フェーズを開始
    this.preparationMsRemaining = PREPARATION_SECONDS * 1000;
  }

  get preparationSecondsRemaining(): number {
    return Math.ceil(this.preparationMsRemaining / 1000);
  }

  skipPreparation(): void {
    if (this.state.phase === 'preparation') {
      this.preparationMsRemaining = 0;
    }
  }

  update(deltaMs: number): void {
    if (this.state.phase === 'gameover') return;

    if (this.state.phase === 'preparation') {
      this.preparationMsRemaining -= deltaMs;
      if (this.preparationMsRemaining <= 0) {
        this.startNextWave();
      }
      return;
    }

    // ウェーブ中
    this.processSpawnQueue(deltaMs);
    this.updateEnemies(deltaMs);

    if (this.spawnQueue.length === 0 && this.enemies.every((e) => e.isDead || e.hasReachedExit)) {
      this.handleWaveEnd();
    }
  }

  private startNextWave(): void {
    this.state.startWave();
    const waveDef = getWaveDef(this.state.wave);
    this.spawnQueue = [];

    let totalDelay = 0;
    for (const entry of waveDef.entries) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({
          kind: entry.kind,
          remainingMs: totalDelay,
        });
        totalDelay += entry.intervalMs;
      }
    }
  }

  private processSpawnQueue(deltaMs: number): void {
    const toSpawn: SpawnTask[] = [];
    const remaining: SpawnTask[] = [];

    for (const task of this.spawnQueue) {
      task.remainingMs -= deltaMs;
      if (task.remainingMs <= 0) {
        toSpawn.push(task);
      } else {
        remaining.push(task);
      }
    }

    this.spawnQueue = remaining;

    for (const task of toSpawn) {
      this.spawnEnemy(task.kind);
    }
  }

  private spawnEnemy(kind: string, waypointIndex?: number): void {
    const def = ALL_ENEMY_DEFS[kind];
    if (!def) return;
    const enemy = new Enemy(this.scene, def, this.state.wave, this.path, waypointIndex);
    this.enemies.push(enemy);
  }

  private updateEnemies(deltaMs: number): void {
    const toAdd: Enemy[] = [];

    for (const enemy of this.enemies) {
      enemy.update(deltaMs);

      if (enemy.hasReachedExit && !enemy.isDead) {
        enemy.isDead = true;
        this.state.loseLife();
        enemy.destroy();
      } else if (enemy.isDead) {
        this.state.addGold(enemy.def.reward);
        // 分裂: 死亡地点のウェイポイントから小型ゴブリン2体スポーン
        if (enemy.def.traits.includes('splitting')) {
          const splitDef = ALL_ENEMY_DEFS['goblin_split'];
          if (splitDef) {
            for (let i = 0; i < 2; i++) {
              toAdd.push(new Enemy(this.scene, splitDef, this.state.wave, this.path, enemy.waypointIndex));
            }
          }
        }
        enemy.destroy();
      }
    }

    this.enemies = this.enemies.filter((e) => !e.isDead && !e.hasReachedExit);
    this.enemies.push(...toAdd);
  }

  private handleWaveEnd(): void {
    this.state.endWave();
    if (this.state.phase !== 'gameover') {
      this.preparationMsRemaining = PREPARATION_SECONDS * 1000;
      this.onWaveComplete?.();
    }
  }

  destroyAll(): void {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
  }
}
