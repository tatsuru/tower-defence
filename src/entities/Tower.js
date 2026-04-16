import { CELL_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../constants';
import { SYNERGY_DEFS, findSynergy, mergeBonuses } from '../data/synergies';
import { soundManager } from '../audio/SoundManager';
export class Tower {
    constructor(scene, state, def, col, row) {
        Object.defineProperty(this, "kind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "col", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "row", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "level", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "totalCost", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "totalDamageDealt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "killCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "def", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cooldownMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "graphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "effectGraphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rangeGraphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "synergyGraphics", {
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
        // 現在適用中のシナジーボーナス（毎フレームではなく配置変更時に再計算）
        Object.defineProperty(this, "synergyBonus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "synergyLabels", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.scene = scene;
        this.state = state;
        this.def = def;
        this.kind = def.kind;
        this.col = col;
        this.row = row;
        this.totalCost = def.cost;
        this.graphics = scene.add.graphics();
        this.effectGraphics = scene.add.graphics();
        this.rangeGraphics = scene.add.graphics().setDepth(7);
        this.synergyGraphics = scene.add.graphics();
        this.drawSelf();
    }
    get levelDef() {
        return this.def.levels[this.level];
    }
    get centerX() {
        return GRID_OFFSET_X + this.col * CELL_SIZE + CELL_SIZE / 2;
    }
    get centerY() {
        return GRID_OFFSET_Y + this.row * CELL_SIZE + CELL_SIZE / 2;
    }
    get rangePixels() {
        const base = this.levelDef.range + (this.synergyBonus.rangeBonus ?? 0);
        return base * CELL_SIZE;
    }
    get effectiveDamage() {
        return Math.round(this.levelDef.damage * (this.synergyBonus.damageMultiplier ?? 1));
    }
    get effectiveAttacksPerSecond() {
        return this.levelDef.attacksPerSecond * (this.synergyBonus.attackSpeedMultiplier ?? 1);
    }
    get activeSynergyLabels() {
        return this.synergyLabels;
    }
    get activeBonus() {
        return this.synergyBonus;
    }
    canUpgrade() {
        return this.level < this.def.levels.length - 1;
    }
    get upgradeCost() {
        return this.levelDef.upgradeCost;
    }
    upgrade() {
        if (!this.canUpgrade())
            return;
        this.totalCost += this.levelDef.upgradeCost;
        this.level++;
        this.drawSelf();
        this.scene.tweens.add({
            targets: this.graphics,
            scaleX: { from: 1.4, to: 1 },
            scaleY: { from: 1.4, to: 1 },
            duration: 220,
            ease: 'Back.easeOut',
        });
    }
    /** 配置変更時に GameScene から呼ばれる */
    recalcSynergy(neighbors) {
        const bonuses = [];
        const labels = [];
        for (const nb of neighbors) {
            // 支援塔のオーラ：隣接全タワーに攻速ボーナス（支援塔自身は除く）
            if (nb.kind === 'support' && this.kind !== 'support') {
                const auraValues = [1.20, 1.25, 1.30];
                bonuses.push({ attackSpeedMultiplier: auraValues[nb.level] ?? 1.20 });
                if (!labels.includes('支援'))
                    labels.push('支援');
                continue;
            }
            const bonus = findSynergy(this.kind, nb.kind);
            if (bonus) {
                bonuses.push(bonus);
                const def = this.getSynergyLabel(this.kind, nb.kind);
                if (def && !labels.includes(def))
                    labels.push(def);
            }
        }
        this.synergyBonus = mergeBonuses(bonuses);
        this.synergyLabels = labels;
        this.drawSynergyIndicator();
    }
    getSynergyLabel(a, b) {
        for (const def of SYNERGY_DEFS) {
            if (def.kinds[0] === a && def.kinds[1] === b)
                return def.label;
            if (def.kinds[1] === a && def.kinds[0] === b && def.target === 'both')
                return def.label;
        }
        return null;
    }
    update(deltaMs, enemies) {
        this.effectGraphics.clear();
        // 支援塔は攻撃しない
        if (this.def.attackType === 'support')
            return;
        this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
        if (this.cooldownMs > 0)
            return;
        const target = this.findTarget(enemies);
        if (!target)
            return;
        this.attack(target, enemies);
        this.cooldownMs = 1000 / this.effectiveAttacksPerSecond;
        // chain/pierce は attack() 内で effectGraphics に描画済み
        if (this.def.attackType !== 'chain' && this.def.attackType !== 'pierce') {
            this.drawAttackEffect(target, enemies);
        }
    }
    findTarget(enemies) {
        const inRange = enemies.filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e));
        if (inRange.length === 0)
            return null;
        if (this.def.targetPriority === 'maxHp') {
            return inRange.reduce((best, e) => (e.hp > best.hp ? e : best));
        }
        return inRange.reduce((best, e) => (e.progress > best.progress ? e : best));
    }
    inRange(enemy) {
        const dx = enemy.x - this.centerX;
        const dy = enemy.y - this.centerY;
        return dx * dx + dy * dy <= this.rangePixels * this.rangePixels;
    }
    calcDamage(base, target) {
        const isArmored = target.def.traits.includes('armored');
        // 魔法系（area）とバリスタ（pierce）は装甲を無視
        const ignoresArmor = this.def.attackType === 'area' || this.def.attackType === 'pierce';
        const afterArmor = isArmored && !ignoresArmor ? Math.ceil(base * 0.5) : base;
        return Math.round(afterArmor * (this.synergyBonus.damageMultiplier ?? 1));
    }
    attack(target, enemies) {
        soundManager.playAttack(this.kind);
        const ld = this.levelDef;
        switch (this.def.attackType) {
            case 'single': {
                const dealt = target.takeDamage(this.calcDamage(ld.damage, target));
                this.totalDamageDealt += dealt;
                this.state.addScore(dealt);
                if (target.isDead) {
                    this.killCount++;
                    this.state.addScore(100);
                }
                break;
            }
            case 'area':
                enemies
                    .filter((e) => !e.isDead && !e.hasReachedExit && this.inRange(e))
                    .forEach((e) => {
                    const dealt = e.takeDamage(Math.round(ld.damage * (this.synergyBonus.damageMultiplier ?? 1)));
                    this.totalDamageDealt += dealt;
                    this.state.addScore(dealt);
                    if (e.isDead) {
                        this.killCount++;
                        this.state.addScore(100);
                    }
                });
                break;
            case 'slow': {
                const dealt = target.takeDamage(this.calcDamage(ld.damage, target));
                this.totalDamageDealt += dealt;
                this.state.addScore(dealt);
                if (target.isDead) {
                    this.killCount++;
                    this.state.addScore(100);
                }
                target.applySlow();
                break;
            }
            case 'dot':
                target.applyDot(Math.round(ld.damage * (this.synergyBonus.damageMultiplier ?? 1)));
                break;
            case 'chain': {
                // 1撃目
                const g = this.effectGraphics;
                g.lineStyle(2, ld.color, 0.9);
                g.beginPath();
                g.moveTo(this.centerX, this.centerY);
                g.lineTo(target.x, target.y);
                g.strokePath();
                const d0 = target.takeDamage(this.calcDamage(ld.damage, target));
                this.totalDamageDealt += d0;
                this.state.addScore(d0);
                if (target.isDead) {
                    this.killCount++;
                    this.state.addScore(100);
                }
                // チェーンジャンプ（最大2体、前の命中点から2.5セル以内）
                const CHAIN_R = 2.5 * CELL_SIZE;
                const hit = new Set([target.id]);
                let lx = target.x, ly = target.y;
                for (let jump = 0; jump < 2; jump++) {
                    const next = enemies.find((e) => !e.isDead && !e.hasReachedExit && !hit.has(e.id) &&
                        Math.hypot(e.x - lx, e.y - ly) <= CHAIN_R);
                    if (!next)
                        break;
                    hit.add(next.id);
                    g.lineStyle(2, ld.color, 0.55 - jump * 0.15);
                    g.beginPath();
                    g.moveTo(lx, ly);
                    g.lineTo(next.x, next.y);
                    g.strokePath();
                    const chainDmg = Math.round(ld.damage * 0.7 * (this.synergyBonus.damageMultiplier ?? 1));
                    const dc = next.takeDamage(chainDmg);
                    this.totalDamageDealt += dc;
                    this.state.addScore(dc);
                    if (next.isDead) {
                        this.killCount++;
                        this.state.addScore(100);
                    }
                    lx = next.x;
                    ly = next.y;
                }
                break;
            }
            case 'pierce': {
                // 右方向へ貫通ビーム
                const beamH = CELL_SIZE * 0.6;
                const inBeam = enemies.filter((e) => !e.isDead && !e.hasReachedExit &&
                    Math.abs(e.y - this.centerY) <= beamH &&
                    e.x > this.centerX && e.x <= this.centerX + this.rangePixels);
                const g2 = this.effectGraphics;
                g2.fillStyle(ld.color, 0.25);
                g2.fillRect(this.centerX, this.centerY - beamH, this.rangePixels, beamH * 2);
                g2.lineStyle(1, ld.color, 0.8);
                g2.strokeRect(this.centerX, this.centerY - beamH, this.rangePixels, beamH * 2);
                for (const e of inBeam) {
                    const dp = e.takeDamage(this.calcDamage(ld.damage, e));
                    this.totalDamageDealt += dp;
                    this.state.addScore(dp);
                    if (e.isDead) {
                        this.killCount++;
                        this.state.addScore(100);
                    }
                }
                break;
            }
            case 'support':
                break;
        }
    }
    drawAttackEffect(target, enemies) {
        const g = this.effectGraphics;
        g.clear();
        if (this.def.attackType === 'area') {
            g.lineStyle(2, this.levelDef.color, 0.7);
            g.strokeCircle(this.centerX, this.centerY, this.rangePixels);
        }
        else {
            g.lineStyle(2, this.levelDef.color, 0.9);
            g.beginPath();
            g.moveTo(this.centerX, this.centerY);
            g.lineTo(target.x, target.y);
            g.strokePath();
        }
        void enemies;
    }
    getGraphics() {
        return this.graphics;
    }
    showRangeCircle(show) {
        this.rangeGraphics.clear();
        if (show) {
            this.rangeGraphics.lineStyle(1, 0xffffff, 0.45);
            this.rangeGraphics.strokeCircle(this.centerX, this.centerY, this.rangePixels);
        }
    }
    destroy() {
        this.graphics.destroy();
        this.effectGraphics.destroy();
        this.rangeGraphics.destroy();
        this.synergyGraphics.destroy();
        const textKey = `tower_label_${this.col}_${this.row}`;
        this.scene.children.getByName(textKey)?.destroy();
        const synergyKey = `synergy_label_${this.col}_${this.row}`;
        this.scene.children.getByName(synergyKey)?.destroy();
    }
    drawSynergyIndicator() {
        const g = this.synergyGraphics;
        g.clear();
        const hasBonus = this.synergyLabels.length > 0;
        if (hasBonus) {
            // シナジー発動中: 金色のリング
            g.lineStyle(2, 0xffd700, 0.8);
            g.strokeCircle(this.centerX, this.centerY, CELL_SIZE * 0.48);
        }
        // シナジーラベルテキスト
        const synergyKey = `synergy_label_${this.col}_${this.row}`;
        let labelText = this.scene.children.getByName(synergyKey);
        if (!labelText) {
            labelText = this.scene.add
                .text(this.centerX, this.centerY - CELL_SIZE * 0.5 + 2, '', {
                fontSize: '8px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
                .setOrigin(0.5, 1)
                .setName(synergyKey);
        }
        labelText.setText(hasBonus ? this.synergyLabels.join(' ') : '');
    }
    drawSelf() {
        const g = this.graphics;
        g.clear();
        const ld = this.levelDef;
        const cx = this.centerX;
        const cy = this.centerY;
        const half = (CELL_SIZE * ld.size) / 2;
        // Lv3: 外周グローリング（本体より外側）
        if (this.level >= 2) {
            g.lineStyle(3, ld.color, 0.6);
            g.strokeCircle(cx, cy, half + 5);
            g.lineStyle(1, 0xffffff, 0.5);
            g.strokeCircle(cx, cy, half + 5);
        }
        // ベース本体
        g.fillStyle(ld.color);
        g.fillRect(cx - half, cy - half, half * 2, half * 2);
        // Lv2以上: 白枠 + 4コーナードット
        if (this.level >= 1) {
            g.lineStyle(2, 0xffffff, 0.8);
            g.strokeRect(cx - half, cy - half, half * 2, half * 2);
            const r = 3;
            const m = r + 1;
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(cx - half + m, cy - half + m, r);
            g.fillCircle(cx + half - m, cy - half + m, r);
            g.fillCircle(cx - half + m, cy + half - m, r);
            g.fillCircle(cx + half - m, cy + half - m, r);
        }
        // 支援塔: 緑のオーラリング
        if (this.def.attackType === 'support') {
            g.lineStyle(2, 0x44dd44, 0.7);
            g.strokeCircle(cx, cy, half + 7);
            g.lineStyle(1, 0x88ff88, 0.4);
            g.strokeCircle(cx, cy, CELL_SIZE);
        }
        // Lv3: 中央ダイヤモンド
        if (this.level >= 2) {
            const ds = 6;
            g.fillStyle(0xffffff, 0.85);
            g.fillTriangle(cx, cy - ds, cx + ds, cy, cx - ds, cy);
            g.fillTriangle(cx, cy + ds, cx + ds, cy, cx - ds, cy);
        }
        // アイコンテキスト（初回のみ生成）
        const icons = {
            archer: '弓', mage: '魔', cannon: '砲', ice: '氷', fire: '炎',
        };
        const textKey = `tower_label_${this.col}_${this.row}`;
        if (!this.scene.children.getByName(textKey)) {
            this.scene.add
                .text(cx, cy, icons[this.kind] ?? '?', {
                fontSize: '12px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
                .setOrigin(0.5)
                .setDepth(5)
                .setName(textKey);
        }
        // レベルインジケーター（左下隅に1〜3個のドット）
        const dotR = 2;
        const dotSpacing = 6;
        const dotsStartX = cx - half + 4;
        const dotsY = cy + half - 4;
        for (let i = 0; i < 3; i++) {
            g.fillStyle(i <= this.level ? 0xffd700 : 0x333333, i <= this.level ? 1 : 0.5);
            g.fillCircle(dotsStartX + i * dotSpacing, dotsY, dotR);
        }
    }
}
