export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0f172a');

    this.add.image(width / 2, height / 2, 'menuBg')
      .setDisplaySize(width, height)
      .setDepth(-1);

    this.title = this.add.text(width / 2, height / 2 - 120, 'Pong Deluxe', {
      fontFamily: 'Arial',
      fontSize: 56,
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 16, true, true);

    this.add.text(width / 2, height / 2 - 60, 'Jobb/ Bal nyilak vagy egér', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#c0d4ff'
    }).setOrigin(0.5);

    const button = this.add.rectangle(width / 2, height / 2 + 40, 220, 70, 0x00c2ff, 0.85)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(button.x, button.y, 'Start', {
      fontFamily: 'Arial',
      fontSize: 32,
      color: '#03253f'
    }).setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x40e9ff, 0.95);
      label.setColor('#001829');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x00c2ff, 0.85);
      label.setColor('#03253f');
    });

    const playClick = () => {
      this.sound.play('click', { volume: 0.7 });
    };

    let gameStarted = false;
    const startGame = () => {
      if (gameStarted) return;
      gameStarted = true;
      if (this.unlockHandler) {
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
        this.unlockHandler = null;
      }
      this.music?.stop();
      this.scene.start('Game');
    };

    button.on('pointerup', () => {
      playClick();
      startGame();
    });
    this.input.keyboard.once('keydown-ENTER', () => {
      playClick();
      startGame();
    });

    this.music = this.sound.add('menuMusic', { loop: true, volume: 0.6 });
    const beginMusic = () => {
      if (!this.music || this.music.isPlaying) return;
      this.music.play();
    };

    beginMusic();
    if (this.sound.locked) {
      this.unlockHandler = () => {
        beginMusic();
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
        this.unlockHandler = null;
      };
      this.sound.on(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());
  }
}
