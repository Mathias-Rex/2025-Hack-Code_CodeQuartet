export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0f172a');
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true });

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

    this.musicEnabled = this.gameSettings.musicEnabled;

    let gameStarted = false;
    const startGame = () => {
      if (gameStarted) return;
      if (this.isSettingsOpen) return;
      gameStarted = true;
      if (this.unlockHandler) {
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
        this.unlockHandler = null;
      }
      this.music?.stop();
      this.scene.start('Game');
    };

    const startBtn = this.createButton(width / 2, height / 2 + 40, 'Start', () => startGame());
    this.startButtonRect = startBtn.rect;

    const settingsBtn = this.createButton(width / 2, height / 2 + 130, 'Beállítások', () => this.showSettingsMenu());
    this.settingsButtonRect = settingsBtn.rect;

    this.input.keyboard.once('keydown-ENTER', () => {
      startGame();
    });

    this.music = this.sound.add('menuMusic', { loop: true, volume: 0.6 });
    this.beginMusic = () => {
      if (!this.music || this.music.isPlaying || !this.musicEnabled) return;
      this.music.play();
    };

    this.beginMusic();
    if (this.sound.locked) {
      this.unlockHandler = () => {
        this.beginMusic();
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
        this.unlockHandler = null;
      };
      this.sound.on(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music?.stop());

    this.createSettingsMenu();
  }

  createButton(x, y, label, onClick, width = 220, height = 70) {
    const rect = this.add.rectangle(x, y, width, height, 0x00c2ff, 0.85)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: 32,
      color: '#03253f'
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0x40e9ff, 0.95);
      text.setColor('#001829');
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0x00c2ff, 0.85);
      text.setColor('#03253f');
    });

    rect.on('pointerup', () => {
      this.playClickSound();
      onClick();
    });

    return { rect, text };
  }

  playClickSound() {
    this.sound.play('click', { volume: 0.7 });
  }

  createSettingsMenu() {
    const { width, height } = this.scale;
    this.isSettingsOpen = false;
    this.settingsContainer = this.add.container(width / 2, height / 2)
      .setDepth(20)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0.5)
      .setInteractive();
    const panel = this.add.rectangle(0, 0, 360, 260, 0x0a1a32, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(4, 0x5de1ff);
    const title = this.add.text(0, -90, 'Beállítások', {
      fontFamily: 'Arial',
      fontSize: 34,
      color: '#ffffff'
    }).setOrigin(0.5);

    const toggle = this.createSettingsButton(-10, () => this.toggleMusic());
    const back = this.createSettingsButton(70, () => this.hideSettingsMenu(), 'Vissza');

    this.settingsContainer.add([overlay, panel, title, toggle.button, toggle.text, back.button, back.text]);
    this.musicToggleText = toggle.text;
    this.updateMusicToggleLabel();
  }

  createSettingsButton(y, callback, customLabel) {
    const label = customLabel || 'Zene: ';
    const button = this.add.rectangle(0, y, 260, 60, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, y, label, {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#03253f'
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x40e9ff, 0.95));
    button.on('pointerout', () => button.setFillStyle(0x00c2ff, 0.9));
    button.on('pointerup', () => {
      this.playClickSound();
      callback();
    });

    return { button, text };
  }

  showSettingsMenu() {
    this.isSettingsOpen = true;
    this.settingsContainer.setVisible(true);
    this.startButtonRect.disableInteractive();
    this.settingsButtonRect.disableInteractive();
  }

  hideSettingsMenu() {
    this.isSettingsOpen = false;
    this.settingsContainer.setVisible(false);
    this.startButtonRect.setInteractive({ useHandCursor: true });
    this.settingsButtonRect.setInteractive({ useHandCursor: true });
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.gameSettings.musicEnabled = this.musicEnabled;
    if (this.musicEnabled) this.beginMusic();
    else this.music?.stop();
    this.updateMusicToggleLabel();
  }

  updateMusicToggleLabel() {
    if (!this.musicToggleText) return;
    this.musicToggleText.setText(`Zene: ${this.musicEnabled ? 'BE' : 'KI'}`);
  }
}
