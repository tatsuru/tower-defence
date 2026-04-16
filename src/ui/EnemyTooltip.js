import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
const TRAIT_LABELS = {
    armored: '装甲（非範囲ダメージ50%軽減）',
    splitting: '分裂（死亡時に2体出現）',
};
const PAD = 8;
const LINE_H = 16;
export class EnemyTooltip {
    constructor(scene) {
        Object.defineProperty(this, "bg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lines", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.bg = scene.add.graphics().setDepth(60);
        this.bg.setVisible(false);
    }
    show(enemy, px, py) {
        const rows = this.buildLines(enemy);
        const w = 160;
        const h = PAD * 2 + rows.length * LINE_H;
        // 画面端に収まるよう位置調整
        const offsetX = 14;
        const offsetY = -h - 10;
        let tx = px + offsetX;
        let ty = py + offsetY;
        if (tx + w > SCREEN_WIDTH - 4)
            tx = px - w - offsetX;
        if (ty < 4)
            ty = py + 10;
        if (ty + h > SCREEN_HEIGHT - 4)
            ty = SCREEN_HEIGHT - h - 4;
        this.bg.clear();
        this.bg.fillStyle(0x111122, 0.88);
        this.bg.fillRoundedRect(tx, ty, w, h, 6);
        this.bg.lineStyle(1, 0x6688aa, 0.8);
        this.bg.strokeRoundedRect(tx, ty, w, h, 6);
        this.bg.setVisible(true);
        // テキストを再利用・必要に応じて追加
        for (let i = 0; i < rows.length; i++) {
            if (!this.lines[i]) {
                this.lines[i] = this.scene.add
                    .text(0, 0, '', { fontSize: '11px', color: '#ffffff' })
                    .setDepth(61);
            }
            const { text, color } = rows[i];
            this.lines[i]
                .setText(text)
                .setColor(color)
                .setPosition(tx + PAD, ty + PAD + i * LINE_H)
                .setVisible(true);
        }
        // 余った行を非表示
        for (let i = rows.length; i < this.lines.length; i++) {
            this.lines[i].setVisible(false);
        }
    }
    hide() {
        this.bg.setVisible(false);
        for (const t of this.lines)
            t.setVisible(false);
    }
    destroy() {
        this.bg.destroy();
        for (const t of this.lines)
            t.destroy();
    }
    buildLines(enemy) {
        const rows = [];
        rows.push({ text: enemy.def.name, color: '#ffd700' });
        rows.push({ text: `HP: ${enemy.hp} / ${enemy.maxHp}`, color: '#aaffaa' });
        rows.push({ text: `速度: ${enemy.def.speed.toFixed(1)}`, color: '#cccccc' });
        rows.push({ text: `報酬: ${enemy.def.reward}G`, color: '#ffdd88' });
        if (enemy.def.traits.length > 0) {
            rows.push({ text: '特性:', color: '#ff9966' });
            for (const trait of enemy.def.traits) {
                rows.push({ text: `  ${TRAIT_LABELS[trait] ?? trait}`, color: '#ffbb99' });
            }
        }
        return rows;
    }
}
