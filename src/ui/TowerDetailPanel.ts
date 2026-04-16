import Phaser from 'phaser';
import { Tower } from '../entities/Tower';
import { GameState } from '../state/GameState';
import { TOWER_DEFS } from '../data/towers';

export const SELL_REFUND_RATE = 0.6;

export class TowerDetailPanel {
  private bg: Phaser.GameObjects.Graphics;
  private btnGraphics: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private upgradeLabel: Phaser.GameObjects.Text;
  private sellLabel: Phaser.GameObjects.Text;
  private selectedTower: Tower | null = null;
  private state: GameState;
  private onSell: (tower: Tower) => void;

  // ボタン領域の定数（constructor 内で設定）
  private readonly px: number;
  private readonly pw: number;
  private readonly upgBtnY: number;
  private readonly sellBtnY: number;
  private readonly btnH = 28;

  constructor(scene: Phaser.Scene, state: GameState, onSell: (tower: Tower) => void) {
    this.state = state;
    this.onSell = onSell;

    const px = scene.scale.width - 200;
    const py = 52;
    const pw = 190;
    const ph = 250;
    const btnH = this.btnH;
    const sellBtnY = py + ph - 10 - btnH;
    const upgBtnY = sellBtnY - 8 - btnH;

    this.px = px;
    this.pw = pw;
    this.upgBtnY = upgBtnY;
    this.sellBtnY = sellBtnY;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e, 0.9);
    this.bg.fillRoundedRect(px, py, pw, ph, 6);
    this.bg.lineStyle(1, 0x445566);
    this.bg.strokeRoundedRect(px, py, pw, ph, 6);
    // 区切り線
    this.bg.lineStyle(1, 0x334455, 0.8);
    this.bg.beginPath();
    this.bg.moveTo(px + 10, upgBtnY - 8);
    this.bg.lineTo(px + pw - 10, upgBtnY - 8);
    this.bg.strokePath();
    this.bg.setVisible(false);

    this.btnGraphics = scene.add.graphics().setVisible(false);

    this.text = scene.add
      .text(px + 10, py + 8, '', { fontSize: '12px', color: '#ffffff', lineSpacing: 4 })
      .setVisible(false);

    // 強化ボタン
    this.upgradeLabel = scene.add
      .text(px + pw / 2, upgBtnY + btnH / 2, '', { fontSize: '13px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(false);

    scene.add
      .zone(px + 10, upgBtnY, pw - 20, btnH)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.onUpgradeClick());

    // 売却ボタン
    this.sellLabel = scene.add
      .text(px + pw / 2, sellBtnY + btnH / 2, '', { fontSize: '12px', color: '#ffaaaa' })
      .setOrigin(0.5)
      .setVisible(false);

    scene.add
      .zone(px + 10, sellBtnY, pw - 20, btnH)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.onSellClick());

    state.subscribe(() => {
      if (this.selectedTower) this.render();
    });
  }

  show(tower: Tower): void {
    if (this.selectedTower && this.selectedTower !== tower) {
      this.selectedTower.showRangeCircle(false);
    }
    this.selectedTower = tower;
    tower.showRangeCircle(true);
    this.render();
  }

  /** クリック座標がパネル表示領域内かどうかを返す */
  hitTest(x: number, y: number): boolean {
    if (!this.selectedTower) return false;
    return x >= this.px && x <= this.px + this.pw &&
           y >= 52 && y <= 52 + 250;
  }

  hide(): void {
    if (this.selectedTower) {
      this.selectedTower.showRangeCircle(false);
      this.selectedTower = null;
    }
    this.bg.setVisible(false);
    this.btnGraphics.setVisible(false);
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

    const isDotPercent = def.attackType === 'dot';
    const fmtDmg = isDotPercent
      ? `${ld.damage.toFixed(1)}%/tick`
      : hasBonus
        ? `${ld.damage} → ${tower.effectiveDamage}`
        : `${ld.damage}`;
    const fmtSpd = hasBonus
      ? `${ld.attacksPerSecond.toFixed(1)} → ${tower.effectiveAttacksPerSecond.toFixed(1)}/s`
      : `${ld.attacksPerSecond.toFixed(1)}/s`;
    const effectiveRange = ld.range + (tower.activeBonus.rangeBonus ?? 0);
    const fmtRange = hasBonus
      ? `${ld.range} → ${effectiveRange.toFixed(1)}マス`
      : `${ld.range}マス`;

    // シナジー名を先頭に置くことで、以降の → がシナジー後の値だと分かる
    const synergyLine = hasBonus
      ? `★ ${synergyLabels.join('/')} (→はシナジー後)\n`
      : '';

    const dmgLabel = isDotPercent ? 'DoT(最大HP%)' : 'ダメージ';
    const killNote = def.attackType === 'dot' ? '' : ` / キル: ${tower.killCount}`;
    const dmgStat = def.attackType === 'dot'
      ? '(経時ダメージ・計上外)'
      : `${tower.totalDamageDealt}${killNote}`;

    this.text.setText(
      `${def.name} [${levelNames[tower.level]}]\n` +
      synergyLine +
      `${dmgLabel}: ${fmtDmg}\n` +
      `攻撃速度: ${fmtSpd}\n` +
      `射程: ${fmtRange}\n` +
      `累計: ${dmgStat}`,
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

    // ボタン背景を再描画
    const px = this.px;
    const pw = this.pw;
    const btnW = pw - 20;
    const btnH = this.btnH;

    this.btnGraphics.clear();
    const upgFill = canUp && canPay ? 0x2a1e00 : 0x1a1a1a;
    const upgBorder = canUp && canPay ? 0xffd700 : 0x444444;
    this.btnGraphics.fillStyle(upgFill);
    this.btnGraphics.fillRoundedRect(px + 10, this.upgBtnY, btnW, btnH, 4);
    this.btnGraphics.lineStyle(1, upgBorder, 0.9);
    this.btnGraphics.strokeRoundedRect(px + 10, this.upgBtnY, btnW, btnH, 4);

    this.btnGraphics.fillStyle(0x1a0000);
    this.btnGraphics.fillRoundedRect(px + 10, this.sellBtnY, btnW, btnH, 4);
    this.btnGraphics.lineStyle(1, 0xcc4444, 0.9);
    this.btnGraphics.strokeRoundedRect(px + 10, this.sellBtnY, btnW, btnH, 4);

    this.bg.setVisible(true);
    this.btnGraphics.setVisible(true);
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
