import Phaser from 'phaser';
import { CELL_SIZE, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_ROWS } from '../constants';
import { CellType } from '../types';
import { MapGenerator } from '../map/MapGenerator';
import { Tower } from '../entities/Tower';
import { TOWER_DEFS, TowerKind, scaledCost, ADVANCED_TOWER_KINDS } from '../data/towers';
import { GameState } from '../state/GameState';
import { WaveManager } from '../wave/WaveManager';
import { StatusBar } from '../ui/StatusBar';
import { TowerPanel } from '../ui/TowerPanel';
import { TowerDetailPanel } from '../ui/TowerDetailPanel';
import { PreparationOverlay } from '../ui/PreparationOverlay';
import { GameOverOverlay } from '../ui/GameOverOverlay';
import { isBuildable } from '../map/MapGenerator';
import { ParticleEffect } from '../effects/ParticleEffect';
import { ScreenFlash } from '../effects/ScreenFlash';
import { WaveBanner } from '../ui/WaveBanner';
import { soundManager } from '../audio/SoundManager';
import { EnemyTooltip } from '../ui/EnemyTooltip';

const CELL_COLORS: Record<CellType, number> = {
  [CellType.Empty]:    0x2d5a27,
  [CellType.Path]:     0x8b6914,
  [CellType.Blocked]:  0x3a3a3a,
  [CellType.Entrance]: 0x1a7abf,
  [CellType.Exit]:     0xbf1a1a,
};

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private mapData!: ReturnType<MapGenerator['generate']>;
  private towers: Tower[] = [];

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  private waveManager!: WaveManager;
  private particleEffect!: ParticleEffect;
  private screenFlash!: ScreenFlash;
  private waveBanner!: WaveBanner;
  private enemyTooltip!: EnemyTooltip;
  private towerPanel!: TowerPanel;
  private detailPanel!: TowerDetailPanel;
  private prepOverlay!: PreparationOverlay;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.state = new GameState();

    const generator = new MapGenerator();
    this.mapData = generator.generate();

    this.gridGraphics = this.add.graphics();
    this.hoverGraphics = this.add.graphics();
    this.drawGrid();

    this.particleEffect = new ParticleEffect(this);
    this.screenFlash = new ScreenFlash(this);
    this.waveBanner = new WaveBanner(this);
    this.enemyTooltip = new EnemyTooltip(this);

    this.waveManager = new WaveManager(
      this,
      this.state,
      this.mapData.path,
      () => { this.onWaveComplete(); },
      {
        onWaveStart: (wave) => {
          this.waveBanner.show(wave);
          soundManager.playWaveStart();
        },
        onEnemyDeath: (x, y, color, isBoss) => {
          this.particleEffect.burst(x, y, color, isBoss ? 16 : 8);
          soundManager.playEnemyDeath(isBoss);
        },
        onLifeLost: () => {
          this.screenFlash.flash(0xff0000, 0.45, 350);
          soundManager.playLifeLost();
        },
      },
    );

    new StatusBar(this, this.state);
    this.towerPanel = new TowerPanel(
      this,
      this.state,
      (kind) => this.towers.filter((t) => t.kind === kind).length,
    );
    this.detailPanel = new TowerDetailPanel(this, this.state, (tower) => this.sellTower(tower));
    this.prepOverlay = new PreparationOverlay(this, this.state, this.waveManager);
    new GameOverOverlay(this, this.state, () => this.restartGame());

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.onHover(ptr));
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onGridClick(ptr));
  }

  update(_time: number, delta: number): void {
    if (this.state.phase === 'gameover') return;

    this.waveManager.update(delta);
    this.particleEffect.update(delta);

    for (const tower of this.towers) {
      tower.update(delta, this.waveManager.enemies);
    }

    this.prepOverlay.update(this.state, this.waveManager);
  }

  private onHover(ptr: Phaser.Input.Pointer): void {
    this.hoverGraphics.clear();

    // 敵ホバー判定（グリッドより優先）
    const hoveredEnemy = this.waveManager.enemies.find((e) => {
      if (e.isDead || e.hasReachedExit) return false;
      const dx = ptr.x - e.x;
      const dy = ptr.y - e.y;
      return dx * dx + dy * dy <= (e.def.radius + 4) * (e.def.radius + 4);
    });

    if (hoveredEnemy) {
      this.enemyTooltip.show(hoveredEnemy, ptr.x, ptr.y);
      return;
    }
    this.enemyTooltip.hide();

    const cell = this.pixelToCell(ptr.x, ptr.y);
    if (!cell) return;

    const { col, row } = cell;
    const gridCell = this.mapData.grid[row][col];
    const kind = this.towerPanel.selectedKind;
    const canPlace =
      isBuildable(gridCell) &&
      kind !== null &&
      !this.towers.some((t) => t.col === col && t.row === row);

    const color = canPlace ? 0x88ff88 : 0xff8888;
    const x = GRID_OFFSET_X + col * CELL_SIZE;
    const y = GRID_OFFSET_Y + row * CELL_SIZE;

    this.hoverGraphics.fillStyle(color, 0.3);
    this.hoverGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // タワー選択中は配置予定位置の攻撃範囲を表示
    if (kind) {
      const def = TOWER_DEFS[kind];
      const rangePixels = def.levels[0].range * CELL_SIZE;
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      this.hoverGraphics.lineStyle(1, def.levels[0].color, 0.7);
      this.hoverGraphics.strokeCircle(cx, cy, rangePixels);
    }
  }

  private onGridClick(ptr: Phaser.Input.Pointer): void {
    const cell = this.pixelToCell(ptr.x, ptr.y);
    // グリッド外（UIパネル領域）のクリックは無視する
    // グリッド内の空マスクリック時のみ詳細パネルを閉じる
    if (!cell) return;

    const { col, row } = cell;

    // 既存タワーをクリック → 詳細パネル
    const existingTower = this.towers.find((t) => t.col === col && t.row === row);
    if (existingTower) {
      this.towerPanel.deselect();
      if (this.detailPanel.currentTower === existingTower) {
        this.detailPanel.hide();
      } else {
        this.detailPanel.show(existingTower);
      }
      return;
    }

    this.detailPanel.hide();

    const kind = this.towerPanel.selectedKind;
    if (!kind) return;

    this.placeTower(kind, col, row);
  }

  private sellTower(tower: Tower): void {
    this.towers = this.towers.filter((t) => t !== tower);
    this.mapData.grid[tower.row][tower.col].type = CellType.Empty;
    tower.destroy();
    this.recalcAllSynergies();
  }

  private placeTower(kind: TowerKind, col: number, row: number): void {
    const gridCell = this.mapData.grid[row][col];
    if (!isBuildable(gridCell)) return;
    if (this.towers.some((t) => t.col === col && t.row === row)) return;

    const def = TOWER_DEFS[kind];
    const sameTypeCount = this.towers.filter((t) => t.kind === kind).length;
    const cost = scaledCost(def.cost, sameTypeCount);
    if (!this.state.spendGold(cost)) return;

    const tower = new Tower(this, this.state, def, col, row);
    tower.totalCost = cost;
    this.towers.push(tower);
    this.mapData.grid[row][col].type = CellType.Blocked;
    this.recalcAllSynergies();

    soundManager.playTowerPlace();
    this.tweens.add({
      targets: tower.getGraphics(),
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  private onWaveComplete(): void {
    const wave = this.state.wave;
    for (const kind of ADVANCED_TOWER_KINDS) {
      const def = TOWER_DEFS[kind];
      if (def.unlockedWave === wave) {
        this.showUnlockBanner(def.name);
      }
    }
  }

  private showUnlockBanner(name: string): void {
    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 60,
      `解放: ${name}`,
      { fontSize: '20px', color: '#ffdd44', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 },
    ).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: { from: 1, to: 0 },
      duration: 2200,
      ease: 'Cubic.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  private recalcAllSynergies(): void {
    for (const tower of this.towers) {
      const neighbors = this.towers.filter(
        (t) => t !== tower && Math.abs(t.col - tower.col) <= 1 && Math.abs(t.row - tower.row) <= 1,
      );
      tower.recalcSynergy(neighbors);
    }
  }

  private pixelToCell(px: number, py: number): { col: number; row: number } | null {
    const col = Math.floor((px - GRID_OFFSET_X) / CELL_SIZE);
    const row = Math.floor((py - GRID_OFFSET_Y) / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.mapData.grid[row][col];
        const x = GRID_OFFSET_X + col * CELL_SIZE;
        const y = GRID_OFFSET_Y + row * CELL_SIZE;

        g.fillStyle(CELL_COLORS[cell.type]);
        g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        g.lineStyle(1, 0x000000, 0.3);
        g.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    // 経路矢印
    g.lineStyle(2, 0xffd700, 0.5);
    const path = this.mapData.path;
    for (let i = 0; i < path.length - 1; i++) {
      const fx = GRID_OFFSET_X + path[i].col * CELL_SIZE + CELL_SIZE / 2;
      const fy = GRID_OFFSET_Y + path[i].row * CELL_SIZE + CELL_SIZE / 2;
      const tx = GRID_OFFSET_X + path[i + 1].col * CELL_SIZE + CELL_SIZE / 2;
      const ty = GRID_OFFSET_Y + path[i + 1].row * CELL_SIZE + CELL_SIZE / 2;
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(tx, ty);
      g.strokePath();
    }

    // IN / OUT ラベル
    const eRow = this.mapData.entranceRow;
    const xRow = this.mapData.exitRow;
    this.add.text(GRID_OFFSET_X + 2, GRID_OFFSET_Y + eRow * CELL_SIZE + 4, 'IN', {
      fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
    });
    this.add.text(
      GRID_OFFSET_X + (GRID_COLS - 1) * CELL_SIZE + 4,
      GRID_OFFSET_Y + xRow * CELL_SIZE + 4,
      'OUT',
      { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' },
    );
  }

  private restartGame(): void {
    for (const t of this.towers) t.destroy();
    this.towers = [];
    this.waveManager.destroyAll();
    this.scene.start('TitleScene');
  }
}
