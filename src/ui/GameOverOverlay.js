import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants';
import { loadHighScore, saveHighScore } from '../data/highScore';
export class GameOverOverlay {
    constructor(scene, state, onRestart) {
        Object.defineProperty(this, "bg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "titleText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "scoreText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "restartBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "restartLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "restartZone", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const cx = SCREEN_WIDTH / 2;
        const cy = SCREEN_HEIGHT / 2;
        this.bg = scene.add.graphics().setDepth(20);
        this.bg.fillStyle(0x000000, 0.75);
        this.bg.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        this.titleText = scene.add
            .text(cx, cy - 60, 'GAME OVER', {
            fontSize: '48px',
            color: '#ff4444',
            fontStyle: 'bold',
        })
            .setOrigin(0.5)
            .setDepth(21);
        this.scoreText = scene.add
            .text(cx, cy, '', { fontSize: '24px', color: '#ffffff' })
            .setOrigin(0.5)
            .setDepth(21);
        this.restartBtn = scene.add.graphics().setDepth(21);
        this.restartBtn.fillStyle(0x223344);
        this.restartBtn.fillRoundedRect(cx - 100, cy + 60, 200, 44, 8);
        this.restartBtn.lineStyle(2, 0x88ccff);
        this.restartBtn.strokeRoundedRect(cx - 100, cy + 60, 200, 44, 8);
        this.restartLabel = scene.add
            .text(cx, cy + 82, 'もう一度プレイ', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
            .setOrigin(0.5)
            .setDepth(21);
        this.restartZone = scene.add
            .zone(cx - 100, cy + 60, 200, 44)
            .setOrigin(0, 0)
            .setInteractive()
            .setDepth(22)
            .on('pointerdown', onRestart);
        this.setVisible(false);
        state.subscribe(() => {
            if (state.phase === 'gameover') {
                const isNew = saveHighScore(state.score);
                const hi = loadHighScore();
                const lines = [
                    `生存ウェーブ数: ${state.wave}`,
                    `スコア: ${state.score.toLocaleString()}`,
                    isNew
                        ? 'ハイスコア更新!'
                        : `ハイスコア: ${hi.toLocaleString()}`,
                ];
                this.scoreText.setText(lines);
                this.setVisible(true);
            }
        });
    }
    setVisible(v) {
        this.bg.setVisible(v);
        this.titleText.setVisible(v);
        this.scoreText.setVisible(v);
        this.restartBtn.setVisible(v);
        this.restartLabel.setVisible(v);
        if (v) {
            this.restartZone.setInteractive();
        }
        else {
            this.restartZone.disableInteractive();
        }
    }
}
