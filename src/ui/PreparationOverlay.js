import { GRID_OFFSET_X, GRID_OFFSET_Y, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from '../constants';
import { getWaveDef } from '../data/waves';
import { ALL_ENEMY_DEFS } from '../data/enemies';
const AUTO_BTN_W = 120;
const AUTO_BTN_H = 28;
const AUTO_BTN_X = SCREEN_WIDTH - 145 - AUTO_BTN_W - 8;
const AUTO_BTN_Y = 10;
export class PreparationOverlay {
    constructor(scene, state, waveManager) {
        Object.defineProperty(this, "countdownText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "skipBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "skipLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "wavePreviewText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoLabel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const cx = SCREEN_WIDTH / 2;
        const cy = STATUS_BAR_HEIGHT + 20;
        this.countdownText = scene.add
            .text(cx, cy, '', { fontSize: '20px', color: '#ffd700', fontStyle: 'bold' })
            .setOrigin(0.5)
            .setDepth(10);
        // 「今すぐ開始」ボタン（右端）
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
        // 「自動進行」トグルボタン（常時表示）
        this.autoBtn = scene.add.graphics().setDepth(10);
        this.autoLabel = scene.add
            .text(AUTO_BTN_X + AUTO_BTN_W / 2, AUTO_BTN_Y + AUTO_BTN_H / 2, '', {
            fontSize: '12px',
            color: '#ffffff',
        })
            .setOrigin(0.5)
            .setDepth(10);
        scene.add
            .zone(AUTO_BTN_X, AUTO_BTN_Y, AUTO_BTN_W, AUTO_BTN_H)
            .setOrigin(0, 0)
            .setInteractive()
            .setDepth(10)
            .on('pointerdown', () => {
            waveManager.autoAdvance = !waveManager.autoAdvance;
            // ON にした直後の準備フェーズを即時短縮
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
    renderAutoBtn(on) {
        this.autoBtn.clear();
        this.autoBtn.fillStyle(on ? 0x1a3a1a : 0x1a1a1a);
        this.autoBtn.fillRoundedRect(AUTO_BTN_X, AUTO_BTN_Y, AUTO_BTN_W, AUTO_BTN_H, 4);
        this.autoBtn.lineStyle(1, on ? 0x44cc44 : 0x445566);
        this.autoBtn.strokeRoundedRect(AUTO_BTN_X, AUTO_BTN_Y, AUTO_BTN_W, AUTO_BTN_H, 4);
        this.autoLabel.setText(`自動進行: ${on ? 'ON' : 'OFF'}`).setColor(on ? '#88ff88' : '#888888');
    }
    update(state, waveManager) {
        const isPreparing = state.phase === 'preparation';
        this.countdownText.setVisible(isPreparing);
        this.skipBtn.setVisible(isPreparing && !waveManager.autoAdvance);
        this.skipLabel.setVisible(isPreparing && !waveManager.autoAdvance);
        this.wavePreviewText.setVisible(isPreparing);
        if (!isPreparing)
            return;
        const secs = waveManager.preparationSecondsRemaining;
        this.countdownText.setText(`次のウェーブまで ${secs}秒 (ウェーブ ${state.wave + 1})`);
        const nextWave = state.wave + 1;
        const def = getWaveDef(nextWave);
        const parts = def.entries.map((e) => {
            const name = ALL_ENEMY_DEFS[e.kind]?.name ?? e.kind;
            return `${name}×${e.count}`;
        });
        this.wavePreviewText.setText(`出現: ${parts.join('  ')}`);
        if (!waveManager.autoAdvance) {
            this.skipBtn.clear();
            this.skipBtn.fillStyle(0x223344);
            this.skipBtn.fillRoundedRect(SCREEN_WIDTH - 145, 10, 130, 28, 4);
            this.skipBtn.lineStyle(1, 0x445566);
            this.skipBtn.strokeRoundedRect(SCREEN_WIDTH - 145, 10, 130, 28, 4);
        }
    }
}
