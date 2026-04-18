import Phaser from 'phaser';
import {
  BOTTOM_PANEL_HEIGHT,
  GRID_OFFSET_Y,
  GRID_ROWS,
  CELL_SIZE,
  SCREEN_WIDTH,
  IS_MOBILE,
} from '../constants';
import { TOWER_DEFS, BASIC_TOWER_KINDS, ADVANCED_TOWER_KINDS, TowerKind, scaledCost } from '../data/towers';
import { getSynergyHints } from '../data/synergies';
import { GameState } from '../state/GameState';

const PANEL_Y = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + 4;
const BUTTON_W   = IS_MOBILE ? 96  : 144;
const BUTTON_H   = IS_MOBILE ? 88  : 64;
const BUTTON_GAP = IS_MOBILE ? 6   : 8;
// 2段の間隔・説明エリア開始
const ROW2_Y = PANEL_Y + 4 + BUTTON_H + 8;
const INFO_Y = ROW2_Y + BUTTON_H + 12;

type ButtonEntry = {
  kind: TowerKind;
  btn: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  lockText: Phaser.GameObjects.Text;
};

export class TowerPanel {
  private bg: Phaser.GameObjects.Graphics;
  private entries: ButtonEntry[] = [];
  private infoText: Phaser.GameObjects.Text;

  selectedKind: TowerKind | null = null;
  private hoveredKind: TowerKind | null = null;
  private tappedKind: TowerKind | null = null; // モバイルで最後にタップしたボタンの説明表示用
  private state: GameState;
  private getTowerCount: (kind: TowerKind) => number;

  constructor(
    scene: Phaser.Scene,
    state: GameState,
    getTowerCount: (kind: TowerKind) => number,
  ) {
    this.state = state;
    this.getTowerCount = getTowerCount;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, PANEL_Y - 4, SCREEN_WIDTH, BOTTOM_PANEL_HEIGHT + 4);

    // 2段の区切り線
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x334455);
    divider.beginPath();
    divider.moveTo(16, INFO_Y - 4);
    divider.lineTo(SCREEN_WIDTH - 16, INFO_Y - 4);
    divider.strokePath();

    this.infoText = scene.add.text(SCREEN_WIDTH / 2, INFO_Y + 2, '', {
      fontSize: '12px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0);

    // 1段目: 基本タワー
    const row1W = BASIC_TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
    const row1X = (SCREEN_WIDTH - row1W) / 2;
    BASIC_TOWER_KINDS.forEach((kind, i) => {
      const bx = row1X + i * (BUTTON_W + BUTTON_GAP);
      const by = PANEL_Y + 4;
      this.entries.push(this.createButton(scene, kind, bx, by));
    });

    // 2段目: 上級タワー（中央揃え）
    const row2W = ADVANCED_TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
    const row2X = (SCREEN_WIDTH - row2W) / 2;
    ADVANCED_TOWER_KINDS.forEach((kind, i) => {
      const bx = row2X + i * (BUTTON_W + BUTTON_GAP);
      const by = ROW2_Y;
      this.entries.push(this.createButton(scene, kind, bx, by));
    });

    this.render();
    state.subscribe(() => this.render());
  }

  private createButton(scene: Phaser.Scene, kind: TowerKind, bx: number, by: number): ButtonEntry {
    const def = TOWER_DEFS[kind];

    const btn = scene.add.graphics();

    const fs = IS_MOBILE ? { name: '15px', cost: '13px', lock: '12px' }
                         : { name: '13px', cost: '12px', lock: '11px' };
    const nameText = scene.add
      .text(bx + BUTTON_W / 2, by + 8, def.name, { fontSize: fs.name, color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);

    const costText = scene.add
      .text(bx + BUTTON_W / 2, by + (IS_MOBILE ? 32 : 26), '', { fontSize: fs.cost, color: '#ffd700' })
      .setOrigin(0.5, 0);

    const lockText = scene.add
      .text(bx + BUTTON_W / 2, by + BUTTON_H / 2 + 4, '', { fontSize: fs.lock, color: '#888888' })
      .setOrigin(0.5);

    scene.add
      .zone(bx, by, BUTTON_W, BUTTON_H)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerover', () => { this.hoveredKind = kind; this.updateInfo(); })
      .on('pointerout',  () => { this.hoveredKind = null;  this.updateInfo(); })
      .on('pointerdown', () => {
        // ロック・購入可否に関わらず説明は常に表示
        this.tappedKind = kind;
        const isUnlocked = this.state.wave >= def.unlockedWave;
        if (isUnlocked) {
          if (this.selectedKind === kind) {
            this.selectedKind = null;
          } else {
            const cost = scaledCost(def.cost, this.getTowerCount(kind));
            if (this.state.gold >= cost) this.selectedKind = kind;
          }
        }
        this.render();
        this.updateInfo();
      });

    return { kind, btn, nameText, costText, lockText };
  }

  private updateInfo(): void {
    const kind = this.hoveredKind ?? this.selectedKind ?? this.tappedKind;
    if (!kind) { this.infoText.setText(''); return; }

    const def = TOWER_DEFS[kind];
    const lines: string[] = [`${def.name}：${def.description}`];
    if (def.attackType !== 'support') {
      const hints = getSynergyHints(kind);
      if (hints.length > 0) { lines.push('── シナジー ──'); lines.push(...hints); }
    }
    this.infoText.setText(lines);
  }

  private render(): void {
    for (const entry of this.entries) {
      const { kind, btn, nameText, costText, lockText } = entry;
      const def = TOWER_DEFS[kind];
      const isUnlocked = this.state.wave >= def.unlockedWave;
      const count = this.getTowerCount(kind);
      const cost = scaledCost(def.cost, count);
      const affordable = isUnlocked && this.state.gold >= cost;
      const selected = this.selectedKind === kind;

      // ボタンの位置を取得
      const entryIdx = this.entries.indexOf(entry);
      const isRow1 = entryIdx < BASIC_TOWER_KINDS.length;
      const rowKinds = isRow1 ? BASIC_TOWER_KINDS : ADVANCED_TOWER_KINDS;
      const localIdx = rowKinds.indexOf(kind);
      const rowW = rowKinds.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
      const rowStartX = (SCREEN_WIDTH - rowW) / 2;
      const bx = rowStartX + localIdx * (BUTTON_W + BUTTON_GAP);
      const by = isRow1 ? PANEL_Y + 4 : ROW2_Y;

      btn.clear();

      if (!isUnlocked) {
        btn.fillStyle(0x111111);
        btn.fillRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
        btn.lineStyle(1, 0x2a2a2a);
        btn.strokeRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
        nameText.setColor('#444444');
        costText.setText('').setVisible(false);
        lockText.setText(`Wave${def.unlockedWave}で解放`).setVisible(true);
      } else {
        const bgColor = selected ? 0x334455 : affordable ? 0x1e2a38 : 0x1a1a1a;
        const borderColor = selected ? 0x88ccff : affordable ? 0x445566 : 0x333333;
        btn.fillStyle(bgColor);
        btn.fillRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
        btn.lineStyle(2, borderColor);
        btn.strokeRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
        nameText.setColor(affordable ? '#ffffff' : '#555555');
        const costLabel = `${cost}G`;
        costText.setText(costLabel).setColor(affordable ? '#ffd700' : '#555500').setVisible(true);
        lockText.setVisible(false);
      }
    }
  }

  deselect(): void {
    this.selectedKind = null;
    this.render();
    this.updateInfo();
  }
}
