import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { SCREEN_WIDTH, SCREEN_HEIGHT, IS_MOBILE } from './constants';

// resolution は Phaser 3.60 以降で型定義から削除されたが実装は残っているためキャストで渡す
const config = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  resolution: window.devicePixelRatio ?? 1,
  roundPixels: true,
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

export default new Phaser.Game(config as Phaser.Types.Core.GameConfig);
