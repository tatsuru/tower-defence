export type TowerKind = 'archer' | 'mage' | 'cannon' | 'ice' | 'fire';

export interface TowerLevelDef {
  damage: number;
  attacksPerSecond: number;
  range: number;         // セル数
  upgradeCost: number;   // 次のレベルへのコスト（最大レベルは 0）
  // 描画パラメータ
  color: number;
  size: number;          // セルに対する比率 (0〜1)
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  cost: number;          // 設置コスト
  levels: [TowerLevelDef, TowerLevelDef, TowerLevelDef];
  attackType: 'single' | 'area' | 'slow' | 'dot';
  description: string;
}

export const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: 'archer',
    name: '弓兵塔',
    cost: 50,
    attackType: 'single',
    description: '単体攻撃。射程が長く低コスト。',
    levels: [
      { damage: 10, attacksPerSecond: 1.0, range: 3,   upgradeCost: 40, color: 0x8bc34a, size: 0.45 },
      { damage: 18, attacksPerSecond: 1.2, range: 3.5, upgradeCost: 60, color: 0x558b2f, size: 0.52 },
      { damage: 30, attacksPerSecond: 1.5, range: 4,   upgradeCost: 0,  color: 0x33691e, size: 0.60 },
    ],
  },
  mage: {
    kind: 'mage',
    name: '魔法塔',
    cost: 100,
    attackType: 'area',
    description: '範囲攻撃。射程内の全敵にダメージ。',
    levels: [
      { damage: 12, attacksPerSecond: 0.8, range: 2.5, upgradeCost: 75,  color: 0x9c27b0, size: 0.45 },
      { damage: 22, attacksPerSecond: 1.0, range: 3,   upgradeCost: 110, color: 0x6a1b9a, size: 0.52 },
      { damage: 38, attacksPerSecond: 1.2, range: 3.5, upgradeCost: 0,   color: 0x4a148c, size: 0.60 },
    ],
  },
  cannon: {
    kind: 'cannon',
    name: '砲台',
    cost: 120,
    attackType: 'single',
    description: '単体攻撃。高ダメージだが攻撃が遅い。',
    levels: [
      { damage: 40,  attacksPerSecond: 0.5, range: 2.5, upgradeCost: 90,  color: 0x607d8b, size: 0.55 },
      { damage: 75,  attacksPerSecond: 0.6, range: 3,   upgradeCost: 130, color: 0x37474f, size: 0.62 },
      { damage: 130, attacksPerSecond: 0.7, range: 3.5, upgradeCost: 0,   color: 0x1c2a30, size: 0.70 },
    ],
  },
  ice: {
    kind: 'ice',
    name: '氷の塔',
    cost: 80,
    attackType: 'slow',
    description: '敵の移動速度を一時的に低下させる。',
    levels: [
      { damage: 5,  attacksPerSecond: 1.0, range: 2.5, upgradeCost: 60,  color: 0x4dd0e1, size: 0.45 },
      { damage: 10, attacksPerSecond: 1.2, range: 3,   upgradeCost: 90,  color: 0x00acc1, size: 0.52 },
      { damage: 18, attacksPerSecond: 1.5, range: 3.5, upgradeCost: 0,   color: 0x00838f, size: 0.60 },
    ],
  },
  fire: {
    kind: 'fire',
    name: '炎の塔',
    cost: 90,
    attackType: 'dot',
    description: '継続ダメージ（DoT）を与える。',
    levels: [
      { damage: 4,  attacksPerSecond: 2.0, range: 2,   upgradeCost: 70,  color: 0xff7043, size: 0.45 },
      { damage: 7,  attacksPerSecond: 2.5, range: 2.5, upgradeCost: 100, color: 0xe64a19, size: 0.52 },
      { damage: 12, attacksPerSecond: 3.0, range: 3,   upgradeCost: 0,   color: 0xbf360c, size: 0.60 },
    ],
  },
};

export const TOWER_KINDS: TowerKind[] = ['archer', 'mage', 'cannon', 'ice', 'fire'];

// スロー効果の倍率（0.5 = 移動速度が半分）
export const SLOW_FACTOR = 0.5;
// スロー効果の持続時間（ミリ秒）
export const SLOW_DURATION_MS = 2000;
// DoT の1ティック間隔（ミリ秒）
export const DOT_TICK_MS = 500;
// DoT の持続時間（ミリ秒）
export const DOT_DURATION_MS = 3000;
