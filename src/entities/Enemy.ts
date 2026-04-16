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
  waypointIndex: number = 0;
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
  constructor(
    scene: Phaser.Scene,
    def: EnemyDef,
    wave: number,
    path: { col: number; row: number }[],
    startWaypointIndex?: number,
  ) {
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

  /** 実際に与えたダメージ量を返す */
  takeDamage(amount: number): number {
    if (this.isDead) return 0;
    const actual = Math.min(amount, this.hp);
    this.hp -= actual;
    if (this.hp === 0) this.isDead = true;
    return actual;
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

  applyPercentDot(percentPerTick: number): void {
    // 最大HPの%をフラットダメージに変換してDoTとして適用
    const damagePerTick = Math.max(1, Math.round(this.maxHp * percentPerTick / 100));
    this.applyDot(damagePerTick);
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

  private lerpColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    return (Math.round(r1 + (r2 - r1) * t) << 16)
         | (Math.round(g1 + (g2 - g1) * t) << 8)
         |  Math.round(b1 + (b2 - b1) * t);
  }

  private drawSelf(): void {
    const g = this.bodyCircle;
    g.clear();

    const isSlowed = this.isSlowed();
    const color = isSlowed ? this.lerpColor(this.def.color, 0x88ccff, 0.4) : this.def.color;
    const x = this.x, y = this.y, r = this.def.radius;

    switch (this.def.kind) {
      case 'goblin':       this.drawGoblin(g, x, y, r, color); break;
      case 'orc':          this.drawOrc(g, x, y, r, color); break;
      case 'dragon':       this.drawDragon(g, x, y, r, color); break;
      case 'goblin_split': this.drawGoblinSplit(g, x, y, r, color); break;
    }

    if (isSlowed) {
      g.lineStyle(2, 0x00cfff, 0.8);
      g.strokeCircle(x, y, r + 2);
    }
    if (this.dotState) {
      g.lineStyle(2, 0xff6600, 0.9);
      g.strokeCircle(x, y, r + (isSlowed ? 4 : 2));
    }
    if (this.def.traits.includes('armored')) {
      g.lineStyle(3, 0xb0bec5, 0.9);
      g.strokeCircle(x, y, r + 4);
    }

    this.drawHpBar();
  }

  private drawGoblin(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    // 耳（本体より先に描いて後ろに隠す）
    g.fillStyle(this.lerpColor(color, 0x000000, 0.25));
    g.fillTriangle(x - 6, y - r + 1, x - 9, y - r - 6, x - 2, y - r - 1);
    g.fillTriangle(x + 6, y - r + 1, x + 9, y - r - 6, x + 2, y - r - 1);
    // 本体
    g.fillStyle(color);
    g.fillCircle(x, y, r);
    // 目
    g.fillStyle(0xffee58);
    g.fillCircle(x - 3, y - 2, 2.2);
    g.fillCircle(x + 3, y - 2, 2.2);
    g.fillStyle(0x1a1a1a);
    g.fillCircle(x - 3, y - 2, 1.1);
    g.fillCircle(x + 3, y - 2, 1.1);
    // 口（歯）
    g.fillStyle(0xfafafa);
    g.fillRect(x - 3, y + 3, 2, 3);
    g.fillRect(x + 1, y + 3, 2, 3);
  }

  private drawOrc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    // 本体
    g.fillStyle(color);
    g.fillCircle(x, y, r);
    // 輪郭
    g.lineStyle(2, this.lerpColor(color, 0x000000, 0.35), 0.9);
    g.strokeCircle(x, y, r);
    // 目
    g.fillStyle(0xff1744);
    g.fillCircle(x - 4, y - 4, 3);
    g.fillCircle(x + 4, y - 4, 3);
    g.fillStyle(0x1a1a1a);
    g.fillCircle(x - 4, y - 4, 1.5);
    g.fillCircle(x + 4, y - 4, 1.5);
    // 眉（怒り）
    g.lineStyle(2, 0x1a1a1a, 0.9);
    g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x - 1, y - 6); g.strokePath();
    g.beginPath(); g.moveTo(x + 7, y - 7); g.lineTo(x + 1, y - 6); g.strokePath();
    // 牙
    g.fillStyle(0xfff9c4);
    g.fillTriangle(x - 4, y + 3, x - 6, y + 9, x - 2, y + 3);
    g.fillTriangle(x + 4, y + 3, x + 6, y + 9, x + 2, y + 3);
  }

  private drawDragon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    // 翼（本体より後ろ）
    const wingColor = this.lerpColor(color, 0x000000, 0.3);
    g.fillStyle(wingColor, 0.85);
    g.fillTriangle(x - r + 2, y - 4, x - r - 12, y - 12, x - r - 10, y + 8);
    g.fillTriangle(x + r - 2, y - 4, x + r + 12, y - 12, x + r + 10, y + 8);
    // 本体
    g.fillStyle(color);
    g.fillCircle(x, y, r);
    // 背中のスパイク
    const spikeColor = this.lerpColor(color, 0xffa000, 0.6);
    g.fillStyle(spikeColor);
    g.fillTriangle(x,     y - r,     x - 4, y - r - 9,  x + 4, y - r - 9);
    g.fillTriangle(x - 8, y - r + 4, x - 12, y - r - 3, x - 4, y - r + 1);
    g.fillTriangle(x + 8, y - r + 4, x + 12, y - r - 3, x + 4, y - r + 1);
    // 目
    g.fillStyle(0xffffff);
    g.fillCircle(x - 5, y - 4, 4);
    g.fillCircle(x + 5, y - 4, 4);
    g.fillStyle(0x1a1a2e);
    g.fillCircle(x - 4, y - 3, 2.2);
    g.fillCircle(x + 4, y - 3, 2.2);
    // 鼻孔
    g.fillStyle(this.lerpColor(color, 0x000000, 0.45));
    g.fillCircle(x - 2, y + 5, 1.8);
    g.fillCircle(x + 2, y + 5, 1.8);
  }

  private drawGoblinSplit(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    g.fillStyle(color);
    g.fillCircle(x, y, r);
    g.fillStyle(0xffee58);
    g.fillCircle(x - 2, y - 1, 1.5);
    g.fillCircle(x + 2, y - 1, 1.5);
    g.fillStyle(0x1a1a1a);
    g.fillCircle(x - 2, y - 1, 0.8);
    g.fillCircle(x + 2, y - 1, 0.8);
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
