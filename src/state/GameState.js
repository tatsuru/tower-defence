import { INITIAL_GOLD, INITIAL_LIVES } from '../data/waves';
export class GameState {
    constructor() {
        Object.defineProperty(this, "gold", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: INITIAL_GOLD
        });
        Object.defineProperty(this, "lives", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: INITIAL_LIVES
        });
        Object.defineProperty(this, "wave", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        }); // 現在のウェーブ番号（準備中は次のウェーブ番号）
        Object.defineProperty(this, "phase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'preparation'
        });
        Object.defineProperty(this, "score", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        // イベント購読（値変化時に呼ばれるコールバック）
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
    }
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    notify() {
        this.listeners.forEach((fn) => fn());
    }
    addScore(points) {
        this.score += points;
        this.notify();
    }
    addGold(amount) {
        this.gold += amount;
        this.notify();
    }
    spendGold(amount) {
        if (this.gold < amount)
            return false;
        this.gold -= amount;
        this.notify();
        return true;
    }
    loseLife() {
        this.lives = Math.max(0, this.lives - 1);
        if (this.lives === 0)
            this.phase = 'gameover';
        this.notify();
    }
    startWave() {
        this.wave += 1;
        this.phase = 'wave';
        this.notify();
    }
    endWave() {
        if (this.phase !== 'gameover') {
            this.phase = 'preparation';
        }
        this.notify();
    }
    reset() {
        this.gold = INITIAL_GOLD;
        this.lives = INITIAL_LIVES;
        this.wave = 0;
        this.score = 0;
        this.phase = 'preparation';
        this.notify();
    }
}
