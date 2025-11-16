import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import IntroScene from './scenes/IntroScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 600,
  backgroundColor: '#1d212d',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, IntroScene, MenuScene, GameScene]
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  window.__GAME__ = game;
});

