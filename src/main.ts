import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  backgroundColor: '#1a1a2e',
  parent: 'game',
  scene: [TitleScene, GameScene],
};

export default new Phaser.Game(config);
