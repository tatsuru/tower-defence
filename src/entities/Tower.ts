import Phaser from 'phaser';
import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';
import { TowerDef, TowerKind, TowerLevelDef } from '../data/towers';
import { Enemy } from './Enemy';

export class Tower {
  readonly kind: TowerKind;
  readonly col: number;
  readonly row: number;
  level: number = 0; // 0-indexed (Lv1 = index 0)

  private def: TowerDef;
  private cooldownMs: number = 0;
  private graphics: Phaser.GameObjects.Graphics;
  private effectGraphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, def: TowerDef, col: number, row: number) {
    this.scene = scene;
    this.def = def;
    this.kind = def.kind;
    this.col = col;
    this.row = row;

    this.graphics = scene.add.graphics();
    this.effectGraphics = scene.add.graphics();
    this.drawSelf();
  }

  get levelDef(): TowerLevelDef {
    return this.def.levels[this.level];
  }

  get centerX(): number {
    return GRID_OFFSET_X + this.col * CELL_SIZE + CELL_SIZE / 2;
  }

  get centerY(): number {
    return GRID_OFFSET_Y + this.row * CELL_SIZE + CELL_SIZE / 2;
  }

  get rangePixels(): number {
    return this.levelDef.range * CELL_SIZE;
  }

  canUpgrade(): boolean {
    return this.level < this.def.levels.length - 1;
  }

  get upgradeCost(): number {
    return this.levelDef.upgradeCost;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    this.level++;
    this.drawSelf();
  }

  update(deltaMs: number, enemies: Enemy[]): void {
    this.effectGraphics.clear();
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    if (this.cooldownMs > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    this.attack(target, enemies);
    this.cooldownMs = 1000 / this.levelDef.attacksPerSecond;
    this.drawAttackEffect(target, enemies);
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    const inRange = enemies.filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e));
    if (inRange.length === 0) return null;
    // 最も経路を進んでいる敵を優先
    return inRange.reduce((best, e) => (e.progress > best.progress ? e : best));
  }

  private inRange(enemy: Enemy): boolean {
    const dx = enemy.x - this.centerX;
    const dy = enemy.y - this.centerY;
    return dx * dx + dy * dy <= this.rangePixels * this.rangePixels;
  }

  private attack(target: Enemy, enemies: Enemy[]): void {
    const ld = this.levelDef;
    switch (this.def.attackType) {
      case 'single':
        target.takeDamage(ld.damage);
        break;
      case 'area':
        enemies
          .filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e))
          .forEach((e) => e.takeDamage(ld.damage));
        break;
      case 'slow':
        target.takeDamage(ld.damage);
        target.applySlow();
        break;
      case 'dot':
        target.applyDot(ld.damage);
        break;
    }
  }

  private drawAttackEffect(target: Enemy, enemies: Enemy[]): void {
    const g = this.effectGraphics;
    g.clear();

    if (this.def.attackType === 'area') {
      // 範囲攻撃：射程円をフラッシュ
      g.lineStyle(2, this.levelDef.color, 0.7);
      g.strokeCircle(this.centerX, this.centerY, this.rangePixels);
    } else {
      // 単体：対象への射線
      g.lineStyle(2, this.levelDef.color, 0.9);
      g.beginPath();
      g.moveTo(this.centerX, this.centerY);
      g.lineTo(target.x, target.y);
      g.strokePath();
    }

    // 1フレームだけ表示するためにすぐ消す予定だが、
    // Phaser は update ごとに clear() するのでそのままでよい
    void enemies;
  }

  showRangeCircle(show: boolean): void {
    const g = this.effectGraphics;
    g.clear();
    if (show) {
      g.lineStyle(1, 0xffffff, 0.35);
      g.strokeCircle(this.centerX, this.centerY, this.rangePixels);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.effectGraphics.destroy();
  }

  private drawSelf(): void {
    const g = this.graphics;
    g.clear();

    const ld = this.levelDef;
    const cx = this.centerX;
    const cy = this.centerY;
    const half = (CELL_SIZE * ld.size) / 2;

    // ベース（四角）
    g.fillStyle(ld.color);
    g.fillRect(cx - half, cy - half, half * 2, half * 2);

    // レベルに応じた装飾
    if (this.level >= 1) {
      // Lv2: 内側に明るい枠
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeRect(cx - half + 3, cy - half + 3, (half - 3) * 2, (half - 3) * 2);
    }
    if (this.level >= 2) {
      // Lv3: 中心に白い菱形
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(cx, cy - 6, cx + 6, cy, cx, cy + 6);
      g.fillTriangle(cx, cy - 6, cx - 6, cy, cx, cy + 6);
    }

    // タワー種別アイコン（文字）
    const icons: Record<string, string> = {
      archer: '弓',
      mage: '魔',
      cannon: '砲',
      ice: '氷',
      fire: '炎',
    };
    // テキストは初回のみ追加（再描画で増えないよう名前で管理）
    const textKey = `tower_label_${this.col}_${this.row}`;
    if (!this.scene.children.getByName(textKey)) {
      this.scene.add
        .text(cx, cy, icons[this.kind] ?? '?', {
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setName(textKey);
    }
  }
}
