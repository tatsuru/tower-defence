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
  // 10ウェーブごとにドラゴンが出現（最初は10ウェーブ目）
  const hasDragon = wave % 10 === 0;
  // オークはウェーブ4から登場し、徐々に増える
  const orcCount = Math.floor(Math.max(0, wave - 3) * 0.4);
  // ゴブリンはウェーブ序盤の主力。増え方を緩やかに
  const goblinCount = Math.max(4, wave * 2 + 2);

  const entries: WaveEntry[] = [
    { kind: 'goblin', count: goblinCount, intervalMs: 1000 },
  ];

  if (orcCount > 0) {
    entries.push({ kind: 'orc', count: orcCount, intervalMs: 2000 });
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
