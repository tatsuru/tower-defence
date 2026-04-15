import { GRID_COLS, GRID_ROWS } from '../constants';
import { Cell, CellType, Grid } from '../types';

export interface MapData {
  grid: Grid;
  entranceRow: number;
  exitRow: number;
  path: { col: number; row: number }[];
}

const MAX_RETRIES = 20;
// 地形障害物が占める割合（多すぎると経路が見つからなくなる）
const BLOCKED_RATIO = 0.12;

export class MapGenerator {
  generate(): MapData {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = this.tryGenerate();
      if (result !== null) return result;
    }
    // リトライ上限を超えた場合は障害物なしで生成（必ず経路が存在する）
    return this.tryGenerate(0)!;
  }

  private tryGenerate(blockedRatio = BLOCKED_RATIO): MapData | null {
    const grid = this.buildEmptyGrid();

    const entranceRow = Math.floor(Math.random() * GRID_ROWS);
    const exitRow = Math.floor(Math.random() * GRID_ROWS);

    this.placeBlocked(grid, blockedRatio, entranceRow, exitRow);

    grid[entranceRow][0].type = CellType.Entrance;
    grid[exitRow][GRID_COLS - 1].type = CellType.Exit;

    const path = this.bfs(grid, entranceRow, exitRow);
    if (path === null) return null;

    for (const { col, row } of path) {
      const cell = grid[row][col];
      if (cell.type === CellType.Empty) {
        cell.type = CellType.Path;
      }
    }

    return { grid, entranceRow, exitRow, path };
  }

  private buildEmptyGrid(): Grid {
    const grid: Grid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        grid[row][col] = { col, row, type: CellType.Empty };
      }
    }
    return grid;
  }

  private placeBlocked(grid: Grid, ratio: number, entranceRow: number, exitRow: number): void {
    const total = GRID_COLS * GRID_ROWS;
    const count = Math.floor(total * ratio);

    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 10) {
      tries++;
      const col = Math.floor(Math.random() * GRID_COLS);
      const row = Math.floor(Math.random() * GRID_ROWS);

      // 入口列・出口列・入口行・出口行の端は空けておく
      if (col === 0 || col === GRID_COLS - 1) continue;
      if (row === entranceRow && col <= 2) continue;
      if (row === exitRow && col >= GRID_COLS - 3) continue;
      if (grid[row][col].type !== CellType.Empty) continue;

      grid[row][col].type = CellType.Blocked;
      placed++;
    }
  }

  /**
   * BFS で入口から出口への最短経路を求める。
   * 経路が存在しない場合は null を返す。
   */
  private bfs(
    grid: Grid,
    entranceRow: number,
    exitRow: number,
  ): { col: number; row: number }[] | null {
    type Pos = { col: number; row: number };

    const startCol = 0;
    const goalCol = GRID_COLS - 1;

    const visited: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(false),
    );
    const prev: (Pos | null)[][] = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(null),
    );

    const queue: Pos[] = [{ col: startCol, row: entranceRow }];
    visited[entranceRow][startCol] = true;

    const dirs: Pos[] = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;

      if (cur.col === goalCol && cur.row === exitRow) {
        return this.reconstructPath(prev, entranceRow, exitRow);
      }

      for (const d of dirs) {
        const nc = cur.col + d.col;
        const nr = cur.row + d.row;

        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
        if (visited[nr][nc]) continue;
        if (grid[nr][nc].type === CellType.Blocked) continue;

        visited[nr][nc] = true;
        prev[nr][nc] = cur;
        queue.push({ col: nc, row: nr });
      }
    }

    return null;
  }

  private reconstructPath(
    prev: ({ col: number; row: number } | null)[][],
    entranceRow: number,
    exitRow: number,
  ): { col: number; row: number }[] {
    const path: { col: number; row: number }[] = [];
    let cur: { col: number; row: number } | null = { col: GRID_COLS - 1, row: exitRow };

    while (cur !== null) {
      path.unshift(cur);
      cur = prev[cur.row][cur.col];
    }

    // 開始点が入口かチェック
    if (path[0].col !== 0 || path[0].row !== entranceRow) return [];
    return path;
  }
}

export function isBuildable(cell: Cell): boolean {
  return cell.type === CellType.Empty;
}
