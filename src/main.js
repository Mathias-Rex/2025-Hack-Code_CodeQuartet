import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import IntroScene from './scenes/IntroScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';

const getScaleConfig = () => ({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1d212d',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, IntroScene, MenuScene, GameScene]
});

window.addEventListener('load', () => {
  const game = new Phaser.Game(getScaleConfig());
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
  window.__GAME__ = game;
});

