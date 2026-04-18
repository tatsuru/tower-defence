export type WaveEvent = 'rush' | 'boss_rush' | null;

export interface WaveEntry {
  kind: string; // ALL_ENEMY_DEFS のキー
  count: number;
  intervalMs: number; // 同ウェーブ内の出現間隔
}

export interface WaveDef {
  entries: WaveEntry[];
  event: WaveEvent;
}

/**
 * ウェーブ番号（1始まり）からウェーブ定義を生成する。
 * 10の倍数: ボスラッシュ（ドラゴン増量・高速）
 * 5の倍数: ラッシュ（敵数1.5倍・間隔半減）
 */
export function getWaveDef(wave: number): WaveDef {
  const event: WaveEvent =
    wave % 10 === 0 ? 'boss_rush' :
    wave % 5  === 0 ? 'rush' : null;

  // 通常構成を組み立てる
  const orcCount      = Math.floor(Math.max(0, wave - 3) * 0.6);
  const goblinCount   = Math.max(4, Math.floor(wave * 2.5 + 2));
  const splittingCount    = wave >= 6 ? Math.floor(goblinCount * 0.3) : 0;
  const normalGoblinCount = goblinCount - splittingCount;
  const armoredOrcCount   = wave >= 8 ? Math.floor(orcCount * 0.4) : 0;
  const normalOrcCount    = orcCount - armoredOrcCount;

  const base: WaveEntry[] = [];
  if (normalGoblinCount > 0) base.push({ kind: 'goblin',          count: normalGoblinCount, intervalMs: 1000 });
  if (splittingCount    > 0) base.push({ kind: 'splitting_goblin', count: splittingCount,    intervalMs: 1200 });
  if (normalOrcCount    > 0) base.push({ kind: 'orc',             count: normalOrcCount,    intervalMs: 2000 });
  if (armoredOrcCount   > 0) base.push({ kind: 'armored_orc',     count: armoredOrcCount,   intervalMs: 2500 });

  if (event === 'boss_rush') {
    // ドラゴンを通常の2倍以上・短い間隔で一気に送り込む
    const dragonCount = Math.floor(wave / 10) * 2 + 1;
    const entries = base.map((e) => ({ ...e })); // 雑魚はゴールド源として残す
    entries.push({ kind: 'dragon', count: dragonCount, intervalMs: 2000 });
    return { entries, event };
  }

  if (event === 'rush') {
    // 全種の数を1.5倍・間隔を半分にして一気に押し寄せる
    const entries = base.map((e) => ({
      ...e,
      count:      Math.ceil(e.count * 1.5),
      intervalMs: Math.round(e.intervalMs * 0.5),
    }));
    return { entries, event };
  }

  // 通常ウェーブ（10の倍数以外でドラゴンは出ない）
  return { entries: base, event: null };
}

// 準備フェーズの秒数
export const PREPARATION_SECONDS = 30;
// 初期所持ゴールド
export const INITIAL_GOLD = 300;
// 初期ライフ
export const INITIAL_LIVES = 10;
