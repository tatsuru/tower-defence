import { EnemyKind } from './enemies';

export interface WaveEntry {
  kind: EnemyKind;
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
  // 5ウェーブごとにドラゴンが出現
  const hasDragon = wave % 5 === 0;
  // ウェーブが進むにつれてオークの割合が増える
  const orcCount = Math.floor(wave * 0.6);
  const goblinCount = Math.max(5, wave * 4 - orcCount * 2);

  const entries: WaveEntry[] = [
    { kind: 'goblin', count: goblinCount, intervalMs: 800 },
  ];

  if (orcCount > 0) {
    entries.push({ kind: 'orc', count: orcCount, intervalMs: 1500 });
  }

  if (hasDragon) {
    entries.push({ kind: 'dragon', count: 1, intervalMs: 3000 });
  }

  return { entries };
}

// 準備フェーズの秒数
export const PREPARATION_SECONDS = 30;
// 初期所持ゴールド
export const INITIAL_GOLD = 200;
// 初期ライフ
export const INITIAL_LIVES = 10;
