import { SCREEN_WIDTH, STATUS_BAR_HEIGHT } from '../constants';
export class StatusBar {
    constructor(scene, state) {
        Object.defineProperty(this, "bg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "text", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
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
    update(state) {
        const phaseLabel = state.phase === 'preparation'
            ? '準備中'
            : state.phase === 'wave'
                ? `ウェーブ ${state.wave}`
                : 'GAME OVER';
        this.text.setText(`${phaseLabel}    ライフ: ${state.lives}    ゴールド: ${state.gold}G    スコア: ${state.score.toLocaleString()}`);
    }
}
