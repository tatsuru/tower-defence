import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 640,
  backgroundColor: '#1a1a2e',
  scene: {
    create() {
      const text = this.add.text(512, 320, 'Fantasy Tower Defense', {
        fontSize: '32px',
        color: '#ffffff',
      });
      text.setOrigin(0.5);
    },
  },
};

new Phaser.Game(config);
