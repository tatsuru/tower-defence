export const GRID_COLS = 20;
export const GRID_ROWS = 15;

export const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 600;

export const CELL_SIZE        = IS_MOBILE ? 26  : 40;
export const GRID_OFFSET_X    = IS_MOBILE ? 8   : 12;
export const GRID_OFFSET_Y    = IS_MOBILE ? 44  : 52;
export const STATUS_BAR_HEIGHT = IS_MOBILE ? 40  : 48;
export const BOTTOM_PANEL_HEIGHT = IS_MOBILE ? 480 : 208;

export const SCREEN_WIDTH  = GRID_COLS * CELL_SIZE + GRID_OFFSET_X * 2;
export const SCREEN_HEIGHT = STATUS_BAR_HEIGHT + GRID_ROWS * CELL_SIZE + BOTTOM_PANEL_HEIGHT + 8;
