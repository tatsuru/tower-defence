import Phaser from 'phaser';
import { SCREEN_WIDTH, STATUS_BAR_HEIGHT, IS_MOBILE, GRID_OFFSET_X } from '../constants';
import { GameState } from '../state/GameState';

export class StatusBar {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x0d0d1e);
    this.bg.fillRect(0, 0, SCREEN_WIDTH, STATUS_BAR_HEIGHT);

    this.text = scene.add.text(GRID_OFFSET_X, IS_MOBILE ? 4 : 6, '', {
      fontSize: IS_MOBILE ? '13px' : '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      lineSpacing: 2,
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

    if (IS_MOBILE) {
      this.text.setText([
        `${phaseLabel}  ♥${state.lives}  ${state.gold}G`,
        `Score: ${state.score.toLocaleString()}`,
      ]);
    } else {
      this.text.setText([
        `${phaseLabel}    ライフ: ${state.lives}    ゴールド: ${state.gold}G`,
        `スコア: ${state.score.toLocaleString()}`,
      ]);
    }
  }
}
