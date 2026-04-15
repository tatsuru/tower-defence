export const enum CellType {
  Empty = 'empty',       // タワー設置可能
  Path = 'path',         // 敵の経路（設置不可）
  Blocked = 'blocked',   // 地形（設置不可）
  Entrance = 'entrance', // 入口
  Exit = 'exit',         // 出口
}

export interface Cell {
  col: number;
  row: number;
  type: CellType;
}

export type Grid = Cell[][];
