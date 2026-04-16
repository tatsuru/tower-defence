import Phaser from 'phaser';
import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';
import { TowerDef, TowerKind, TowerLevelDef } from '../data/towers';
import { SYNERGY_DEFS, SynergyBonus, findSynergy, mergeBonuses } from '../data/synergies';
import { Enemy } from './Enemy';
import { soundManager } from '../audio/SoundManager';
import { GameState } from '../state/GameState';

export class Tower {
  readonly kind: TowerKind;
  readonly col: number;
  readonly row: number;
  level: number = 0;
  totalCost: number;
  totalDamageDealt: number = 0;
  killCount: number = 0;

  private def: TowerDef;
  private state: GameState;
  private cooldownMs: number = 0;
  private graphics: Phaser.GameObjects.Graphics;
  private effectGraphics: Phaser.GameObjects.Graphics;
  private synergyGraphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  // 現在適用中のシナジーボーナス（毎フレームではなく配置変更時に再計算）
  private synergyBonus: SynergyBonus = {};
  private synergyLabels: string[] = [];

  constructor(scene: Phaser.Scene, state: GameState, def: TowerDef, col: number, row: number) {
    this.scene = scene;
    this.state = state;
    this.def = def;
    this.kind = def.kind;
    this.col = col;
    this.row = row;
    this.totalCost = def.cost;

    this.graphics = scene.add.graphics();
    this.effectGraphics = scene.add.graphics();
    this.synergyGraphics = scene.add.graphics();
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
    const base = this.levelDef.range + (this.synergyBonus.rangeBonus ?? 0);
    return base * CELL_SIZE;
  }

  get effectiveDamage(): number {
    return Math.round(this.levelDef.damage * (this.synergyBonus.damageMultiplier ?? 1));
  }

  get effectiveAttacksPerSecond(): number {
    return this.levelDef.attacksPerSecond * (this.synergyBonus.attackSpeedMultiplier ?? 1);
  }

  get activeSynergyLabels(): string[] {
    return this.synergyLabels;
  }

  get activeBonus(): SynergyBonus {
    return this.synergyBonus;
  }

  canUpgrade(): boolean {
    return this.level < this.def.levels.length - 1;
  }

  get upgradeCost(): number {
    return this.levelDef.upgradeCost;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    this.totalCost += this.levelDef.upgradeCost;
    this.level++;
    this.drawSelf();
  }

  /** 配置変更時に GameScene から呼ばれる */
  recalcSynergy(neighbors: Tower[]): void {
    const bonuses: SynergyBonus[] = [];
    const labels: string[] = [];

    for (const nb of neighbors) {
      const bonus = findSynergy(this.kind, nb.kind);
      if (bonus) {
        bonuses.push(bonus);
        // ラベルを重複なく収集
        const def = this.getSynergyLabel(this.kind, nb.kind);
        if (def && !labels.includes(def)) labels.push(def);
      }
    }

    this.synergyBonus = mergeBonuses(bonuses);
    this.synergyLabels = labels;
    this.drawSynergyIndicator();
  }

  private getSynergyLabel(a: TowerKind, b: TowerKind): string | null {
    for (const def of SYNERGY_DEFS) {
      if (def.kinds[0] === a && def.kinds[1] === b) return def.label;
      if (def.kinds[1] === a && def.kinds[0] === b && def.target === 'both') return def.label;
    }
    return null;
  }

