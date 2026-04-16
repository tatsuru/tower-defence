import { INITIAL_GOLD, INITIAL_LIVES } from '../data/waves';

export type Phase = 'preparation' | 'wave' | 'gameover';

export class GameState {
  gold: number = INITIAL_GOLD;
  lives: number = INITIAL_LIVES;
  wave: number = 0;         // 現在のウェーブ番号（準備中は次のウェーブ番号）
  phase: Phase = 'preparation';
  score: number = 0;

  // イベント購読（値変化時に呼ばれるコールバック）
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  addScore(points: number): void {
    this.score += points;
    this.notify();
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.notify();
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.notify();
    return true;
  }

  loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives === 0) this.phase = 'gameover';
    this.notify();
  }

  startWave(): void {
    this.wave += 1;
    this.phase = 'wave';
    this.notify();
  }

  endWave(): void {
    if (this.phase !== 'gameover') {
      this.phase = 'preparation';
    }
    this.notify();
  }

  reset(): void {
    this.gold = INITIAL_GOLD;
    this.lives = INITIAL_LIVES;
    this.wave = 0;
    this.score = 0;
    this.phase = 'preparation';
    this.notify();
  }
}
