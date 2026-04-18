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
  // ── 新タワーのシナジー ──────────────────────────────────────────
  // 雷砲: 雷+砲台 → 両方ダメージ×1.3
  { kinds: ['thunder', 'cannon'], label: '雷砲', bonus: { damageMultiplier: 1.3 }, target: 'both' },
  { kinds: ['cannon', 'thunder'], label: '雷砲', bonus: { damageMultiplier: 1.3 }, target: 'both' },
  // 射撃統制: 狙撃+弓兵 → 射程+0.5、攻速×1.15
  { kinds: ['sniper', 'archer'], label: '射撃統制', bonus: { rangeBonus: 0.5, attackSpeedMultiplier: 1.15 }, target: 'both' },
  { kinds: ['archer', 'sniper'], label: '射撃統制', bonus: { rangeBonus: 0.5, attackSpeedMultiplier: 1.15 }, target: 'both' },
  // バリスタ+砲台 → 両方ダメージ×1.35
  { kinds: ['ballista', 'cannon'], label: 'バリスタ', bonus: { damageMultiplier: 1.35 }, target: 'both' },
  { kinds: ['cannon', 'ballista'], label: 'バリスタ', bonus: { damageMultiplier: 1.35 }, target: 'both' },

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

/** ボーナスを人間が読める文字列にする */
export function bonusToString(bonus: SynergyBonus): string {
  const parts: string[] = [];
  if (bonus.damageMultiplier !== undefined)
    parts.push(`ダメージ×${bonus.damageMultiplier.toFixed(1)}`);
  if (bonus.attackSpeedMultiplier !== undefined)
    parts.push(`攻速×${bonus.attackSpeedMultiplier.toFixed(2)}`);
  if (bonus.rangeBonus !== undefined)
    parts.push(`射程+${bonus.rangeBonus}`);
  return parts.join(' / ');
}

/**
 * あるタワー種別が参加できるシナジーのヒント文字列リストを返す。
 * 例: ['斉射: 弓兵塔と隣接 → 攻速×1.25']
 */
export function getSynergyHints(kind: TowerKind): string[] {
  const seen = new Set<string>();
  const hints: string[] = [];

  for (const def of SYNERGY_DEFS) {
    let partnerKind: TowerKind | null = null;
    let receivesBonus = false;

    if (def.kinds[0] === kind) {
      partnerKind = def.kinds[1];
      receivesBonus = def.target === 'both' || def.target === 'first';
    } else if (def.kinds[1] === kind && def.target === 'both') {
      partnerKind = def.kinds[0];
      receivesBonus = true;
    }

    if (!partnerKind || !receivesBonus) continue;

    const key = `${def.label}-${partnerKind}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const partnerName = TOWER_NAMES[partnerKind];
    hints.push(`[${def.label}] ${partnerName}と隣接 → ${bonusToString(def.bonus)}`);
  }

  return hints;
}

const TOWER_NAMES: Record<TowerKind, string> = {
  archer:   '弓兵塔',
  mage:     '魔法塔',
  cannon:   '砲台',
  ice:      '氷の塔',
  fire:     '炎の塔',
  thunder:  '雷の塔',
  sniper:   '狙撃塔',
  support:  '支援塔',
  ballista: 'バリスタ',
};

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
