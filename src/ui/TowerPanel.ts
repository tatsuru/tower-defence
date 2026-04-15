import Phaser from 'phaser';
import {
  BOTTOM_PANEL_HEIGHT,
  GRID_OFFSET_Y,
  GRID_ROWS,
  CELL_SIZE,
  SCREEN_WIDTH,
} from '../constants';
import { TOWER_DEFS, TOWER_KINDS, TowerKind } from '../data/towers';
import { GameState } from '../state/GameState';

const PANEL_Y = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + 4;
const BUTTON_W = 150;
const BUTTON_H = 80;
const BUTTON_GAP = 8;

export class TowerPanel {
  private bg: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  selectedKind: TowerKind | null = null;
  private state: GameState;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.state = state;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, PANEL_Y - 4, SCREEN_WIDTH, BOTTOM_PANEL_HEIGHT + 4);

    const totalW = TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
    const startX = (SCREEN_WIDTH - totalW) / 2;

    TOWER_KINDS.forEach((kind, i) => {
      const def = TOWER_DEFS[kind];
      const bx = startX + i * (BUTTON_W + BUTTON_GAP);
      const by = PANEL_Y + 4;

      const btn = scene.add.graphics();
      this.buttons.push(btn);

      const label = scene.add
        .text(bx + BUTTON_W / 2, by + BUTTON_H / 2, '', {
          fontSize: '12px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);
      this.labels.push(label);

      // クリック判定用の透明ゾーン
      scene.add
        .zone(bx, by, BUTTON_W, BUTTON_H)
        .setOrigin(0, 0)
        .setInteractive()
        .on('pointerdown', () => {
          if (state.gold >= def.cost) {
            this.selectedKind = this.selectedKind === kind ? null : kind;
            this.render(state);
          }
        });

      void def;
    });

    this.render(state);
    state.subscribe(() => this.render(state));
  }

  private render(state: GameState): void {
    TOWER_KINDS.forEach((kind, i) => {
      const def = TOWER_DEFS[kind];
      const bx =
        (SCREEN_WIDTH - (TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP)) / 2 +
        i * (BUTTON_W + BUTTON_GAP);
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

      const nameColor = affordable ? '#ffffff' : '#666666';
      const costColor = affordable ? '#ffd700' : '#664400';

      this.labels[i].setText(`${def.name}\n${def.cost}G\n${def.description}`);
      this.labels[i].setColor(nameColor);
      void costColor;
    });
  }

  deselect(): void {
    this.selectedKind = null;
    this.render(this.state);
  }
}
