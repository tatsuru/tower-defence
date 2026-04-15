export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;

// グリッド描画領域の左上オフセット（上部をステータスバー用に確保）
export const GRID_OFFSET_X = 12;
export const GRID_OFFSET_Y = 52;

// ステータスバー高さ
export const STATUS_BAR_HEIGHT = 48;

// 下部UIパネル高さ
export const BOTTOM_PANEL_HEIGHT = 100;

// 画面サイズ
export const SCREEN_WIDTH = GRID_COLS * CELL_SIZE + GRID_OFFSET_X * 2;
export const SCREEN_HEIGHT =
  STATUS_BAR_HEIGHT + GRID_ROWS * CELL_SIZE + BOTTOM_PANEL_HEIGHT + 8;
