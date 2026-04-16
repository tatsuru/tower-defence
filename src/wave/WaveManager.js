import { ALL_ENEMY_DEFS } from '../data/enemies';
import { getWaveDef, PREPARATION_SECONDS } from '../data/waves';
import { Enemy } from '../entities/Enemy';
export class WaveManager {
    constructor(scene, state, path, onWaveComplete, callbacks) {
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "path", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "enemies", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "spawnQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "preparationMsRemaining", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "onWaveComplete", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "callbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoAdvance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.scene = scene;
        this.state = state;
        this.path = path;
        this.onWaveComplete = onWaveComplete;
        this.callbacks = callbacks;
        this.preparationMsRemaining = PREPARATION_SECONDS * 1000;
    }
    get preparationSecondsRemaining() {
        return Math.ceil(this.preparationMsRemaining / 1000);
    }
    skipPreparation() {
        if (this.state.phase === 'preparation') {
            this.preparationMsRemaining = 0;
        }
    }
    update(deltaMs) {
        if (this.state.phase === 'gameover')
            return;
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
    startNextWave() {
        this.state.startWave();
        this.callbacks.onWaveStart(this.state.wave);
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
    processSpawnQueue(deltaMs) {
        const toSpawn = [];
        const remaining = [];
        for (const task of this.spawnQueue) {
            task.remainingMs -= deltaMs;
            if (task.remainingMs <= 0) {
                toSpawn.push(task);
            }
            else {
                remaining.push(task);
            }
        }
        this.spawnQueue = remaining;
        for (const task of toSpawn) {
            this.spawnEnemy(task.kind);
        }
    }
    spawnEnemy(kind, waypointIndex) {
        const def = ALL_ENEMY_DEFS[kind];
        if (!def)
            return;
        const enemy = new Enemy(this.scene, def, this.state.wave, this.path, waypointIndex);
        this.enemies.push(enemy);
    }
    updateEnemies(deltaMs) {
        const toAdd = [];
        for (const enemy of this.enemies) {
            enemy.update(deltaMs);
            if (enemy.hasReachedExit && !enemy.isDead) {
                enemy.isDead = true;
                this.state.loseLife();
                this.callbacks.onLifeLost();
                enemy.destroy();
            }
            else if (enemy.isDead) {
                this.state.addGold(enemy.def.reward);
                const isBoss = enemy.def.kind === 'dragon';
                this.callbacks.onEnemyDeath(enemy.x, enemy.y, enemy.def.color, isBoss);
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
    handleWaveEnd() {
        this.state.addScore(this.state.wave * 200);
        this.state.endWave();
        if (this.state.phase !== 'gameover') {
            this.preparationMsRemaining = this.autoAdvance ? 2000 : PREPARATION_SECONDS * 1000;
            this.onWaveComplete?.();
        }
    }
    destroyAll() {
        for (const e of this.enemies)
            e.destroy();
        this.enemies = [];
    }
}
