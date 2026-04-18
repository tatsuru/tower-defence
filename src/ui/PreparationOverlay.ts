import Phaser from 'phaser';
import { GRID_OFFSET_X, GRID_OFFSET_Y, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from '../constants';
import { WaveManager } from '../wave/WaveManager';
import { GameState } from '../state/GameState';
import { getWaveDef } from '../data/waves';
import { ALL_ENEMY_DEFS } from '../data/enemies';

// ポーズボタン(GameScene側)の右端=SCREEN_WIDTH-6 から左に並べる
const BTN_H    = 28;
const BTN_Y    = 10;
const PAUSE_RIGHT = 44 + 6 + 52 + 6 + 8; // ポーズ(44)+gap(6)+速度(52)+右余白(6)+margin(8)
const SKIP_BTN_W  = 116;
const SKIP_BTN_X  = SCREEN_WIDTH - PAUSE_RIGHT - SKIP_BTN_W;
const AUTO_BTN_W  = 110;
const AUTO_BTN_X  = SKIP_BTN_X - 8 - AUTO_BTN_W;

export class PreparationOverlay {
  private countdownText: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Graphics;
  private skipLabel: Phaser.GameObjects.Text;
  private wavePreviewText: Phaser.GameObjects.Text;
  private autoBtn: Phaser.GameObjects.Graphics;
  private autoLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState, waveManager: WaveManager) {
    const cx = SCREEN_WIDTH / 2;
    const cy = STATUS_BAR_HEIGHT + 20;

    this.countdownText = scene.add
      .text(cx, cy, '', { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(10);

    // 「今すぐ開始」ボタン（ポーズボタンの左隣）
    this.skipBtn = scene.add.graphics().setDepth(10);
    this.skipLabel = scene.add
      .text(SKIP_BTN_X + SKIP_BTN_W / 2, BTN_Y + BTN_H / 2, '今すぐ開始', { fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(10);

    scene.add
      .zone(SKIP_BTN_X, BTN_Y, SKIP_BTN_W, BTN_H)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(10)
      .on('pointerdown', () => waveManager.skipPreparation());

    // 「自動進行」トグルボタン（常時表示）
    this.autoBtn = scene.add.graphics().setDepth(10);
    this.autoLabel = scene.add
      .text(AUTO_BTN_X + AUTO_BTN_W / 2, BTN_Y + BTN_H / 2, '', {
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(10);

    scene.add
      .zone(AUTO_BTN_X, BTN_Y, AUTO_BTN_W, BTN_H)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(10)
      .on('pointerdown', () => {
        waveManager.autoAdvance = !waveManager.autoAdvance;
        if (waveManager.autoAdvance && state.phase === 'preparation') {
          waveManager.skipPreparation();
        }
        this.renderAutoBtn(waveManager.autoAdvance);
      });

    this.wavePreviewText = scene.add
      .text(cx, cy + 28, '', {
        fontSize: '12px',
        color: '#cccccc',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.renderAutoBtn(false);

    void state;
    void GRID_OFFSET_X;
    void GRID_OFFSET_Y;
  }

  private renderAutoBtn(on: boolean): void {
    this.autoBtn.clear();
    this.autoBtn.fillStyle(on ? 0x1a3a1a : 0x1a1a1a);
    this.autoBtn.fillRoundedRect(AUTO_BTN_X, BTN_Y, AUTO_BTN_W, BTN_H, 4);
    this.autoBtn.lineStyle(1, on ? 0x44cc44 : 0x445566);
    this.autoBtn.strokeRoundedRect(AUTO_BTN_X, BTN_Y, AUTO_BTN_W, BTN_H, 4);
    this.autoLabel.setText(`自動進行: ${on ? 'ON' : 'OFF'}`).setColor(on ? '#88ff88' : '#888888');
  }

  update(state: GameState, waveManager: WaveManager): void {
    const isPreparing = state.phase === 'preparation';
    this.countdownText.setVisible(isPreparing);
    this.skipBtn.setVisible(isPreparing && !waveManager.autoAdvance);
    this.skipLabel.setVisible(isPreparing && !waveManager.autoAdvance);
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
    const eventLabel = def.event === 'boss_rush' ? ' [ボスラッシュ！]'
                     : def.event === 'rush'      ? ' [ラッシュ！]' : '';
    this.wavePreviewText.setText(`出現: ${parts.join('  ')}${eventLabel}`)
      .setColor(def.event === 'boss_rush' ? '#ff8888' : def.event === 'rush' ? '#ffaa44' : '#cccccc');

    if (!waveManager.autoAdvance) {
      this.skipBtn.clear();
      this.skipBtn.fillStyle(0x223344);
      this.skipBtn.fillRoundedRect(SKIP_BTN_X, BTN_Y, SKIP_BTN_W, BTN_H, 4);
      this.skipBtn.lineStyle(1, 0x445566);
      this.skipBtn.strokeRoundedRect(SKIP_BTN_X, BTN_Y, SKIP_BTN_W, BTN_H, 4);
    }
  }
}
