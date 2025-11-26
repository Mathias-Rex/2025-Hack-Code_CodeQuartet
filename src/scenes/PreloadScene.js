export default class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    this.load.audio('menuMusic', 'assets/music/menu.mp3');
    this.load.audio('click', 'assets/sounds/click1.mp3');
    this.load.audio('introSound', 'assets/narrations/intro.mp3');
    this.load.audio('gameMusic', 'assets/music/Cosmic Pulse.mp3');
    this.load.image('paddle', 'assets/sprites/playership1.png');
    this.load.image('menuBg', 'assets/images/hangar.png');
    this.load.image('introBg', 'assets/images/intro_background.jpg');
    this.load.image('gameBg', 'assets/images/background.png');
    this.load.image('enemyShip1', 'assets/images/enemyship1.png');
    this.load.image('tycoonBg', 'assets/images/tycoon.png');

  }

  create() {
    if (window.__INTRO_SHOWN) this.scene.start('Menu');
    else this.scene.start('Intro');
  }
}
