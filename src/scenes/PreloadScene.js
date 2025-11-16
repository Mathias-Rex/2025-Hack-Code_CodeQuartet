export default class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    this.load.audio('menuMusic', 'assets/music/menu.mp3');
    this.load.audio('click', 'assets/sounds/click1.mp3');
    this.load.audio('introSound', 'assets/narrations/intro.mp3');
    this.load.image('paddle', 'assets/sprites/ship1.png');
    this.load.image('menuBg', 'assets/images/background.jpg');
    this.load.image('introBg', 'assets/images/intro_background.jpg');
    this.load.image('gameBg', 'assets/images/game_background.jpg');

    

    // Egyszeru texturak generalasa (nincs kulso asset)
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffcc00, 1);
    g.fillCircle(32, 32, 32);
    g.generateTexture('ball', 64, 64);

    g.destroy();

    this.add.text(400, 300, 'Betoltes...', {
      fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    if (window.__INTRO_SHOWN) this.scene.start('Menu');
    else this.scene.start('Intro');
  }
}
