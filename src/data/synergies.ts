import { TowerKind } from './towers';

export interface SynergyBonus {
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeBonus?: number;      // セル数加算
}

export interface SynergyDef {
  /** タワーの種類ペア。同じ種類の場合は同じ値を2つ入れる */
  kinds: [TowerKind, TowerKind];
  label: string;
  bonus: SynergyBonus;
  /** 適用対象: 'both'=両方, 'first'=kinds[0]のみ */
  target: 'both' | 'first';
}

export const SYNERGY_DEFS: SynergyDef[] = [
  {
    kinds: ['ice', 'fire'],
    label: '凍炎',
    bonus: { damageMultiplier: 1.5 },
    target: 'first', // 炎の塔(first)のDoTが強化される
  },
  {
    kinds: ['fire', 'ice'],
    label: '凍炎',
    bonus: { damageMultiplier: 1.5 },
    target: 'first', // 氷→炎の順でも同じ効果（炎が強化）
  },
  {
    kinds: ['archer', 'archer'],
    label: '斉射',
    bonus: { attackSpeedMultiplier: 1.25 },
    target: 'both',
  },
  {
    kinds: ['mage', 'mage'],
    label: '共鳴',
    bonus: { rangeBonus: 0.5 },
    target: 'both',
  },
  {
    kinds: ['cannon', 'ice'],
    label: '氷砲',
    bonus: { damageMultiplier: 1.3 },
    target: 'first', // 砲台(first)が強化
  },
  {
    kinds: ['ice', 'cannon'],
    label: '氷砲',
    bonus: { damageMultiplier: 1.3 },
    target: 'first', // 氷→砲台の順でも砲台が強化
  },
];

/**
 * 2つのタワーの組み合わせからシナジーを探す。
 * towerA が受けるボーナスを返す（towerBを隣人として見たとき）。
 */
export function findSynergy(towerAKind: TowerKind, towerBKind: TowerKind): SynergyBonus | null {
  for (const def of SYNERGY_DEFS) {
    if (def.kinds[0] === towerAKind && def.kinds[1] === towerBKind) {
      if (def.target === 'both' || def.target === 'first') {
        return def.bonus;
      }
    }
    if (def.kinds[1] === towerAKind && def.kinds[0] === towerBKind) {
      if (def.target === 'both') {
        return def.bonus;
      }
    }
  }
  return null;
}

/** 複数の隣接タワーからシナジーをまとめて合算する */
export function mergeBonuses(bonuses: SynergyBonus[]): SynergyBonus {
  const result: SynergyBonus = {};
  for (const b of bonuses) {
    if (b.damageMultiplier !== undefined) {
      result.damageMultiplier = (result.damageMultiplier ?? 1) * b.damageMultiplier;
    }
    if (b.attackSpeedMultiplier !== undefined) {
      result.attackSpeedMultiplier = (result.attackSpeedMultiplier ?? 1) * b.attackSpeedMultiplier;
    }
    if (b.rangeBonus !== undefined) {
      result.rangeBonus = (result.rangeBonus ?? 0) + b.rangeBonus;
    }
  }
  return result;
}
