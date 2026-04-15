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
const INFO_Y = PANEL_Y + BUTTON_H + 12; // ボタン下の説明エリア開始Y

export class TowerPanel {
  private bg: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private nameTexts: Phaser.GameObjects.Text[] = [];
  private costTexts: Phaser.GameObjects.Text[] = [];

  // パネル内の固定説明エリア
  private infoText: Phaser.GameObjects.Text;

  selectedKind: TowerKind | null = null;
  private hoveredKind: TowerKind | null = null;
  private state: GameState;
  private startX: number;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.state = state;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, PANEL_Y - 4, SCREEN_WIDTH, BOTTOM_PANEL_HEIGHT + 4);

    // 説明エリアの区切り線
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x334455);
    divider.beginPath();
    divider.moveTo(16, INFO_Y - 4);
    divider.lineTo(SCREEN_WIDTH - 16, INFO_Y - 4);
    divider.strokePath();

    this.infoText = scene.add.text(SCREEN_WIDTH / 2, INFO_Y, '', {
      fontSize: '13px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5, 0);

    const totalW = TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
    this.startX = (SCREEN_WIDTH - totalW) / 2;

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
        .on('pointerover', () => {
          this.hoveredKind = kind;
          this.updateInfo();
        })
        .on('pointerout', () => {
          this.hoveredKind = null;
          this.updateInfo();
        })
        .on('pointerdown', () => {
          if (state.gold >= def.cost) {
            this.selectedKind = this.selectedKind === kind ? null : kind;
            this.render(state);
            this.updateInfo();
          }
        });
    });

    this.render(state);
    state.subscribe(() => this.render(state));
  }

  private updateInfo(): void {
    const kind = this.hoveredKind ?? this.selectedKind;
    if (!kind) {
      this.infoText.setText('');
      return;
    }

    const def = TOWER_DEFS[kind];
    const hints = getSynergyHints(kind);

    const lines: string[] = [
      `${def.name}：${def.description}`,
    ];
    if (hints.length > 0) {
      lines.push('── シナジー ──');
      lines.push(...hints);
    }

    this.infoText.setText(lines);
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
    this.updateInfo();
  }
}
