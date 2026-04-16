const KEY = 'td_high_score';

export function loadHighScore(): number {
  const raw = localStorage.getItem(KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export function saveHighScore(score: number): boolean {
  const current = loadHighScore();
  if (score > current) {
    localStorage.setItem(KEY, String(score));
    return true;
  }
  return false;
}
