import Phaser from 'phaser';
import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';
import { EnemyDef, scaleHp } from '../data/enemies';
import { DOT_DURATION_MS, DOT_TICK_MS, SLOW_DURATION_MS, SLOW_FACTOR } from '../data/towers';

export type EnemyId = number;

let nextId = 1;

interface DoTState {
  damagePerTick: number;
  ticksRemaining: number;
  msUntilNextTick: number;
}

export class Enemy {
  readonly id: EnemyId;
  readonly def: EnemyDef;
  hp: number;
  maxHp: number;

  // ウェイポイント進行
  private path: { col: number; row: number }[];
  private waypointIndex: number = 0;
  // ピクセル座標（中心）
  x: number;
  y: number;

  // 状態エフェクト
  private slowMsRemaining: number = 0;
  private dotState: DoTState | null = null;

  // 死亡・拠点到達フラグ
  isDead: boolean = false;
  hasReachedExit: boolean = false;

  // 描画オブジェクト
  private bodyCircle!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, def: EnemyDef, wave: number, path: { col: number; row: number }[]) {
    this.id = nextId++;
    this.def = def;
    this.maxHp = scaleHp(def.baseHp, wave);
    this.hp = this.maxHp;
    this.path = path;

    const start = path[0];
    this.x = GRID_OFFSET_X + start.col * CELL_SIZE + CELL_SIZE / 2;
    this.y = GRID_OFFSET_Y + start.row * CELL_SIZE + CELL_SIZE / 2;
    this.waypointIndex = 1;

    this.bodyCircle = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.drawSelf();
  }

  update(deltaMs: number): void {
    if (this.isDead || this.hasReachedExit) return;

    this.updateSlow(deltaMs);
    this.updateDot(deltaMs);
    this.move(deltaMs);
    this.drawSelf();
  }

  private currentSpeed(): number {
    const base = this.def.speed * CELL_SIZE; // px/s
    return this.slowMsRemaining > 0 ? base * SLOW_FACTOR : base;
  }

  private move(deltaMs: number): void {
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
      } else {
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

  private updateSlow(deltaMs: number): void {
    if (this.slowMsRemaining > 0) {
      this.slowMsRemaining = Math.max(0, this.slowMsRemaining - deltaMs);
    }
  }

  private updateDot(deltaMs: number): void {
    if (!this.dotState) return;
    this.dotState.msUntilNextTick -= deltaMs;
    if (this.dotState.msUntilNextTick <= 0) {
      this.takeDamage(this.dotState.damagePerTick);
      this.dotState.ticksRemaining--;
      if (this.dotState.ticksRemaining <= 0) {
        this.dotState = null;
      } else {
        this.dotState.msUntilNextTick += DOT_TICK_MS;
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.isDead = true;
  }

  applySlow(): void {
    this.slowMsRemaining = SLOW_DURATION_MS;
  }

  applyDot(damagePerTick: number): void {
    const totalTicks = Math.floor(DOT_DURATION_MS / DOT_TICK_MS);
    if (!this.dotState) {
      this.dotState = {
        damagePerTick,
        ticksRemaining: totalTicks,
        msUntilNextTick: DOT_TICK_MS,
      };
    } else {
      // 重ねがけ：残りティックをリセットして強い方のダメージを採用
      this.dotState.damagePerTick = Math.max(this.dotState.damagePerTick, damagePerTick);
      this.dotState.ticksRemaining = totalTicks;
    }
  }

  isSlowed(): boolean {
    return this.slowMsRemaining > 0;
  }

  destroy(): void {
    this.bodyCircle.destroy();
    this.hpBar.destroy();
  }

  // 経路上での進捗（0〜1）。タワーがターゲット優先度を決めるために使う
  get progress(): number {
    return this.waypointIndex / this.path.length;
  }

  private drawSelf(): void {
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

    // DoT 時の炎リング
    if (this.dotState) {
      g.lineStyle(2, 0xff6600);
      g.strokeCircle(this.x, this.y, this.def.radius + 2);
    }

    this.drawHpBar();
  }

  private drawHpBar(): void {
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
