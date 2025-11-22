export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true });
    this.musicVolume = this.gameSettings.musicVolume ?? 0.6;
    this.gameSettings.musicVolume = this.musicVolume;
    if (this.gameSettings.musicEnabled === undefined) {
      this.gameSettings.musicEnabled = this.musicVolume > 0.001;
    }

    this.physics.world.setBounds(0, 0, width, height);

    const bgTexture = this.textures.get('gameBg').getSourceImage();
    const bgTextureWidth = bgTexture.width;
    const bgTextureHeight = bgTexture.height;
    this.background = this.add.tileSprite(width / 2, height / 2, bgTextureWidth, bgTextureHeight, 'gameBg')
      .setDepth(-2);
    const bgScale = Math.max(width / bgTextureWidth, height / bgTextureHeight);
    this.background.setScale(bgScale);
    this.backgroundScrollSpeed = 0.5;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35)
      .setDepth(-1);

    this.playAreaWidth = width;
    this.setupMusic();

    this.paddle = this.physics.add.image(width / 2, height - 70, 'paddle')
      .setImmovable(true)
      .setCollideWorldBounds(true);
    const desiredWidth = 110;
    const scale = desiredWidth / this.paddle.width;
    this.paddle.setScale(scale);
    const bodyWidth = this.paddle.displayWidth * 0.55;
    const bodyHeight = this.paddle.displayHeight * 0.85;
    this.paddle.body.setSize(bodyWidth, bodyHeight);
    this.paddle.body.setOffset(-bodyWidth / 2, -bodyHeight / 2 + this.paddle.displayHeight * 0.08);
    this.paddleHalfWidth = this.paddle.displayWidth / 2;
    this.paddleHalfHeight = this.paddle.displayHeight / 2;
    this.edgePadding = 12;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.createPauseMenu();

  }

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseContainer = this.add.container(width / 2, height / 2)
      .setDepth(10)
      .setVisible(false);
    this.pauseButtons = [];

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 500, 420, 0x0f1e3d, 0.95)
      .setStrokeStyle(4, 0x61dafb);
    const title = this.add.text(0, -150, 'Sz\u00FCnet', {
      fontFamily: 'Arial',
      fontSize: 42,
      color: '#ffffff'
    }).setOrigin(0.5);

    const resumeBtn = this.createMenuButton(0, -60, 'Continue', () => this.resumeGame());
    const settingsBtn = this.createMenuButton(0, 20, 'Settings', () => this.showPauseSettings());
    const quitBtn = this.createMenuButton(0, 100, 'Back to mainmenu', () => this.quitToMenu());
    this.pauseButtons.push(resumeBtn, settingsBtn, quitBtn);

    this.pauseContainer.add([overlay, panel, title, resumeBtn, settingsBtn, quitBtn]);
    this.createPauseSettingsMenu();
  }

  setupMusic() {
    if (!this.gameSettings.musicEnabled) {
      this.gameMusic?.stop();
      return;
    }
    if (!this.gameMusic) {
      this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: this.musicVolume });
    }
    if (!this.gameMusic.isPlaying) this.gameMusic.play();
  }

  createMenuButton(x, y, label, callback) {
    const button = this.add.rectangle(x, y, 320, 72, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: 30,
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

  createVolumeSlider(y, initialValue, onChange) {
    const sliderWidth = 320;
    const slider = this.add.container(0, y);
    const label = this.add.text(0, -28, '', {
      fontFamily: 'Arial',
      fontSize: 26,
      color: '#c0d4ff'
    }).setOrigin(0.5);

    const track = this.add.rectangle(0, 0, sliderWidth, 8, 0x0a253d, 0.9)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(-sliderWidth / 2, 0, sliderWidth * initialValue, 8, 0x00c2ff, 1)
      .setOrigin(0, 0.5);
    const knob = this.add.circle(-sliderWidth / 2 + sliderWidth * initialValue, 0, 10, 0xffffff)
      .setStrokeStyle(2, 0x00c2ff)
      .setInteractive({ useHandCursor: true });

    slider.add([label, track, fill, knob]);

    const setValue = (value, emitChange = true) => {
      const clamped = Phaser.Math.Clamp(value, 0, 1);
      fill.width = sliderWidth * clamped;
      knob.x = -sliderWidth / 2 + sliderWidth * clamped;
      label.setText(`Music volume: ${Math.round(clamped * 100)}%`);
      if (emitChange) onChange(clamped);
    };

    const tmpPoint = new Phaser.Math.Vector2();
    const handlePointer = (pointer) => {
      slider.getWorldTransformMatrix().applyInverse(pointer.worldX, pointer.worldY, tmpPoint);
      const ratio = Phaser.Math.Clamp((tmpPoint.x + sliderWidth / 2) / sliderWidth, 0, 1);
      setValue(ratio);
    };

    [track, knob].forEach((target) => {
      target.on('pointerdown', (pointer) => handlePointer(pointer));
      target.on('pointermove', (pointer) => {
        if (pointer.isDown) handlePointer(pointer);
      });
    });

    setValue(initialValue, false);
    slider.setValue = (value, emitChange = true) => setValue(value, emitChange);
    return slider;
  }

  createPauseSettingsMenu() {
    const { width, height } = this.scale;
    this.pauseSettingsContainer = this.add.container(width / 2, height / 2)
      .setDepth(11)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 520, 420, 0x0a1f3a, 0.96)
      .setStrokeStyle(4, 0x5de1ff);
    const title = this.add.text(0, -150, 'Settings', {
      fontFamily: 'Arial',
      fontSize: 40,
      color: '#ffffff'
    }).setOrigin(0.5);

    const musicSlider = this.createVolumeSlider(-80, this.gameSettings.musicVolume ?? 0.6, (value) => this.handlePauseMusicVolume(value));
    const sfxToggle = this.createSettingsButton(20, () => this.togglePauseSfx(), 'Sound Effect:');
    const back = this.createSettingsButton(140, () => this.hidePauseSettings(), 'Back');

    this.pauseSettingsContainer.add([
      overlay,
      panel,
      title,
      musicSlider,
      sfxToggle.button,
      sfxToggle.text,
      back.button,
      back.text
    ]);

    this.pauseMusicSlider = musicSlider;
    this.pauseSfxLabel = sfxToggle.text;
    this.updatePauseSfxLabel();
  }

  createSettingsButton(y, callback, label) {
    const textLabel = label || 'Music:';
    const button = this.add.rectangle(0, y, 320, 72, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, y, textLabel, {
      fontFamily: 'Arial',
      fontSize: 28,
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
    this.pauseContainer.setVisible(false);
    this.pauseSettingsContainer.setVisible(false);
  }

  quitToMenu() {
    this.physics.world.resume();
    this.gameMusic?.stop();
    this.transitionToScene('Menu');
  }

  showPauseSettings() {
    this.pauseSettingsVisible = true;
    this.pauseSettingsContainer.setVisible(true);
    this.pauseContainer.setVisible(false);
    this.enablePauseButtons(false);
  }

  hidePauseSettings() {
    this.pauseSettingsVisible = false;
    this.pauseSettingsContainer.setVisible(false);
    this.pauseContainer.setVisible(true);
    this.enablePauseButtons(true);
  }

  enablePauseButtons(enable) {
    this.pauseButtons.forEach((container) => {
      if (!container.buttonRef) return;
      if (enable) container.buttonRef.setInteractive({ useHandCursor: true });
      else container.buttonRef.disableInteractive();
    });
  }

  handlePauseMusicVolume(value, syncSlider = false) {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.gameSettings.musicVolume = clamped;
    this.gameSettings.musicEnabled = clamped > 0.001;
    this.musicVolume = clamped;
    if (this.gameSettings.musicEnabled) {
      this.setupMusic();
      this.gameMusic?.setVolume(clamped);
    } else {
      this.gameMusic?.stop();
    }
    if (syncSlider) this.pauseMusicSlider?.setValue(clamped, false);
  }

  togglePauseSfx() {
    this.gameSettings.sfxEnabled = !this.gameSettings.sfxEnabled;
    this.updatePauseSfxLabel();
  }

  updatePauseSfxLabel() {
    if (!this.pauseSfxLabel) return;
    this.pauseSfxLabel.setText(`Sound Effect: ${this.gameSettings.sfxEnabled ? 'ON' : 'OFF'}`);
  }

  transitionToScene(targetScene, duration = 650) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetScene);
    });
    this.cameras.main.fadeOut(duration, 0, 0, 0);
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
    this.paddle.setVelocityY(0);

    this.paddle.x = Phaser.Math.Clamp(
      this.paddle.x,
      this.paddleHalfWidth + this.edgePadding,
      this.playAreaWidth - this.paddleHalfWidth - this.edgePadding
    );
    this.paddle.y = this.scale.height - this.paddleHalfHeight - this.edgePadding;

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
    }

    if (this.background) {
      this.background.tilePositionY -= this.backgroundScrollSpeed;
    }
  }
}


