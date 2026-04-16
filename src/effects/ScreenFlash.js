import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
export class ScreenFlash {
    constructor(scene) {
        Object.defineProperty(this, "overlay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.overlay = scene.add.graphics().setDepth(50);
        this.overlay.setAlpha(0);
    }
    flash(color, peakAlpha = 0.45, durationMs = 350) {
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
