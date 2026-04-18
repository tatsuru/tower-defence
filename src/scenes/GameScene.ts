import Phaser from 'phaser';
import { CELL_SIZE, GRID_COLS, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_ROWS, SCREEN_WIDTH, SCREEN_HEIGHT, IS_MOBILE } from '../constants';
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

// セル位置+インデックスで決定論的な疑似乱数（マップ再生成ごとに固定される）
function cellRand(col: number, row: number, idx: number): number {
  const n = (col * 73856093) ^ (row * 19349663) ^ (idx * 83492791);
  const h = n ^ (n >>> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

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

  // モバイル用: 1回目タップでプレビュー、2回目タップで配置
  private pendingCell: { col: number; row: number; kind: TowerKind } | null = null;

  private isPaused: boolean = false;
  private speedMultiplier: 1 | 2 | 4 = 1;
  private pauseBtn!: Phaser.GameObjects.Graphics;
  private pauseLabel!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Graphics;
  private speedLabel!: Phaser.GameObjects.Text;

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
        onWaveStart: (wave, event) => {
          this.waveBanner.show(wave, event);
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

    this.createPauseButton();
  }

  private createPauseButton(): void {
    const bh = 32, by = 8;
    const pauseW = 44, pauseX = SCREEN_WIDTH - pauseW - 6;
    const speedW = 52, speedX = pauseX - 6 - speedW;

    // 速度ボタン
    this.speedBtn = this.add.graphics().setDepth(30);
    this.speedLabel = this.add
      .text(speedX + speedW / 2, by + bh / 2, '1x', { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .zone(speedX, by, speedW, bh)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(32)
      .on('pointerdown', () => this.cycleSpeed());

    // 一時停止ボタン
    this.pauseBtn = this.add.graphics().setDepth(30);
    this.pauseLabel = this.add
      .text(pauseX + pauseW / 2, by + bh / 2, '||', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .zone(pauseX, by, pauseW, bh)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(32)
      .on('pointerdown', () => this.togglePause());

    this.pauseOverlay = this.add
      .text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60, '一時停止中\nタップして再開', {
        fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
        align: 'center', lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    this.renderPauseBtn();
    this.renderSpeedBtn();
  }

  private cycleSpeed(): void {
    if (this.state.phase === 'gameover') return;
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : this.speedMultiplier === 2 ? 4 : 1;
    this.tweens.timeScale = this.speedMultiplier;
    this.renderSpeedBtn();
  }

  private renderSpeedBtn(): void {
    const bh = 32, by = 8;
    const pauseW = 44, pauseX = SCREEN_WIDTH - pauseW - 6;
    const speedW = 52, speedX = pauseX - 6 - speedW;
    const active = this.speedMultiplier > 1;
    this.speedBtn.clear();
    this.speedBtn.fillStyle(active ? 0x1a2a1a : 0x1a1a2a, 0.85);
    this.speedBtn.fillRoundedRect(speedX, by, speedW, bh, 6);
    this.speedBtn.lineStyle(1, active ? 0x44cc44 : 0x445566);
    this.speedBtn.strokeRoundedRect(speedX, by, speedW, bh, 6);
    this.speedLabel.setText(`${this.speedMultiplier}x`).setColor(active ? '#88ff88' : '#ffffff');
  }

  private togglePause(): void {
    if (this.state.phase === 'gameover') return;
    this.isPaused = !this.isPaused;
    this.pauseOverlay.setVisible(this.isPaused);
    this.renderPauseBtn();
  }

  private renderPauseBtn(): void {
    const bh = 32, by = 8;
    const pauseW = 44, pauseX = SCREEN_WIDTH - pauseW - 6;
    this.pauseBtn.clear();
    this.pauseBtn.fillStyle(this.isPaused ? 0x334433 : 0x223344, 0.85);
    this.pauseBtn.fillRoundedRect(pauseX, by, pauseW, bh, 6);
    this.pauseBtn.lineStyle(1, this.isPaused ? 0x88cc88 : 0x445566);
    this.pauseBtn.strokeRoundedRect(pauseX, by, pauseW, bh, 6);
    this.pauseLabel.setText(this.isPaused ? '>' : '||');
  }

  update(_time: number, delta: number): void {
    if (this.state.phase === 'gameover') return;
    if (this.isPaused) return;

    const scaledDelta = delta * this.speedMultiplier;
    this.waveManager.update(scaledDelta);
    this.particleEffect.update(scaledDelta);

    for (const tower of this.towers) {
      tower.update(scaledDelta, this.waveManager.enemies);
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
    if (!cell) {
      this.drawPendingCellPreview();
      return;
    }

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
      this.drawRangeCircle(kind, x, y);
    }
  }

  // モバイル用ペンディングセルのプレビューを描画（pointermoveがなくても表示）
  private drawPendingCellPreview(): void {
    if (!this.pendingCell) return;
    const { col, row, kind } = this.pendingCell;
    const x = GRID_OFFSET_X + col * CELL_SIZE;
    const y = GRID_OFFSET_Y + row * CELL_SIZE;
    this.hoverGraphics.fillStyle(0x88ff88, 0.3);
    this.hoverGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    this.drawRangeCircle(kind, x, y);
  }

  private drawRangeCircle(kind: TowerKind, cellX: number, cellY: number): void {
    const def = TOWER_DEFS[kind];
    const rangePixels = def.levels[0].range * CELL_SIZE;
    const cx = cellX + CELL_SIZE / 2;
    const cy = cellY + CELL_SIZE / 2;
    this.hoverGraphics.lineStyle(1, def.levels[0].color, 0.7);
    this.hoverGraphics.strokeCircle(cx, cy, rangePixels);
  }

  private onGridClick(ptr: Phaser.Input.Pointer): void {
    // 詳細パネル上のクリックはパネル内ボタンに任せる
    if (this.detailPanel.hitTest(ptr.x, ptr.y)) return;

    const cell = this.pixelToCell(ptr.x, ptr.y);
    // グリッド外（UIパネル領域）のクリックは無視する
    if (!cell) return;

    const { col, row } = cell;

    // 既存タワーをクリック → 詳細パネル
    const existingTower = this.towers.find((t) => t.col === col && t.row === row);
    if (existingTower) {
      this.pendingCell = null;
      this.hoverGraphics.clear();
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
    if (!kind) {
      this.pendingCell = null;
      this.hoverGraphics.clear();
      return;
    }

    if (IS_MOBILE) {
      // 同じセル・同じ種類なら配置、それ以外はプレビュー表示
      if (this.pendingCell?.col === col && this.pendingCell?.row === row && this.pendingCell?.kind === kind) {
        this.pendingCell = null;
        this.hoverGraphics.clear();
        this.placeTower(kind, col, row);
      } else {
        this.pendingCell = { col, row, kind };
        this.hoverGraphics.clear();
        this.drawPendingCellPreview();
      }
    } else {
      this.placeTower(kind, col, row);
    }
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
    const nextWave = this.state.wave + 1;
    for (const kind of ADVANCED_TOWER_KINDS) {
      const def = TOWER_DEFS[kind];
      if (def.unlockedWave === nextWave) {
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
      const neighbors = this.towers.filter((t) => {
        if (t === tower) return false;
        const dist = Math.max(Math.abs(t.col - tower.col), Math.abs(t.row - tower.row));
        // 支援塔はレベルに応じてオーラ範囲が広がる（range フィールドを使用）
        if (t.kind === 'support') return dist <= t.levelDef.range;
        return dist <= 1;
      });
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

        switch (cell.type) {
          case CellType.Empty:    this.drawGrassCell(g, x, y, col, row); break;
          case CellType.Path:     this.drawPathCell(g, x, y, col, row); break;
          case CellType.Blocked:  this.drawBlockedCell(g, x, y, col, row); break;
          case CellType.Entrance: this.drawEntranceCell(g, x, y); break;
          case CellType.Exit:     this.drawExitCell(g, x, y); break;
        }
      }
    }

    // 経路矢印（控えめな点線）
    const path = this.mapData.path;
    for (let i = 0; i < path.length - 1; i++) {
      const fx = GRID_OFFSET_X + path[i].col * CELL_SIZE + CELL_SIZE / 2;
      const fy = GRID_OFFSET_Y + path[i].row * CELL_SIZE + CELL_SIZE / 2;
      const tx = GRID_OFFSET_X + path[i + 1].col * CELL_SIZE + CELL_SIZE / 2;
      const ty = GRID_OFFSET_Y + path[i + 1].row * CELL_SIZE + CELL_SIZE / 2;
      g.lineStyle(1, 0xffd700, 0.35);
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

  private drawGrassCell(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number, row: number): void {
    // ベース: 草の濃い緑
    g.fillStyle(0x2d5a27);
    g.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // セル間の薄い境界線
    g.lineStyle(1, 0x152e17, 0.8);
    g.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

    // 明暗の斑点で草むらの質感
    const patches = IS_MOBILE ? 3 : 5;
    for (let i = 0; i < patches; i++) {
      const px = x + 2 + Math.floor(cellRand(col, row, i * 2) * (CELL_SIZE - 4));
      const py = y + 2 + Math.floor(cellRand(col, row, i * 2 + 1) * (CELL_SIZE - 4));
      const shade = cellRand(col, row, i + 20);
      g.fillStyle(shade > 0.5 ? 0x3a7030 : 0x224420);
      g.fillRect(px, py, 2, 2);
    }

    // 草の葉（短い斜め線）
    const blades = IS_MOBILE ? 1 : 2;
    for (let i = 0; i < blades; i++) {
      const bx = x + 3 + Math.floor(cellRand(col, row, i + 30) * (CELL_SIZE - 6));
      const by = y + 3 + Math.floor(cellRand(col, row, i + 40) * (CELL_SIZE - 6));
      const dir = cellRand(col, row, i + 50) > 0.5 ? 1 : -1;
      g.lineStyle(1, 0x4a8840, 0.7);
      g.beginPath();
      g.moveTo(bx, by + 3);
      g.lineTo(bx + dir * 2, by);
      g.strokePath();
    }
  }

  private drawPathCell(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number, row: number): void {
    // 外縁: 暗い土色（路肩の影）
    g.fillStyle(0x5a3a06);
    g.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // メイン土色（1px内側）
    g.fillStyle(0x8b6914);
    g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // 砂利・石ころ（明暗2種）
    const pebbles = IS_MOBILE ? 3 : 5;
    for (let i = 0; i < pebbles; i++) {
      const px = x + 2 + Math.floor(cellRand(col, row, i * 3) * (CELL_SIZE - 4));
      const py = y + 2 + Math.floor(cellRand(col, row, i * 3 + 1) * (CELL_SIZE - 4));
      const light = cellRand(col, row, i + 60) > 0.4;
      g.fillStyle(light ? 0xaa8030 : 0x6a4a08);
      g.fillRect(px, py, 2, 2);
    }
  }

  private drawBlockedCell(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number, row: number): void {
    // ベース: 暗い岩色
    g.fillStyle(0x252525);
    g.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // 石の面
    g.fillStyle(0x333333);
    g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // 岩の割れ目・ハイライト線
    const cracks = IS_MOBILE ? 1 : 2;
    for (let i = 0; i < cracks; i++) {
      const ax = x + 3 + Math.floor(cellRand(col, row, i + 70) * (CELL_SIZE - 6));
      const ay = y + 3 + Math.floor(cellRand(col, row, i + 80) * (CELL_SIZE - 6));
      const len = 3 + Math.floor(cellRand(col, row, i + 90) * 5);
      const dx = cellRand(col, row, i + 100) > 0.5 ? 1 : -1;
      g.lineStyle(1, 0x484848, 0.8);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(ax + dx * len, ay + len);
      g.strokePath();
    }

    // ハイライト（左上の輝き）
    g.lineStyle(1, 0x505050, 0.5);
    g.beginPath();
    g.moveTo(x + 2, y + CELL_SIZE - 4);
    g.lineTo(x + 2, y + 2);
    g.lineTo(x + CELL_SIZE - 4, y + 2);
    g.strokePath();
  }

  private drawEntranceCell(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x0d5a8a);
    g.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    g.fillStyle(0x1a7abf);
    g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    // 内側に明るい枠
    g.lineStyle(1, 0x55aaff, 0.6);
    g.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  private drawExitCell(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x8a0d0d);
    g.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    g.fillStyle(0xbf1a1a);
    g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    // 内側に明るい枠
    g.lineStyle(1, 0xff6666, 0.6);
    g.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  private restartGame(): void {
    for (const t of this.towers) t.destroy();
    this.towers = [];
    this.waveManager.destroyAll();
    this.isPaused = false;
    this.speedMultiplier = 1;
    this.tweens.timeScale = 1;
    this.scene.start('TitleScene');
  }
}
