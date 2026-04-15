export interface WaveEntry {
  kind: string; // ALL_ENEMY_DEFS のキー
  count: number;
  intervalMs: number; // 同ウェーブ内の出現間隔
}

export interface WaveDef {
  entries: WaveEntry[];
}

/**
 * ウェーブ番号（1始まり）からウェーブ定義を生成する。
 * 固定ウェーブ定義をベースに、番号が大きくなるほど数を増やす。
 */
export function getWaveDef(wave: number): WaveDef {
  const hasDragon = wave % 10 === 0;
  const orcCount = Math.floor(Math.max(0, wave - 3) * 0.4);
  const goblinCount = Math.max(4, wave * 2 + 2);

  // 通常ゴブリン。ウェーブ6以降は分裂ゴブリンを混ぜる
  const splittingCount = wave >= 6 ? Math.floor(goblinCount * 0.3) : 0;
  const normalGoblinCount = goblinCount - splittingCount;

  // オーク。ウェーブ8以降は装甲オークを混ぜる
  const armoredOrcCount = wave >= 8 ? Math.floor(orcCount * 0.4) : 0;
  const normalOrcCount = orcCount - armoredOrcCount;

  const entries: WaveEntry[] = [];

  if (normalGoblinCount > 0) {
    entries.push({ kind: 'goblin', count: normalGoblinCount, intervalMs: 1000 });
  }
  if (splittingCount > 0) {
    entries.push({ kind: 'splitting_goblin', count: splittingCount, intervalMs: 1200 });
  }
  if (normalOrcCount > 0) {
    entries.push({ kind: 'orc', count: normalOrcCount, intervalMs: 2000 });
  }
  if (armoredOrcCount > 0) {
    entries.push({ kind: 'armored_orc', count: armoredOrcCount, intervalMs: 2500 });
  }
  if (hasDragon) {
    entries.push({ kind: 'dragon', count: 1, intervalMs: 3000 });
  }

  return { entries };
}

// 準備フェーズの秒数
export const PREPARATION_SECONDS = 30;
// 初期所持ゴールド
export const INITIAL_GOLD = 300;
// 初期ライフ
export const INITIAL_LIVES = 10;
