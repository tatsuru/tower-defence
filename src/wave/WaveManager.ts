import Phaser from 'phaser';
import { ENEMY_DEFS } from '../data/enemies';
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

  private spawnEnemy(kind: string): void {
    const def = ENEMY_DEFS[kind as keyof typeof ENEMY_DEFS];
    if (!def) return;
    const enemy = new Enemy(this.scene, def, this.state.wave, this.path);
    this.enemies.push(enemy);
  }

  private updateEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      enemy.update(deltaMs);

      if (enemy.hasReachedExit && !enemy.isDead) {
        enemy.isDead = true; // 以後の処理をスキップ
        this.state.loseLife();
        enemy.destroy();
      } else if (enemy.isDead) {
        this.state.addGold(enemy.def.reward);
        enemy.destroy();
      }
    }

    // 処理済みの敵を除去
    this.enemies = this.enemies.filter((e) => !e.isDead && !e.hasReachedExit);
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
