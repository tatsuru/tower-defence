import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { WaveEvent } from '../data/waves';

export class WaveBanner {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(wave: number, event: WaveEvent): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    const label = event === 'boss_rush' ? `Wave ${wave}\nボスラッシュ！`
                : event === 'rush'      ? `Wave ${wave}\nラッシュ！`
                : `Wave ${wave}`;
    const color = event === 'boss_rush' ? '#ff4444'
                : event === 'rush'      ? '#ff8800'
                : '#ffd700';

    const text = this.scene.add
      .text(cx, cy, label, {
        fontSize: '52px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(30);

    this.scene.tweens.chain({
      targets: text,
      tweens: [
        { alpha: 1, scaleX: { from: 0.6, to: 1 }, scaleY: { from: 0.6, to: 1 }, duration: 200, ease: 'Back.easeOut' },
        { alpha: 1, duration: 800 },
        { alpha: 0, duration: 300, ease: 'Quad.easeIn', onComplete: () => text.destroy() },
      ],
    });
  }
}
