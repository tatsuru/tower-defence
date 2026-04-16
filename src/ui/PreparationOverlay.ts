import Phaser from 'phaser';
import { GRID_OFFSET_X, GRID_OFFSET_Y, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from '../constants';
import { WaveManager } from '../wave/WaveManager';
import { GameState } from '../state/GameState';
import { getWaveDef } from '../data/waves';
import { ALL_ENEMY_DEFS } from '../data/enemies';

export class PreparationOverlay {
  private countdownText: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Graphics;
  private skipLabel: Phaser.GameObjects.Text;
  private wavePreviewText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState, waveManager: WaveManager) {
    const cx = SCREEN_WIDTH / 2;
    const cy = STATUS_BAR_HEIGHT + 20;

    this.countdownText = scene.add
      .text(cx, cy, '', { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(10);

    // ステータスバー内の右端に配置（詳細パネルと重ならないよう）
    const bx = SCREEN_WIDTH - 145;
    const by = 10;
    this.skipBtn = scene.add.graphics().setDepth(10);
    this.skipLabel = scene.add
      .text(bx + 65, by + 14, '今すぐ開始', { fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(10);

    scene.add
      .zone(bx, by, 130, 28)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(10)
      .on('pointerdown', () => waveManager.skipPreparation());

    this.wavePreviewText = scene.add
      .text(cx, cy + 28, '', {
        fontSize: '12px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10);

    void state;
    void GRID_OFFSET_X;
    void GRID_OFFSET_Y;
  }

  update(state: GameState, waveManager: WaveManager): void {
    const isPreparing = state.phase === 'preparation';
    this.countdownText.setVisible(isPreparing);
    this.skipBtn.setVisible(isPreparing);
    this.skipLabel.setVisible(isPreparing);
    this.wavePreviewText.setVisible(isPreparing);

    if (!isPreparing) return;

    const secs = waveManager.preparationSecondsRemaining;
    this.countdownText.setText(
      `次のウェーブまで ${secs}秒 (ウェーブ ${state.wave + 1})`,
    );

    const nextWave = state.wave + 1;
    const def = getWaveDef(nextWave);
    const parts = def.entries.map((e) => {
      const name = ALL_ENEMY_DEFS[e.kind]?.name ?? e.kind;
      return `${name}×${e.count}`;
    });
    this.wavePreviewText.setText(`出現: ${parts.join('  ')}`);

    this.skipBtn.clear();
    this.skipBtn.fillStyle(0x223344);
    this.skipBtn.fillRoundedRect(SCREEN_WIDTH - 145, 10, 130, 28, 4);
    this.skipBtn.lineStyle(1, 0x445566);
    this.skipBtn.strokeRoundedRect(SCREEN_WIDTH - 145, 10, 130, 28, 4);
  }
}
