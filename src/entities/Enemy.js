import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';
import { scaleHp } from '../data/enemies';
import { DOT_DURATION_MS, DOT_TICK_MS, SLOW_DURATION_MS, SLOW_FACTOR } from '../data/towers';
let nextId = 1;
export class Enemy {
    constructor(scene, def, wave, path, startWaypointIndex) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "def", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "maxHp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // ウェイポイント進行
        Object.defineProperty(this, "path", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "waypointIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        // ピクセル座標（中心）
        Object.defineProperty(this, "x", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "y", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // 状態エフェクト
        Object.defineProperty(this, "slowMsRemaining", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "dotState", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // 死亡・拠点到達フラグ
        Object.defineProperty(this, "isDead", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "hasReachedExit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        // 描画オブジェクト
        Object.defineProperty(this, "bodyCircle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hpBar", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.id = nextId++;
        this.def = def;
        this.maxHp = scaleHp(def.baseHp, wave);
        this.hp = this.maxHp;
        this.path = path;
        const wpIdx = startWaypointIndex ?? 1;
        this.waypointIndex = Math.min(wpIdx, path.length - 1);
        const startPoint = path[Math.max(0, this.waypointIndex - 1)];
        this.x = GRID_OFFSET_X + startPoint.col * CELL_SIZE + CELL_SIZE / 2;
        this.y = GRID_OFFSET_Y + startPoint.row * CELL_SIZE + CELL_SIZE / 2;
        this.bodyCircle = scene.add.graphics();
        this.hpBar = scene.add.graphics();
        this.drawSelf();
    }
    update(deltaMs) {
        if (this.isDead || this.hasReachedExit)
            return;
        this.updateSlow(deltaMs);
        this.updateDot(deltaMs);
        this.move(deltaMs);
        this.drawSelf();
    }
    currentSpeed() {
        const base = this.def.speed * CELL_SIZE; // px/s
        return this.slowMsRemaining > 0 ? base * SLOW_FACTOR : base;
    }
    move(deltaMs) {
        let remaining = (this.currentSpeed() * deltaMs) / 1000;
        while (remaining > 0 && this.waypointIndex < this.path.length) {
            const target = this.path[this.waypointIndex];
            const tx = GRID_OFFSET_X + target.col * CELL_SIZE + CELL_SIZE / 2;
            const ty = GRID_OFFSET_Y + target.row * CELL_SIZE + CELL_SIZE / 2;
            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= remaining) {
                this.x = tx;
                this.y = ty;
                remaining -= dist;
                this.waypointIndex++;
            }
            else {
                const ratio = remaining / dist;
                this.x += dx * ratio;
                this.y += dy * ratio;
                remaining = 0;
            }
        }
        if (this.waypointIndex >= this.path.length) {
            this.hasReachedExit = true;
        }
    }
    updateSlow(deltaMs) {
        if (this.slowMsRemaining > 0) {
            this.slowMsRemaining = Math.max(0, this.slowMsRemaining - deltaMs);
        }
    }
    updateDot(deltaMs) {
        if (!this.dotState)
            return;
        this.dotState.msUntilNextTick -= deltaMs;
        if (this.dotState.msUntilNextTick <= 0) {
            this.takeDamage(this.dotState.damagePerTick);
            this.dotState.ticksRemaining--;
            if (this.dotState.ticksRemaining <= 0) {
                this.dotState = null;
            }
            else {
                this.dotState.msUntilNextTick += DOT_TICK_MS;
            }
        }
    }
    /** 実際に与えたダメージ量を返す */
    takeDamage(amount) {
        if (this.isDead)
            return 0;
        const actual = Math.min(amount, this.hp);
        this.hp -= actual;
        if (this.hp === 0)
            this.isDead = true;
        return actual;
    }
    applySlow() {
        this.slowMsRemaining = SLOW_DURATION_MS;
    }
    applyDot(damagePerTick) {
        const totalTicks = Math.floor(DOT_DURATION_MS / DOT_TICK_MS);
        if (!this.dotState) {
            this.dotState = {
                damagePerTick,
                ticksRemaining: totalTicks,
                msUntilNextTick: DOT_TICK_MS,
            };
        }
        else {
            // 重ねがけ：残りティックをリセットして強い方のダメージを採用
            this.dotState.damagePerTick = Math.max(this.dotState.damagePerTick, damagePerTick);
            this.dotState.ticksRemaining = totalTicks;
        }
    }
    isSlowed() {
        return this.slowMsRemaining > 0;
    }
    destroy() {
        this.bodyCircle.destroy();
        this.hpBar.destroy();
    }
    // 経路上での進捗（0〜1）。タワーがターゲット優先度を決めるために使う
    get progress() {
        return this.waypointIndex / this.path.length;
    }
    drawSelf() {
        const g = this.bodyCircle;
        g.clear();
        const color = this.isSlowed() ? 0xaaddff : this.def.color;
        g.fillStyle(color);
        g.fillCircle(this.x, this.y, this.def.radius);
        // スロー時のリング
        if (this.isSlowed()) {
            g.lineStyle(2, 0x00cfff);
            g.strokeCircle(this.x, this.y, this.def.radius + 2);
        }
        // 装甲持ちの六角形リング
        if (this.def.traits.includes('armored')) {
            g.lineStyle(3, 0xb0bec5, 0.9);
            g.strokeCircle(this.x, this.y, this.def.radius + 3);
        }
        // DoT 時の炎リング
        if (this.dotState) {
            g.lineStyle(2, 0xff6600);
            g.strokeCircle(this.x, this.y, this.def.radius + 2);
        }
        this.drawHpBar();
    }
    drawHpBar() {
        const bar = this.hpBar;
        bar.clear();
        const barW = this.def.radius * 2 + 4;
        const barH = 4;
        const bx = this.x - barW / 2;
        const by = this.y - this.def.radius - 8;
        bar.fillStyle(0x333333);
        bar.fillRect(bx, by, barW, barH);
        const ratio = this.hp / this.maxHp;
        const hpColor = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffff00 : 0xff4444;
        bar.fillStyle(hpColor);
        bar.fillRect(bx, by, barW * ratio, barH);
    }
}
