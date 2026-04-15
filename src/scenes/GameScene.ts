import Phaser from 'phaser';
import { CELL_SIZE, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_ROWS } from '../constants';
import { CellType, Grid } from '../types';
import { MapData, MapGenerator } from '../map/MapGenerator';

const CELL_COLORS: Record<CellType, number> = {
  [CellType.Empty]:    0x2d5a27,
  [CellType.Path]:     0x8b6914,
  [CellType.Blocked]:  0x3a3a3a,
  [CellType.Entrance]: 0x1a7abf,
  [CellType.Exit]:     0xbf1a1a,
};

export class GameScene extends Phaser.Scene {
  protected mapData!: MapData;
  private gridGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const generator = new MapGenerator();
    this.mapData = generator.generate();
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
  }

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    const grid = this.mapData.grid;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = grid[row][col];
        const x = GRID_OFFSET_X + col * CELL_SIZE;
        const y = GRID_OFFSET_Y + row * CELL_SIZE;

        g.fillStyle(CELL_COLORS[cell.type]);
        g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        g.lineStyle(1, 0x000000, 0.3);
        g.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    this.drawPathArrows();
    this.drawEntranceExitLabels();
  }

  // 経路の向きを矢印で示す
  private drawPathArrows(): void {
    const g = this.gridGraphics;
    const path = this.mapData.path;

    g.lineStyle(2, 0xffd700, 0.6);
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const fx = GRID_OFFSET_X + from.col * CELL_SIZE + CELL_SIZE / 2;
      const fy = GRID_OFFSET_Y + from.row * CELL_SIZE + CELL_SIZE / 2;
      const tx = GRID_OFFSET_X + to.col * CELL_SIZE + CELL_SIZE / 2;
      const ty = GRID_OFFSET_Y + to.row * CELL_SIZE + CELL_SIZE / 2;

      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(tx, ty);
      g.strokePath();
    }
  }

  private drawEntranceExitLabels(): void {
    const existing = this.children.getByName('label_entrance');
    if (existing) return;

    const eRow = this.mapData.entranceRow;
    const xRow = this.mapData.exitRow;

    this.add.text(
      GRID_OFFSET_X + 2,
      GRID_OFFSET_Y + eRow * CELL_SIZE + 4,
      'IN',
      { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' },
    ).setName('label_entrance');

    this.add.text(
      GRID_OFFSET_X + (GRID_COLS - 1) * CELL_SIZE + 4,
      GRID_OFFSET_Y + xRow * CELL_SIZE + 4,
      'OUT',
      { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' },
    ).setName('label_exit');
  }

  protected redrawGrid(): void {
    this.drawGrid();
  }

  protected getGrid(): Grid {
    return this.mapData.grid;
  }
}
