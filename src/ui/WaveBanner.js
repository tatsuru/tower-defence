import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
export class WaveBanner {
    constructor(scene) {
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
    }
    show(wave) {
        const cx = SCREEN_WIDTH / 2;
        const cy = SCREEN_HEIGHT / 2;
        const text = this.scene.add
            .text(cx, cy, `Wave ${wave}`, {
            fontSize: '52px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
        })
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(30);
        this.scene.tweens.chain({
            targets: text,
            tweens: [
                { alpha: 1, scaleX: { from: 0.6, to: 1 }, scaleY: { from: 0.6, to: 1 }, duration: 200, ease: 'Back.easeOut' },
                { alpha: 1, duration: 500 },
                { alpha: 0, duration: 300, ease: 'Quad.easeIn', onComplete: () => text.destroy() },
            ],
        });
    }
}
