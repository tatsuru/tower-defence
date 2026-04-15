import Phaser from 'phaser';
import {
  BOTTOM_PANEL_HEIGHT,
  GRID_OFFSET_Y,
  GRID_ROWS,
  CELL_SIZE,
  SCREEN_WIDTH,
} from '../constants';
import { TOWER_DEFS, TOWER_KINDS, TowerKind } from '../data/towers';
import { getSynergyHints } from '../data/synergies';
import { GameState } from '../state/GameState';

const PANEL_Y = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + 4;
const BUTTON_W = 148;
const BUTTON_H = 64;
const BUTTON_GAP = 8;

export class TowerPanel {
  private bg: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private nameTexts: Phaser.GameObjects.Text[] = [];
  private costTexts: Phaser.GameObjects.Text[] = [];

  // ホバー時にパネル上部に表示するツールチップ
  private tooltipBg: Phaser.GameObjects.Graphics;
  private tooltipText: Phaser.GameObjects.Text;

  selectedKind: TowerKind | null = null;
  private state: GameState;
  private startX: number;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.state = state;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, PANEL_Y - 4, SCREEN_WIDTH, BOTTOM_PANEL_HEIGHT + 4);

    const totalW = TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
    this.startX = (SCREEN_WIDTH - totalW) / 2;

    // ツールチップ（パネル上端に表示）
    const tooltipY = PANEL_Y - 32;
    this.tooltipBg = scene.add.graphics().setDepth(15);
    this.tooltipText = scene.add
      .text(SCREEN_WIDTH / 2, tooltipY + 6, '', {
        fontSize: '13px',
        color: '#dddddd',
        align: 'left',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(15);
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);

    TOWER_KINDS.forEach((kind, i) => {
      const def = TOWER_DEFS[kind];
      const bx = this.startX + i * (BUTTON_W + BUTTON_GAP);
      const by = PANEL_Y + 4;

      const btn = scene.add.graphics();
      this.buttons.push(btn);

      const nameText = scene.add
        .text(bx + BUTTON_W / 2, by + 14, def.name, {
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0);
      this.nameTexts.push(nameText);

      const costText = scene.add
        .text(bx + BUTTON_W / 2, by + 36, `${def.cost}G`, {
          fontSize: '14px',
          color: '#ffd700',
        })
        .setOrigin(0.5, 0);
      this.costTexts.push(costText);

      scene.add
        .zone(bx, by, BUTTON_W, BUTTON_H)
        .setOrigin(0, 0)
        .setInteractive()
        .on('pointerover', () => this.showTooltip(kind))
        .on('pointerout', () => this.hideTooltip())
        .on('pointerdown', () => {
          if (state.gold >= def.cost) {
            this.selectedKind = this.selectedKind === kind ? null : kind;
            this.render(state);
          }
        });
    });

    this.render(state);
    state.subscribe(() => this.render(state));
  }

  private showTooltip(kind: TowerKind): void {
    const def = TOWER_DEFS[kind];
    const hints = getSynergyHints(kind);

    const lines = [
      `${def.name}：${def.description}`,
      ...(hints.length > 0 ? ['── シナジー ──', ...hints] : []),
    ];

    // テキストを先にセットして実際のサイズを取得する
    this.tooltipText.setText(lines);

    const pad = 12;
    const tw = this.tooltipText.width + pad * 2;
    const th = this.tooltipText.height + pad * 2;

    // 画面右端からはみ出さないよう位置を調整
    const tx = Math.min(SCREEN_WIDTH / 2 - tw / 2, SCREEN_WIDTH - tw - 8);
    const ty = PANEL_Y - th - 4;

    this.tooltipText.setPosition(tx + pad, ty + pad).setOrigin(0, 0);

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x111122, 0.95);
    this.tooltipBg.fillRoundedRect(tx, ty, tw, th, 4);
    this.tooltipBg.lineStyle(1, 0x556677);
    this.tooltipBg.strokeRoundedRect(tx, ty, tw, th, 4);

    this.tooltipBg.setVisible(true);
    this.tooltipText.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
  }

  private render(state: GameState): void {
    TOWER_KINDS.forEach((kind, i) => {
      const def = TOWER_DEFS[kind];
      const bx = this.startX + i * (BUTTON_W + BUTTON_GAP);
      const by = PANEL_Y + 4;

      const affordable = state.gold >= def.cost;
      const selected = this.selectedKind === kind;
      const btn = this.buttons[i];
      btn.clear();

      const bgColor = selected ? 0x334455 : affordable ? 0x1e2a38 : 0x1a1a1a;
      btn.fillStyle(bgColor);
      btn.fillRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);

      const borderColor = selected ? 0x88ccff : affordable ? 0x445566 : 0x333333;
      btn.lineStyle(2, borderColor);
      btn.strokeRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);

      this.nameTexts[i].setColor(affordable ? '#ffffff' : '#555555');
      this.costTexts[i].setColor(affordable ? '#ffd700' : '#555500');

      void def;
    });
  }

  deselect(): void {
    this.selectedKind = null;
    this.render(this.state);
  }
}
