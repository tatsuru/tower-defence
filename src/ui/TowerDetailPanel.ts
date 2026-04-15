import Phaser from 'phaser';
import { Tower } from '../entities/Tower';
import { GameState } from '../state/GameState';
import { TOWER_DEFS } from '../data/towers';

export const SELL_REFUND_RATE = 0.6;

export class TowerDetailPanel {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private upgradeLabel: Phaser.GameObjects.Text;
  private sellLabel: Phaser.GameObjects.Text;
  private selectedTower: Tower | null = null;
  private state: GameState;
  private onSell: (tower: Tower) => void;

  constructor(scene: Phaser.Scene, state: GameState, onSell: (tower: Tower) => void) {
    this.state = state;
    this.onSell = onSell;

    const px = scene.scale.width - 200;
    const py = 52;
    const pw = 190;
    const ph = 160;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e, 0.9);
    this.bg.fillRoundedRect(px, py, pw, ph, 6);
    this.bg.lineStyle(1, 0x445566);
    this.bg.strokeRoundedRect(px, py, pw, ph, 6);
    this.bg.setVisible(false);

    this.text = scene.add
      .text(px + 10, py + 8, '', { fontSize: '12px', color: '#ffffff', lineSpacing: 4 })
      .setVisible(false);

    // 強化ボタン
    this.upgradeLabel = scene.add
      .text(px + pw / 2, py + ph - 52, '', { fontSize: '13px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(false);

    scene.add
      .zone(px + 10, py + ph - 66, pw - 20, 26)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.onUpgradeClick());

    // 売却ボタン
    this.sellLabel = scene.add
      .text(px + pw / 2, py + ph - 20, '', { fontSize: '12px', color: '#ff9999' })
      .setOrigin(0.5)
      .setVisible(false);

    scene.add
      .zone(px + 10, py + ph - 34, pw - 20, 26)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.onSellClick());

    state.subscribe(() => {
      if (this.selectedTower) this.render();
    });
  }

  show(tower: Tower): void {
    this.selectedTower = tower;
    tower.showRangeCircle(true);
    this.render();
  }

  hide(): void {
    if (this.selectedTower) {
      this.selectedTower.showRangeCircle(false);
      this.selectedTower = null;
    }
    this.bg.setVisible(false);
    this.text.setVisible(false);
    this.upgradeLabel.setVisible(false);
    this.sellLabel.setVisible(false);
  }

  private render(): void {
    const tower = this.selectedTower;
    if (!tower) return;

    const def = TOWER_DEFS[tower.kind];
    const ld = tower.levelDef;
    const levelNames = ['Lv1', 'Lv2', 'Lv3'];
    const refund = Math.floor(tower.totalCost * SELL_REFUND_RATE);

    const synergyLabels = tower.activeSynergyLabels;
    const hasBonus = synergyLabels.length > 0;

    const fmtDmg = hasBonus
      ? `${ld.damage} → ${tower.effectiveDamage}`
      : `${ld.damage}`;
    const fmtSpd = hasBonus
      ? `${ld.attacksPerSecond.toFixed(1)} → ${tower.effectiveAttacksPerSecond.toFixed(1)}/s`
      : `${ld.attacksPerSecond.toFixed(1)}/s`;
    const effectiveRange = ld.range + (tower.activeBonus.rangeBonus ?? 0);
    const fmtRange = hasBonus
      ? `${ld.range} → ${effectiveRange.toFixed(1)}マス`
      : `${ld.range}マス`;

    const synergyLine = hasBonus
      ? `\n★ ${synergyLabels.join(' / ')}`
      : '';

    this.text.setText(
      `${def.name} [${levelNames[tower.level]}]\n` +
      `ダメージ: ${fmtDmg}\n` +
      `攻撃速度: ${fmtSpd}\n` +
      `射程: ${fmtRange}` +
      synergyLine,
    );

    const canUp = tower.canUpgrade();
    const canPay = this.state.gold >= tower.upgradeCost;

    if (canUp) {
      const label = canPay ? `強化 ${tower.upgradeCost}G` : `強化 ${tower.upgradeCost}G (G不足)`;
      this.upgradeLabel.setText(label).setColor(canPay ? '#ffd700' : '#888888');
    } else {
      this.upgradeLabel.setText('最大レベル').setColor('#aaaaaa');
    }

    this.sellLabel.setText(`売却 +${refund}G`);

    this.bg.setVisible(true);
    this.text.setVisible(true);
    this.upgradeLabel.setVisible(true);
    this.sellLabel.setVisible(true);
  }

  private onUpgradeClick(): void {
    const tower = this.selectedTower;
    if (!tower || !tower.canUpgrade()) return;
    if (!this.state.spendGold(tower.upgradeCost)) return;
    tower.upgrade();
    this.render();
  }

  private onSellClick(): void {
    const tower = this.selectedTower;
    if (!tower) return;
    const refund = Math.floor(tower.totalCost * SELL_REFUND_RATE);
    this.state.addGold(refund);
    this.onSell(tower);
    this.hide();
  }

  get currentTower(): Tower | null {
    return this.selectedTower;
  }
}
