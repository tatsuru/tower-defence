import Phaser from 'phaser';
import { SCREEN_WIDTH, STATUS_BAR_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';

export class StatusBar {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, 0, SCREEN_WIDTH, STATUS_BAR_HEIGHT);

    this.text = scene.add.text(12, 12, '', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    this.update(state);
    state.subscribe(() => this.update(state));
  }

  private update(state: GameState): void {
    const phaseLabel =
      state.phase === 'preparation'
        ? '準備中'
        : state.phase === 'wave'
          ? `ウェーブ ${state.wave}`
          : 'GAME OVER';

    this.text.setText(
      `${phaseLabel}    ライフ: ${state.lives}    ゴールド: ${state.gold}G    スコア: ${state.score.toLocaleString()}`,
    );
  }
}
