export type EnemyKind = 'goblin' | 'orc' | 'dragon';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  baseHp: number;
  speed: number;       // セル/秒
  reward: number;      // 撃破時のゴールド
  // 描画パラメータ
  color: number;
  radius: number;      // ピクセル
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  goblin: {
    kind: 'goblin',
    name: 'ゴブリン',
    baseHp: 60,
    speed: 3.0,
    reward: 5,
    color: 0x66bb6a,
    radius: 10,
  },
  orc: {
    kind: 'orc',
    name: 'オーク',
    baseHp: 250,
    speed: 1.5,
    reward: 15,
    color: 0x8d6e63,
    radius: 14,
  },
  dragon: {
    kind: 'dragon',
    name: 'ドラゴン',
    baseHp: 1200,
    speed: 2.0,
    reward: 50,
    color: 0xef5350,
    radius: 18,
  },
};

/**
 * ウェーブ番号に応じて敵のHPをスケールする。
 * wave=1 のとき倍率1.0、以降ウェーブごとに約15%増加。
 */
export function scaleHp(baseHp: number, wave: number): number {
  return Math.round(baseHp * Math.pow(1.15, wave - 1));
}
