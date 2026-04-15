import Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: number;
  life: number; // 0〜1
}

/**
 * シーンに1つ置いて使い回す軽量パーティクルシステム。
 * Phaser のパーティクルマネージャーを使わず Graphics で描画する。
 */
export class ParticleEffect {
  private graphics: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(8);
  }

  burst(x: number, y: number, color: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        color,
        life: 1,
      });
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.graphics.clear();

    this.particles = this.particles.filter((p) => p.life > 0);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt; // 重力
      p.life -= dt * 2.5;
      p.alpha = Math.max(0, p.life);

      this.graphics.fillStyle(p.color, p.alpha);
      this.graphics.fillCircle(p.x, p.y, p.radius * p.life);
    }
  }
}
