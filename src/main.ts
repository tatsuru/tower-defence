import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { SCREEN_WIDTH, SCREEN_HEIGHT, IS_MOBILE } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  resolution: window.devicePixelRatio ?? 1,
  backgroundColor: '#1a1a2e',
  parent: 'game',
  scale: IS_MOBILE
    ? {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      }
    : {
        mode: Phaser.Scale.NONE,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      },
  scene: [TitleScene, GameScene],
};

export default new Phaser.Game(config);
