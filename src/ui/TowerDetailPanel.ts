import Phaser from 'phaser';
import { Tower } from '../entities/Tower';
import { GameState } from '../state/GameState';
import { TOWER_DEFS } from '../data/towers';

export class TowerDetailPanel {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private upgradeBtn: Phaser.GameObjects.Graphics;
  private upgradeLabel: Phaser.GameObjects.Text;
  private selectedTower: Tower | null = null;
  private state: GameState;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.state = state;

    // 右上に固定で表示するパネル
    const px = scene.scale.width - 200;
    const py = 52;
    const pw = 190;
    const ph = 140;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e, 0.9);
    this.bg.fillRoundedRect(px, py, pw, ph, 6);
    this.bg.lineStyle(1, 0x445566);
    this.bg.strokeRoundedRect(px, py, pw, ph, 6);
    this.bg.setVisible(false);

    this.text = scene.add
      .text(px + 10, py + 8, '', { fontSize: '12px', color: '#ffffff', lineSpacing: 4 })
      .setVisible(false);

    this.upgradeBtn = scene.add.graphics();
    this.upgradeBtn.setVisible(false);

    this.upgradeLabel = scene.add
      .text(px + pw / 2, py + ph - 22, '', { fontSize: '13px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(false);

    scene.add
      .zone(px + 10, py + ph - 36, pw - 20, 28)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.onUpgradeClick());
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
    this.upgradeBtn.setVisible(false);
    this.upgradeLabel.setVisible(false);
  }

  private render(): void {
    const tower = this.selectedTower;
    if (!tower) return;

    const def = TOWER_DEFS[tower.kind];
    const ld = tower.levelDef;
    const levelNames = ['Lv1', 'Lv2', 'Lv3'];

    this.text.setText(
      `${def.name} [${levelNames[tower.level]}]\n` +
        `ダメージ: ${ld.damage}\n` +
        `攻撃速度: ${ld.attacksPerSecond.toFixed(1)}/s\n` +
        `射程: ${ld.range}マス`,
    );

    const canUp = tower.canUpgrade();
    const canPay = this.state.gold >= tower.upgradeCost;

    if (canUp) {
      const labelText = canPay
        ? `強化 ${tower.upgradeCost}G`
        : `強化 ${tower.upgradeCost}G (G不足)`;
      this.upgradeLabel.setText(labelText).setColor(canPay ? '#ffd700' : '#888888');
      this.upgradeBtn.setVisible(true);
      this.upgradeLabel.setVisible(true);
    } else {
      this.upgradeLabel.setText('最大レベル').setColor('#aaaaaa');
      this.upgradeBtn.setVisible(false);
      this.upgradeLabel.setVisible(true);
    }

    this.bg.setVisible(true);
    this.text.setVisible(true);
  }

  private onUpgradeClick(): void {
    const tower = this.selectedTower;
    if (!tower || !tower.canUpgrade()) return;
    if (!this.state.spendGold(tower.upgradeCost)) return;
    tower.upgrade();
    this.render();
  }

  get currentTower(): Tower | null {
    return this.selectedTower;
  }
}
