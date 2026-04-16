export const ENEMY_DEFS = {
    goblin: {
        kind: 'goblin',
        name: 'ゴブリン',
        baseHp: 60,
        speed: 2.0,
        reward: 8,
        traits: [],
        color: 0x66bb6a,
        radius: 10,
    },
    orc: {
        kind: 'orc',
        name: 'オーク',
        baseHp: 250,
        speed: 1.5,
        reward: 15,
        traits: [],
        color: 0x8d6e63,
        radius: 14,
    },
    dragon: {
        kind: 'dragon',
        name: 'ドラゴン',
        baseHp: 1200,
        speed: 1.2,
        reward: 100,
        traits: [],
        color: 0xef5350,
        radius: 18,
    },
    // 装甲オーク（ウェーブ後半から登場）
    armored_orc: {
        kind: 'orc',
        name: '装甲オーク',
        baseHp: 300,
        speed: 1.2,
        reward: 25,
        traits: ['armored'],
        color: 0x78909c,
        radius: 16,
    },
    // 分裂ゴブリン（死亡時に2体スポーン）
    splitting_goblin: {
        kind: 'goblin',
        name: '分裂ゴブリン',
        baseHp: 80,
        speed: 1.8,
        reward: 10,
        traits: ['splitting'],
        color: 0xaed581,
        radius: 12,
    },
    // 分裂後の小型ゴブリン（特性なし・低HP）
    goblin_split: {
        kind: 'goblin_split',
        name: 'ゴブリン(分裂)',
        baseHp: 25,
        speed: 2.5,
        reward: 3,
        traits: [],
        color: 0xdce775,
        radius: 7,
    },
};
export const ALL_ENEMY_DEFS = ENEMY_DEFS;
export function scaleHp(baseHp, wave) {
    return Math.round(baseHp * Math.pow(1.13, wave - 1));
}
