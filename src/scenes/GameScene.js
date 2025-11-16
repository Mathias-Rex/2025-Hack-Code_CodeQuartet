export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const { width, height } = this.scale;
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true });

    this.physics.world.setBounds(0, 0, width, height);

    const bg = this.add.image(width / 2, height / 2, 'gameBg').setDepth(-2);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale);

    this.playAreaWidth = width;

    this.paddle = this.physics.add.image(width / 2, height - 70, 'paddle')
      .setImmovable(true)
      .setCollideWorldBounds(true);
    const desiredWidth = 170;
    const scale = desiredWidth / this.paddle.width;
    this.paddle.setScale(scale);
    this.paddle.body.setSize(this.paddle.displayWidth, this.paddle.displayHeight, true);
    this.paddleHalfWidth = this.paddle.displayWidth / 2;
    this.edgePadding = 12;

    this.ball = this.physics.add.image(width / 2, height / 2, 'ball')
      .setVelocity(200, 160)
      .setBounce(1, 1)
      .setCollideWorldBounds(true);
    this.ball.setDisplaySize(60, 60);
    this.ball.body.setCircle(30, this.ball.width / 2 - 30, this.ball.height / 2 - 30);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.physics.add.collider(this.ball, this.paddle);

    this.add.text(10, 10, 'Bal/Jobb: paddle | Reset: R | Esc: Menu', {
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#a8b3cf'
    });

    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.savedVelocity = new Phaser.Math.Vector2();
    this.createPauseMenu();

  }

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseContainer = this.add.container(width / 2, height / 2)
      .setDepth(10)
      .setVisible(false);
    this.pauseButtons = [];

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 400, 360, 0x0f1e3d, 0.95)
      .setStrokeStyle(4, 0x61dafb);
    const title = this.add.text(0, -130, 'Szünet', {
      fontFamily: 'Arial',
      fontSize: 34,
      color: '#ffffff'
    }).setOrigin(0.5);

    const resumeBtn = this.createMenuButton(0, -60, 'Folytatás', () => this.resumeGame());
    const settingsBtn = this.createMenuButton(0, 20, 'Beállítások', () => this.showPauseSettings());
    const quitBtn = this.createMenuButton(0, 100, 'Kilépés a menübe', () => this.quitToMenu());
    this.pauseButtons.push(resumeBtn, settingsBtn, quitBtn);

    this.pauseContainer.add([overlay, panel, title, resumeBtn, settingsBtn, quitBtn]);
    this.createPauseSettingsMenu();
  }

  createMenuButton(x, y, label, callback) {
    const button = this.add.rectangle(x, y, 260, 60, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
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

    const container = this.add.container(0, 0, [button, text]);
    container.buttonRef = button;
    return container;
  }

  createPauseSettingsMenu() {
    const { width, height } = this.scale;
    this.pauseSettingsContainer = this.add.container(width / 2, height / 2)
      .setDepth(11)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0.5)
      .setInteractive();
    const panel = this.add.rectangle(0, 0, 360, 240, 0x0a1f3a, 0.96)
      .setStrokeStyle(4, 0x5de1ff);
    const title = this.add.text(0, -80, 'Beállítások', {
      fontFamily: 'Arial',
      fontSize: 32,
      color: '#ffffff'
    }).setOrigin(0.5);

    const musicToggle = this.createSettingsButton(-40, () => this.togglePauseMusic());
    const sfxToggle = this.createSettingsButton(40, () => this.togglePauseSfx(), 'Hangeffektek:');
    const back = this.createSettingsButton(120, () => this.hidePauseSettings(), 'Vissza');

    this.pauseSettingsContainer.add([
      overlay,
      panel,
      title,
      musicToggle.button,
      musicToggle.text,
      sfxToggle.button,
      sfxToggle.text,
      back.button,
      back.text
    ]);

    this.pauseMusicLabel = musicToggle.text;
    this.pauseSfxLabel = sfxToggle.text;
    this.updatePauseMusicLabel();
    this.updatePauseSfxLabel();
  }

  createSettingsButton(y, callback, label) {
    const textLabel = label || 'Zene:';
    const button = this.add.rectangle(0, y, 260, 60, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, y, textLabel, {
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

  playClickSound() {
    if (this.gameSettings.sfxEnabled) {
      this.sound.play('click', { volume: 0.7 });
    }
  }

  pauseGame() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.pauseSettingsVisible = false;
    this.savedVelocity.copy(this.ball.body.velocity);
    this.ball.setVelocity(0, 0);
    this.paddle.setVelocity(0, 0);
    this.physics.world.pause();
    this.pauseContainer.setVisible(true);
    this.pauseSettingsContainer.setVisible(false);
    this.enablePauseButtons(true);
  }

  resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.physics.world.resume();
    this.ball.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
    this.pauseContainer.setVisible(false);
    this.pauseSettingsContainer.setVisible(false);
  }

  quitToMenu() {
    this.physics.world.resume();
    this.scene.start('Menu');
  }

  showPauseSettings() {
    this.pauseSettingsVisible = true;
    this.pauseSettingsContainer.setVisible(true);
    this.enablePauseButtons(false);
  }

  hidePauseSettings() {
    this.pauseSettingsVisible = false;
    this.pauseSettingsContainer.setVisible(false);
    this.enablePauseButtons(true);
  }

  enablePauseButtons(enable) {
    this.pauseButtons.forEach((container) => {
      if (!container.buttonRef) return;
      if (enable) container.buttonRef.setInteractive({ useHandCursor: true });
      else container.buttonRef.disableInteractive();
    });
  }

  togglePauseMusic() {
    this.gameSettings.musicEnabled = !this.gameSettings.musicEnabled;
    this.updatePauseMusicLabel();
  }

  updatePauseMusicLabel() {
    if (!this.pauseMusicLabel) return;
    this.pauseMusicLabel.setText(`Zene: ${this.gameSettings.musicEnabled ? 'BE' : 'KI'}`);
  }

  togglePauseSfx() {
    this.gameSettings.sfxEnabled = !this.gameSettings.sfxEnabled;
    this.updatePauseSfxLabel();
  }

  updatePauseSfxLabel() {
    if (!this.pauseSfxLabel) return;
    this.pauseSfxLabel.setText(`Hangeffektek: ${this.gameSettings.sfxEnabled ? 'BE' : 'KI'}`);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.isPaused && this.pauseSettingsVisible) {
        this.hidePauseSettings();
        return;
      }
      if (this.isPaused) this.resumeGame();
      else this.pauseGame();
    }

    if (this.isPaused) return;

    const speed = 400;
    const moveLeft = this.cursors.left.isDown || this.keyA.isDown;
    const moveRight = this.cursors.right.isDown || this.keyD.isDown;

    if (moveLeft && !moveRight) this.paddle.setVelocityX(-speed);
    else if (moveRight && !moveLeft) this.paddle.setVelocityX(speed);
    else this.paddle.setVelocityX(0);

    this.paddle.x = Phaser.Math.Clamp(
      this.paddle.x,
      this.paddleHalfWidth + this.edgePadding,
      this.playAreaWidth - this.paddleHalfWidth - this.edgePadding
    );

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
    }
  }
}
