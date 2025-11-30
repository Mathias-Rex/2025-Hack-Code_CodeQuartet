export default class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b1224');
    this.loadingText = this.add.text(width / 2, height / 2, 'Loading', {
      fontFamily: 'Arial',
      fontSize: 42,
      fontStyle: 'bold',
      color: '#c6d6ff'
    }).setOrigin(0.5);

    this.load.audio('menuMusic', 'assets/music/menu.mp3');
    this.load.audio('click', 'assets/sounds/click1.mp3');
    this.load.audio('introSound', 'assets/narrations/intro.mp3');
    this.load.audio('shot', 'assets/sounds/shots.mp3');
    this.load.audio('explode', 'assets/sounds/explode.mp3');
    this.load.audio('reload', 'assets/sounds/reload.mp3');
    this.load.audio('reload2', 'assets/sounds/reload2.mp3');
    this.load.audio('playerDeath', 'assets/sounds/playerdeath.mp3');
    this.load.audio('gameMusic', 'assets/music/Cosmic Pulse.mp3');
    this.load.audio('gameMusicAlt', 'assets/music/Rivers of Ash.mp3');
    this.load.video('trailerVideo', 'assets/videos/tralervideo.mp4', 'loadeddata', false, true);
    this.load.image('paddle', 'assets/sprites/playership1.png');
    this.load.image('playerman', 'assets/sprites/playership1.png');
    this.load.image('menuBg', 'assets/images/hangar.png');
    this.load.image('introBg', 'assets/images/intro_background.jpg');
    this.load.image('gameBg', 'assets/images/background.png');
    this.load.image('death', 'assets/images/death.png');
    this.load.image('enemyShip', 'assets/sprites/enemyship1.png');
    this.load.image('enemyShip2', 'assets/sprites/enemyship2.png');
    this.load.image('enemyShip3', 'assets/sprites/enemyship3.png');

  }

  create() {
    const nextScene = window.__DEBUG__ ? 'Game' : (window.__INTRO_SHOWN ? 'Menu' : 'Intro');
    this.time.delayedCall(50, () => this.scene.start(nextScene));
  }
}

