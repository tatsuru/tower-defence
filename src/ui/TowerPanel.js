import { BOTTOM_PANEL_HEIGHT, GRID_OFFSET_Y, GRID_ROWS, CELL_SIZE, SCREEN_WIDTH, } from '../constants';
import { TOWER_DEFS, BASIC_TOWER_KINDS, ADVANCED_TOWER_KINDS, scaledCost } from '../data/towers';
import { getSynergyHints } from '../data/synergies';
const PANEL_Y = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE + 4;
const BUTTON_W = 144;
const BUTTON_H = 52;
const BUTTON_GAP = 8;
// 2段の間隔・説明エリア開始
const ROW2_Y = PANEL_Y + 4 + BUTTON_H + 6;
const INFO_Y = ROW2_Y + BUTTON_H + 10;
export class TowerPanel {
    constructor(scene, state, getTowerCount) {
        Object.defineProperty(this, "bg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "entries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "infoText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "selectedKind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "hoveredKind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getTowerCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.state = state;
        this.getTowerCount = getTowerCount;
        this.bg = scene.add.graphics();
        this.bg.fillStyle(0x0d0d1e);
        this.bg.fillRect(0, PANEL_Y - 4, SCREEN_WIDTH, BOTTOM_PANEL_HEIGHT + 4);
        // 2段の区切り線
        const divider = scene.add.graphics();
        divider.lineStyle(1, 0x334455);
        divider.beginPath();
        divider.moveTo(16, INFO_Y - 4);
        divider.lineTo(SCREEN_WIDTH - 16, INFO_Y - 4);
        divider.strokePath();
        this.infoText = scene.add.text(SCREEN_WIDTH / 2, INFO_Y + 2, '', {
            fontSize: '12px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5, 0);
        // 1段目: 基本タワー
        const row1W = BASIC_TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
        const row1X = (SCREEN_WIDTH - row1W) / 2;
        BASIC_TOWER_KINDS.forEach((kind, i) => {
            const bx = row1X + i * (BUTTON_W + BUTTON_GAP);
            const by = PANEL_Y + 4;
            this.entries.push(this.createButton(scene, kind, bx, by));
        });
        // 2段目: 上級タワー（中央揃え）
        const row2W = ADVANCED_TOWER_KINDS.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
        const row2X = (SCREEN_WIDTH - row2W) / 2;
        ADVANCED_TOWER_KINDS.forEach((kind, i) => {
            const bx = row2X + i * (BUTTON_W + BUTTON_GAP);
            const by = ROW2_Y;
            this.entries.push(this.createButton(scene, kind, bx, by));
        });
        this.render();
        state.subscribe(() => this.render());
    }
    createButton(scene, kind, bx, by) {
        const def = TOWER_DEFS[kind];
        const btn = scene.add.graphics();
        const nameText = scene.add
            .text(bx + BUTTON_W / 2, by + 8, def.name, { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
            .setOrigin(0.5, 0);
        const costText = scene.add
            .text(bx + BUTTON_W / 2, by + 26, '', { fontSize: '12px', color: '#ffd700' })
            .setOrigin(0.5, 0);
        const lockText = scene.add
            .text(bx + BUTTON_W / 2, by + BUTTON_H / 2 + 4, '', { fontSize: '11px', color: '#888888' })
            .setOrigin(0.5);
        scene.add
            .zone(bx, by, BUTTON_W, BUTTON_H)
            .setOrigin(0, 0)
            .setInteractive()
            .on('pointerover', () => { this.hoveredKind = kind; this.updateInfo(); })
            .on('pointerout', () => { this.hoveredKind = null; this.updateInfo(); })
            .on('pointerdown', () => {
            const isUnlocked = this.state.wave >= def.unlockedWave;
            if (!isUnlocked)
                return;
            if (this.selectedKind === kind) {
                this.selectedKind = null;
            }
            else {
                const cost = scaledCost(def.cost, this.getTowerCount(kind));
                if (this.state.gold >= cost)
                    this.selectedKind = kind;
            }
            this.render();
            this.updateInfo();
        });
        return { kind, btn, nameText, costText, lockText };
    }
    updateInfo() {
        const kind = this.hoveredKind ?? this.selectedKind;
        if (!kind) {
            this.infoText.setText('');
            return;
        }
        const def = TOWER_DEFS[kind];
        const lines = [`${def.name}：${def.description}`];
        if (def.attackType !== 'support') {
            const hints = getSynergyHints(kind);
            if (hints.length > 0) {
                lines.push('── シナジー ──');
                lines.push(...hints);
            }
        }
        this.infoText.setText(lines);
    }
    render() {
        for (const entry of this.entries) {
            const { kind, btn, nameText, costText, lockText } = entry;
            const def = TOWER_DEFS[kind];
            const isUnlocked = this.state.wave >= def.unlockedWave;
            const count = this.getTowerCount(kind);
            const cost = scaledCost(def.cost, count);
            const affordable = isUnlocked && this.state.gold >= cost;
            const selected = this.selectedKind === kind;
            // ボタンの位置を取得
            const entryIdx = this.entries.indexOf(entry);
            const isRow1 = entryIdx < BASIC_TOWER_KINDS.length;
            const rowKinds = isRow1 ? BASIC_TOWER_KINDS : ADVANCED_TOWER_KINDS;
            const localIdx = rowKinds.indexOf(kind);
            const rowW = rowKinds.length * (BUTTON_W + BUTTON_GAP) - BUTTON_GAP;
            const rowStartX = (SCREEN_WIDTH - rowW) / 2;
            const bx = rowStartX + localIdx * (BUTTON_W + BUTTON_GAP);
            const by = isRow1 ? PANEL_Y + 4 : ROW2_Y;
            btn.clear();
            if (!isUnlocked) {
                btn.fillStyle(0x111111);
                btn.fillRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
                btn.lineStyle(1, 0x2a2a2a);
                btn.strokeRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
                nameText.setColor('#444444');
                costText.setText('').setVisible(false);
                lockText.setText(`Wave${def.unlockedWave}で解放`).setVisible(true);
            }
            else {
                const bgColor = selected ? 0x334455 : affordable ? 0x1e2a38 : 0x1a1a1a;
                const borderColor = selected ? 0x88ccff : affordable ? 0x445566 : 0x333333;
                btn.fillStyle(bgColor);
                btn.fillRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
                btn.lineStyle(2, borderColor);
                btn.strokeRoundedRect(bx, by, BUTTON_W, BUTTON_H, 6);
                nameText.setColor(affordable ? '#ffffff' : '#555555');
                const costLabel = `${cost}G`;
                costText.setText(costLabel).setColor(affordable ? '#ffd700' : '#555500').setVisible(true);
                lockText.setVisible(false);
            }
        }
    }
    deselect() {
        this.selectedKind = null;
        this.render();
        this.updateInfo();
    }
}
