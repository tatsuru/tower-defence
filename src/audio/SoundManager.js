/**
 * Web Audio API を使った合成効果音。外部ファイル不要。
 */
export class SoundManager {
    constructor() {
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    getCtx() {
        if (!this.ctx)
            this.ctx = new AudioContext();
        return this.ctx;
    }
    /** 攻撃音（短い高音クリック） */
    playAttack(kind) {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const freqMap = {
            archer: 880, mage: 660, cannon: 220, ice: 1100, fire: 440,
        };
        osc.frequency.value = freqMap[kind] ?? 660;
        osc.type = kind === 'cannon' ? 'sawtooth' : 'square';
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
    }
    /** 敵撃破音（下降音） */
    playEnemyDeath(isBoss = false) {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const startFreq = isBoss ? 300 : 500;
        const duration = isBoss ? 0.5 : 0.18;
        osc.type = isBoss ? 'sawtooth' : 'triangle';
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(isBoss ? 60 : 150, t + duration);
        gain.gain.setValueAtTime(isBoss ? 0.18 : 0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.start(t);
        osc.stop(t + duration);
    }
    /** ライフ減少音（重い低音） */
    playLifeLost() {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
    }
    /** ウェーブ開始ファンファーレ（短い上昇音） */
    playWaveStart() {
        const ctx = this.getCtx();
        const notes = [440, 554, 659];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    }
    /** タワー設置音（ポンッ） */
    playTowerPlace() {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime;
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
    }
}
export const soundManager = new SoundManager();