  update(deltaMs: number, enemies: Enemy[]): void {
    this.effectGraphics.clear();
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    if (this.cooldownMs > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    this.attack(target, enemies);
    this.cooldownMs = 1000 / this.effectiveAttacksPerSecond;
    this.drawAttackEffect(target, enemies);
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    const inRange = enemies.filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e));
    if (inRange.length === 0) return null;
    return inRange.reduce((best, e) => (e.progress > best.progress ? e : best));
  }

  private inRange(enemy: Enemy): boolean {
    const dx = enemy.x - this.centerX;
    const dy = enemy.y - this.centerY;
    return dx * dx + dy * dy <= this.rangePixels * this.rangePixels;
  }

  private calcDamage(base: number, target: Enemy): number {
    const isArmored = target.def.traits.includes('armored');
    const isPiercing = this.def.attackType === 'area';
    const afterArmor = isArmored && !isPiercing ? Math.ceil(base * 0.5) : base;
    return Math.round(afterArmor * (this.synergyBonus.damageMultiplier ?? 1));
  }

  private attack(target: Enemy, enemies: Enemy[]): void {
    soundManager.playAttack(this.kind);
    const ld = this.levelDef;
    switch (this.def.attackType) {
      case 'single': {
        const dealt = target.takeDamage(this.calcDamage(ld.damage, target));
        this.totalDamageDealt += dealt;
        this.state.addScore(dealt);
        if (target.isDead) { this.killCount++; this.state.addScore(100); }
        break;
      }
      case 'area':
        enemies
          .filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e))
          .forEach((e) => {
            const dealt = e.takeDamage(Math.round(ld.damage * (this.synergyBonus.damageMultiplier ?? 1)));
            this.totalDamageDealt += dealt;
            this.state.addScore(dealt);
            if (e.isDead) { this.killCount++; this.state.addScore(100); }
          });
        break;
      case 'slow': {
        const dealt = target.takeDamage(this.calcDamage(ld.damage, target));
        this.totalDamageDealt += dealt;
        this.state.addScore(dealt);
        if (target.isDead) { this.killCount++; this.state.addScore(100); }
        target.applySlow();
        break;
      }
      case 'dot':
        // DoTのダメージはEnemy側で経時処理されるため直接計上しない
        target.applyDot(Math.round(ld.damage * (this.synergyBonus.damageMultiplier ?? 1)));
        break;
    }
  }

  private drawAttackEffect(target: Enemy, enemies: Enemy[]): void {
    const g = this.effectGraphics;
    g.clear();

    if (this.def.attackType === 'area') {
      g.lineStyle(2, this.levelDef.color, 0.7);
      g.strokeCircle(this.centerX, this.centerY, this.rangePixels);
    } else {
      g.lineStyle(2, this.levelDef.color, 0.9);
      g.beginPath();
      g.moveTo(this.centerX, this.centerY);
      g.lineTo(target.x, target.y);
      g.strokePath();
    }

    void enemies;
  }

  getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
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
    this.synergyGraphics.destroy();
    const textKey = `tower_label_${this.col}_${this.row}`;
    this.scene.children.getByName(textKey)?.destroy();
    const synergyKey = `synergy_label_${this.col}_${this.row}`;
    this.scene.children.getByName(synergyKey)?.destroy();
  }

  private drawSynergyIndicator(): void {
    const g = this.synergyGraphics;
    g.clear();

    const hasBonus = this.synergyLabels.length > 0;
    if (hasBonus) {
      // シナジー発動中: 金色のリング
      g.lineStyle(2, 0xffd700, 0.8);
      g.strokeCircle(this.centerX, this.centerY, CELL_SIZE * 0.48);
    }

    // シナジーラベルテキスト
    const synergyKey = `synergy_label_${this.col}_${this.row}`;
    let labelText = this.scene.children.getByName(synergyKey) as Phaser.GameObjects.Text | null;
    if (!labelText) {
      labelText = this.scene.add
        .text(this.centerX, this.centerY - CELL_SIZE * 0.5 + 2, '', {
          fontSize: '8px',
          color: '#ffd700',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 1)
        .setName(synergyKey);
    }
    labelText.setText(hasBonus ? this.synergyLabels.join(' ') : '');
  }

  private drawSelf(): void {
    const g = this.graphics;
    g.clear();

    const ld = this.levelDef;
    const cx = this.centerX;
    const cy = this.centerY;
    const half = (CELL_SIZE * ld.size) / 2;

    g.fillStyle(ld.color);
    g.fillRect(cx - half, cy - half, half * 2, half * 2);

    if (this.level >= 1) {
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeRect(cx - half + 3, cy - half + 3, (half - 3) * 2, (half - 3) * 2);
    }
    if (this.level >= 2) {
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(cx, cy - 6, cx + 6, cy, cx, cy + 6);
      g.fillTriangle(cx, cy - 6, cx - 6, cy, cx, cy + 6);
    }

    const icons: Record<string, string> = {
      archer: '弓', mage: '魔', cannon: '砲', ice: '氷', fire: '炎',
    };
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
