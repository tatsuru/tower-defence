import { GRID_COLS, GRID_ROWS } from '../constants';
import { Cell, CellType, Grid } from '../types';

export interface MapData {
  grid: Grid;
  entranceRow: number;
  exitRow: number;
  path: { col: number; row: number }[];
}

const MAX_RETRIES = 30;
const BLOCKED_RATIO = 0.08;
const NUM_WAYPOINTS = 3;

type Pos = { col: number; row: number };

export class MapGenerator {
  generate(): MapData {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = this.tryGenerate();
      if (result !== null) return result;
    }
    return this.tryGenerate(0)!;
  }

  private tryGenerate(blockedRatio = BLOCKED_RATIO): MapData | null {
    const grid = this.buildEmptyGrid();

    const entranceRow = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
    const exitRow = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));

    const waypoints = this.generateWaypoints(entranceRow, exitRow);

    this.placeBlocked(grid, blockedRatio, entranceRow, exitRow, waypoints);

    grid[entranceRow][0].type = CellType.Entrance;
    grid[exitRow][GRID_COLS - 1].type = CellType.Exit;

    // 入口 → WP1 → WP2 → ... → 出口 の各区間を BFS で繋ぐ
    const checkpoints: Pos[] = [
      { col: 0, row: entranceRow },
      ...waypoints,
      { col: GRID_COLS - 1, row: exitRow },
    ];

    const fullPath: Pos[] = [];
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const segment = this.bfsSegment(grid, checkpoints[i], checkpoints[i + 1]);
      if (!segment || segment.length === 0) return null;

      // 各セグメント終点以外を Path としてマーク（次区間が再利用しないよう）
      for (let k = 0; k < segment.length - 1; k++) {
        const { col, row } = segment[k];
        if (grid[row][col].type === CellType.Empty) {
          grid[row][col].type = CellType.Path;
        }
      }

      if (i === 0) {
        fullPath.push(...segment);
      } else {
        fullPath.push(...segment.slice(1));
      }
    }

    if (fullPath.length === 0) return null;

    // 最終点も Path に
    const last = fullPath[fullPath.length - 1];
    if (grid[last.row][last.col].type === CellType.Empty) {
      grid[last.row][last.col].type = CellType.Path;
    }

    return { grid, entranceRow, exitRow, path: fullPath };
  }

  /**
   * ウェイポイントを生成する。
   * 列方向は等分し、行方向は前の点から半分以上離れた位置を交互に選ぶことで
   * 経路がグリッドを縦断するよう誘導する。
   */
  private generateWaypoints(entranceRow: number, _exitRow: number): Pos[] {
    const segW = Math.floor(GRID_COLS / (NUM_WAYPOINTS + 1));
    const waypoints: Pos[] = [];
    const half = Math.floor(GRID_ROWS / 2);
    let prevRow = entranceRow;

    for (let i = 1; i <= NUM_WAYPOINTS; i++) {
      // 列はセグメント幅 ± 1 でランダムにずらす
      const col = Math.max(2, Math.min(GRID_COLS - 3, segW * i + Math.floor(Math.random() * 3) - 1));

      // 行は前の点から上下どちらかに大きくずらす
      let row: number;
      if (prevRow < half) {
        // 前が上半分 → 下半分から選ぶ
        row = half + 1 + Math.floor(Math.random() * (GRID_ROWS - 3 - half));
      } else {
        // 前が下半分 → 上半分から選ぶ
        row = 1 + Math.floor(Math.random() * (half - 1));
      }
      row = Math.max(1, Math.min(GRID_ROWS - 2, row));

      waypoints.push({ col, row });
      prevRow = row;
    }

    return waypoints;
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

  private placeBlocked(
    grid: Grid,
    ratio: number,
    entranceRow: number,
    exitRow: number,
    waypoints: Pos[],
  ): void {
    const total = GRID_COLS * GRID_ROWS;
    const count = Math.floor(total * ratio);

    // ウェイポイント周辺 1 マスはブロック禁止
    const forbidden = new Set<string>();
    const key = (c: number, r: number) => `${c},${r}`;
    for (const wp of waypoints) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          forbidden.add(key(wp.col + dc, wp.row + dr));
        }
      }
    }

    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 10) {
      tries++;
      const col = Math.floor(Math.random() * GRID_COLS);
      const row = Math.floor(Math.random() * GRID_ROWS);

      if (col === 0 || col === GRID_COLS - 1) continue;
      if (row === entranceRow && col <= 2) continue;
      if (row === exitRow && col >= GRID_COLS - 3) continue;
      if (forbidden.has(key(col, row))) continue;
      if (grid[row][col].type !== CellType.Empty) continue;

      grid[row][col].type = CellType.Blocked;
      placed++;
    }
  }

  /**
   * 任意の 2 点間を BFS で繋ぐ。
   * CellType.Path（前区間の経路）はゴール以外ブロック扱いにして経路の重複を防ぐ。
   */
  private bfsSegment(grid: Grid, start: Pos, goal: Pos): Pos[] | null {
    const visited: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(false),
    );
    const prev: (Pos | null)[][] = Array.from({ length: GRID_ROWS }, () =>
      new Array(GRID_COLS).fill(null),
    );

    const queue: Pos[] = [{ ...start }];
    visited[start.row][start.col] = true;

    const dirs: Pos[] = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;

      if (cur.col === goal.col && cur.row === goal.row) {
        const path: Pos[] = [];
        let c: Pos | null = { col: goal.col, row: goal.row };
        while (c !== null) {
          path.unshift({ ...c });
          c = prev[c.row][c.col];
        }
        return path;
      }

      for (const d of dirs) {
        const nc = cur.col + d.col;
        const nr = cur.row + d.row;

        if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
        if (visited[nr][nc]) continue;

        const type = grid[nr][nc].type;
        if (type === CellType.Blocked) continue;
        // 前区間の経路セルはゴール以外を通行禁止にして重複を防ぐ
        if (type === CellType.Path && !(nc === goal.col && nr === goal.row)) continue;

        visited[nr][nc] = true;
        prev[nr][nc] = cur;
        queue.push({ col: nc, row: nr });
      }
    }

    return null;
  }
}

export function isBuildable(cell: Cell): boolean {
  return cell.type === CellType.Empty;
}
