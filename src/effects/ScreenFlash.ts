import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';

export class ScreenFlash {
  private overlay: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.overlay = scene.add.graphics().setDepth(50);
    this.overlay.setAlpha(0);
  }

  flash(color: number, peakAlpha = 0.45, durationMs = 350): void {
    this.overlay.clear();
    this.overlay.fillStyle(color);
    this.overlay.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    this.scene.tweens.add({
      targets: this.overlay,
      alpha: { from: peakAlpha, to: 0 },
      duration: durationMs,
      ease: 'Quad.easeOut',
    });
  }
}
