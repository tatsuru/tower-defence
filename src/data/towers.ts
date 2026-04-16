export type TowerKind = 'archer' | 'mage' | 'cannon' | 'ice' | 'fire'
                      | 'thunder' | 'sniper' | 'support' | 'ballista';

export interface TowerLevelDef {
  damage: number;
  attacksPerSecond: number;
  range: number;
  upgradeCost: number;
  color: number;
  size: number;
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  cost: number;
  unlockedWave: number;   // この値以上の wave で解放（0 = 最初から）
  levels: [TowerLevelDef, TowerLevelDef, TowerLevelDef];
  attackType: 'single' | 'area' | 'slow' | 'dot' | 'chain' | 'pierce' | 'support';
  targetPriority?: 'progress' | 'maxHp';  // デフォルト: progress
  description: string;
}

export const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: 'archer', name: '弓兵塔', cost: 50, unlockedWave: 0,
    attackType: 'single',
    description: '単体攻撃。射程が長く低コスト。',
    levels: [
      { damage: 10, attacksPerSecond: 1.0, range: 3,   upgradeCost: 40, color: 0x8bc34a, size: 0.45 },
      { damage: 18, attacksPerSecond: 1.2, range: 3.5, upgradeCost: 60, color: 0x558b2f, size: 0.52 },
      { damage: 30, attacksPerSecond: 1.5, range: 4,   upgradeCost: 0,  color: 0x33691e, size: 0.60 },
    ],
  },
  mage: {
    kind: 'mage', name: '魔法塔', cost: 100, unlockedWave: 0,
    attackType: 'area',
    description: '範囲攻撃。射程内の全敵にダメージ。装甲無視。',
    levels: [
      { damage: 12, attacksPerSecond: 0.8, range: 2.5, upgradeCost: 75,  color: 0x9c27b0, size: 0.45 },
      { damage: 22, attacksPerSecond: 1.0, range: 3,   upgradeCost: 110, color: 0x6a1b9a, size: 0.52 },
      { damage: 38, attacksPerSecond: 1.2, range: 3.5, upgradeCost: 0,   color: 0x4a148c, size: 0.60 },
    ],
  },
  cannon: {
    kind: 'cannon', name: '砲台', cost: 120, unlockedWave: 0,
    attackType: 'single',
    description: '単体攻撃。高ダメージだが攻撃が遅い。',
    levels: [
      { damage: 40,  attacksPerSecond: 0.5, range: 2.5, upgradeCost: 90,  color: 0x607d8b, size: 0.55 },
      { damage: 75,  attacksPerSecond: 0.6, range: 3,   upgradeCost: 130, color: 0x37474f, size: 0.62 },
      { damage: 130, attacksPerSecond: 0.7, range: 3.5, upgradeCost: 0,   color: 0x1c2a30, size: 0.70 },
    ],
  },
  ice: {
    kind: 'ice', name: '氷の塔', cost: 80, unlockedWave: 0,
    attackType: 'slow',
    description: '敵の移動速度を一時的に低下させる。',
    levels: [
      { damage: 5,  attacksPerSecond: 1.0, range: 2.5, upgradeCost: 60,  color: 0x4dd0e1, size: 0.45 },
      { damage: 10, attacksPerSecond: 1.2, range: 3,   upgradeCost: 90,  color: 0x00acc1, size: 0.52 },
      { damage: 18, attacksPerSecond: 1.5, range: 3.5, upgradeCost: 0,   color: 0x00838f, size: 0.60 },
    ],
  },
  fire: {
    kind: 'fire', name: '炎の塔', cost: 90, unlockedWave: 0,
    attackType: 'dot',
    description: '継続ダメージ（最大HPの1〜2%/tick）。高HP敵に有効。',
    levels: [
      { damage: 1.0, attacksPerSecond: 2.0, range: 2,   upgradeCost: 70,  color: 0xff7043, size: 0.45 },
      { damage: 1.5, attacksPerSecond: 2.5, range: 2.5, upgradeCost: 100, color: 0xe64a19, size: 0.52 },
      { damage: 2.0, attacksPerSecond: 3.0, range: 3,   upgradeCost: 0,   color: 0xbf360c, size: 0.60 },
    ],
  },
  thunder: {
    kind: 'thunder', name: '雷の塔', cost: 110, unlockedWave: 5,
    attackType: 'chain',
    description: '最大2体へ連鎖する電撃。密集した敵に有効。',
    levels: [
      { damage: 18, attacksPerSecond: 1.0, range: 2.5, upgradeCost: 80,  color: 0xffee58, size: 0.48 },
      { damage: 30, attacksPerSecond: 1.2, range: 3.0, upgradeCost: 120, color: 0xfdd835, size: 0.54 },
      { damage: 48, attacksPerSecond: 1.4, range: 3.5, upgradeCost: 0,   color: 0xf9a825, size: 0.62 },
    ],
  },
  sniper: {
    kind: 'sniper', name: '狙撃塔', cost: 150, unlockedWave: 8,
    attackType: 'single',
    targetPriority: 'maxHp',
    description: '超長射程・高ダメージ。HP最大の敵を優先狙撃。',
    levels: [
      { damage: 80,  attacksPerSecond: 0.3,  range: 5.5, upgradeCost: 110, color: 0x90a4ae, size: 0.48 },
      { damage: 140, attacksPerSecond: 0.35, range: 6.5, upgradeCost: 160, color: 0x546e7a, size: 0.55 },
      { damage: 220, attacksPerSecond: 0.4,  range: 7.5, upgradeCost: 0,   color: 0x263238, size: 0.62 },
    ],
  },
  support: {
    kind: 'support', name: '支援塔', cost: 120, unlockedWave: 12,
    attackType: 'support',
    description: '攻撃しない。周囲タワーの攻速+20%。Lv2→範囲2マス+25%。Lv3→範囲3マス+30%/ダメージ×1.1。',
    levels: [
      { damage: 0, attacksPerSecond: 0, range: 1, upgradeCost: 90,  color: 0x81c784, size: 0.50 },
      { damage: 0, attacksPerSecond: 0, range: 2, upgradeCost: 130, color: 0x4caf50, size: 0.56 },
      { damage: 0, attacksPerSecond: 0, range: 3, upgradeCost: 0,   color: 0x2e7d32, size: 0.62 },
    ],
  },
  ballista: {
    kind: 'ballista', name: 'バリスタ', cost: 130, unlockedWave: 16,
    attackType: 'pierce',
    description: '右方向へ貫通射撃。直線上の敵全てにダメージ。',
    levels: [
      { damage: 50,  attacksPerSecond: 0.5, range: 4, upgradeCost: 100, color: 0xa1887f, size: 0.52 },
      { damage: 90,  attacksPerSecond: 0.6, range: 5, upgradeCost: 150, color: 0x795548, size: 0.58 },
      { damage: 150, attacksPerSecond: 0.7, range: 6, upgradeCost: 0,   color: 0x4e342e, size: 0.65 },
    ],
  },
};

// 基本タワー（最初から解放）
export const BASIC_TOWER_KINDS: TowerKind[] = ['archer', 'mage', 'cannon', 'ice', 'fire'];
// 上級タワー（段階解放）
export const ADVANCED_TOWER_KINDS: TowerKind[] = ['thunder', 'sniper', 'support', 'ballista'];
export const TOWER_KINDS: TowerKind[] = [...BASIC_TOWER_KINDS, ...ADVANCED_TOWER_KINDS];

export const SLOW_FACTOR = 0.5;
export const SLOW_DURATION_MS = 2000;
export const DOT_TICK_MS = 500;
export const DOT_DURATION_MS = 3000;

/** 同種タワーの n 本目の設置コスト（逓増） */
export function scaledCost(baseCost: number, sameTypeCount: number): number {
  return Math.floor(baseCost * (1 + 0.10 * sameTypeCount));
}
