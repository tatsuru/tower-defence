import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }
    create() {
        const cx = SCREEN_WIDTH / 2;
        const cy = SCREEN_HEIGHT / 2;
        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(0x0d0d1e);
        bg.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        // タイトル
        this.add.text(cx, cy - 100, 'Fantasy Tower Defense', {
            fontSize: '36px',
            color: '#ffd700',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        // 開始ボタン
        const btnW = 200;
        const btnH = 52;
        const bx = cx - btnW / 2;
        const by = cy + 20;
        const btn = this.add.graphics();
        btn.fillStyle(0x1e2a38);
        btn.fillRoundedRect(bx, by, btnW, btnH, 8);
        btn.lineStyle(2, 0x88ccff);
        btn.strokeRoundedRect(bx, by, btnW, btnH, 8);
        this.add.text(cx, by + btnH / 2, 'ゲーム開始', {
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add
            .zone(bx, by, btnW, btnH)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
            btn.clear();
            btn.fillStyle(0x334455);
            btn.fillRoundedRect(bx, by, btnW, btnH, 8);
            btn.lineStyle(2, 0xaaddff);
            btn.strokeRoundedRect(bx, by, btnW, btnH, 8);
        })
            .on('pointerout', () => {
            btn.clear();
            btn.fillStyle(0x1e2a38);
            btn.fillRoundedRect(bx, by, btnW, btnH, 8);
            btn.lineStyle(2, 0x88ccff);
            btn.strokeRoundedRect(bx, by, btnW, btnH, 8);
        })
            .on('pointerdown', () => {
            this.scene.start('GameScene');
        });
        // 操作説明
        this.add.text(cx, by + btnH + 40, [
            'タワーを選んでグリッドに設置して敵を撃退しよう',
            'タワーを隣接させるとシナジーボーナスが発動',
        ], {
            fontSize: '13px',
            color: '#888888',
            align: 'center',
        }).setOrigin(0.5, 0);
    }
}
