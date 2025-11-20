export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0f172a');
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true });

    this.add.image(width / 2, height / 2, 'menuBg')
      .setDisplaySize(width, height)
      .setDepth(-1);

    this.title = this.add.text(width / 2, height / 2 - 150, 'OUTBACK', {
      fontFamily: 'Arial',
      fontSize: 120,
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 16, true, true);
    this.add.text(width / 2, this.title.y + 78, 'P L A C E', {
      fontFamily: 'Arial',
      fontSize: 56,
      letterSpacing: 30,
      color: '#c0d4ff'
    }).setOrigin(0.5);

    this.musicVolume = this.gameSettings.musicVolume ?? 0.6;
    this.musicEnabled = this.gameSettings.musicEnabled ?? this.musicVolume > 0.001;
    this.gameSettings.musicVolume = this.musicVolume;
    this.gameSettings.musicEnabled = this.musicEnabled;
    this.sfxEnabled = this.gameSettings.sfxEnabled ?? true;

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

    const startBtn = this.createButton(width / 2, height / 2 + 70, 'Start', () => this.showStartOptions());
    this.startButton = startBtn;
    this.startButtonRect = startBtn.rect;

    const settingsBtn = this.createButton(width / 2, height / 2 + 220, 'Be\u00E1ll\u00EDt\u00E1sok', () => this.showSettingsMenu());
    this.settingsButton = settingsBtn;
    this.settingsButtonRect = settingsBtn.rect;
    this.createStartOptionsMenu(startGame);

    this.input.keyboard.once('keydown-ENTER', () => {
      startGame();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.startOptionsVisible && !this.isSettingsOpen) this.hideStartOptions();
    });

    this.music = this.sound.add('menuMusic', { loop: true, volume: this.musicVolume });
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

  createButton(x, y, label, onClick, width = 360, height = 110, fontSize = 52) {
    const rect = this.add.rectangle(x, y, width, height, 0x4fa9d7, 0.78)
      .setStrokeStyle(4, 0xc6edff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize,
      color: '#03253f'
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0x72c9f1, 0.94);
      text.setColor('#00233c');
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0x4fa9d7, 0.78);
      text.setColor('#032f4c');
    });

    rect.on('pointerup', () => {
      this.playClickSound();
      onClick();
    });

    return { rect, text };
  }

  createVolumeSlider(y, initialValue, onChange) {
    const sliderWidth = 260;
    const slider = this.add.container(0, y);
    const label = this.add.text(0, -28, '', {
      fontFamily: 'Arial',
      fontSize: 22,
      color: '#c0d4ff'
    }).setOrigin(0.5);

    const track = this.add.rectangle(0, 0, sliderWidth, 8, 0x0a253d, 0.9)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(-sliderWidth / 2, 0, sliderWidth * initialValue, 8, 0x72c9f1, 1)
      .setOrigin(0, 0.5);
    const knob = this.add.circle(-sliderWidth / 2 + sliderWidth * initialValue, 0, 10, 0xe8f6ff)
      .setStrokeStyle(2, 0x4fa9d7)
      .setInteractive({ useHandCursor: true });

    slider.add([label, track, fill, knob]);

    const updateLabel = (value) => {
      label.setText(`Zene hanger\u0151: ${Math.round(value * 100)}%`);
    };

    const setValue = (value, emitChange = true) => {
      const clamped = Phaser.Math.Clamp(value, 0, 1);
      fill.width = sliderWidth * clamped;
      knob.x = -sliderWidth / 2 + sliderWidth * clamped;
      updateLabel(clamped);
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

  createStartOptionsMenu(startGame) {
    const { width, height } = this.scale;
    this.startOptionsVisible = false;
    this.tycoonInfoTimer = null;

    const campaignBtn = this.createButton(width / 2, height / 2 + 10, 'START CAMPAIGN', () => {
      this.hideStartOptions();
      startGame();
    }, 280, 60, 28);
    const tycoonBtn = this.createButton(width / 2, height / 2 + 90, 'START TYCOON', () => this.handleTycoonSelection(), 280, 60, 28);
    this.startOptionButtons = [campaignBtn, tycoonBtn];
    this.toggleStartSubmenu(false);

    this.startOptionHint = this.add.text(width / 2, height / 2 - 30, 'ESC - Vissza a men\u00FCbe', {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#c0d4ff'
    }).setOrigin(0.5).setVisible(false);

    this.tycoonInfoText = this.add.text(width / 2, height / 2 + 160, 'Tycoon mode coming soon...', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#ffd166'
    }).setOrigin(0.5).setVisible(false);
  }

  toggleMainButtons(visible) {
    const buttons = [this.startButton, this.settingsButton];
    buttons.forEach((button) => {
      if (!button) return;
      button.rect.setVisible(visible);
      button.text.setVisible(visible);
      if (visible && !this.isSettingsOpen) button.rect.setInteractive({ useHandCursor: true });
      else button.rect.disableInteractive();
    });
  }

  toggleStartSubmenu(visible) {
    if (!this.startOptionButtons) return;
    this.startOptionButtons.forEach((button) => {
      button.rect.setVisible(visible);
      button.text.setVisible(visible);
      if (visible) button.rect.setInteractive({ useHandCursor: true });
      else button.rect.disableInteractive();
    });
    if (!visible) this.tycoonInfoText?.setVisible(false);
    this.startOptionHint?.setVisible(visible);
  }

  showStartOptions() {
    if (this.startOptionsVisible || this.isSettingsOpen) return;
    this.startOptionsVisible = true;
    this.toggleMainButtons(false);
    this.toggleStartSubmenu(true);
  }

  hideStartOptions() {
    if (!this.startOptionsVisible) return;
    this.startOptionsVisible = false;
    this.toggleStartSubmenu(false);
    if (!this.isSettingsOpen) this.toggleMainButtons(true);
  }

  handleTycoonSelection() {
    if (!this.tycoonInfoText) return;
    this.tycoonInfoText.setVisible(true);
    if (this.tycoonInfoTimer) {
      this.tycoonInfoTimer.remove();
      this.tycoonInfoTimer = null;
    }
    this.tycoonInfoTimer = this.time.delayedCall(1800, () => {
      this.tycoonInfoText?.setVisible(false);
      this.tycoonInfoTimer = null;
    });
  }

  playClickSound() {
    if (this.sfxEnabled) this.sound.play('click', { volume: 0.7 });
  }

  createSettingsMenu() {
    const { width, height } = this.scale;
    this.isSettingsOpen = false;
    this.settingsContainer = this.add.container(width / 2, height / 2)
      .setDepth(20)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 420, 320, 0x0a1a32, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(4, 0x5de1ff);
    const title = this.add.text(0, -120, 'Be\u00E1ll\u00EDt\u00E1sok', {
      fontFamily: 'Arial',
      fontSize: 34,
      color: '#ffffff'
    }).setOrigin(0.5);

    const musicSlider = this.createVolumeSlider(-70, this.musicVolume, (value) => this.setMusicVolume(value, false));
    const sfxToggle = this.createSettingsButton(20, () => this.toggleSfx(), 'Hangeffektek: ');
    const back = this.createSettingsButton(100, () => this.hideSettingsMenu(), 'Vissza');

    this.settingsContainer.add([overlay, panel, title, musicSlider, sfxToggle.button, sfxToggle.text, back.button, back.text]);
    this.musicVolumeSlider = musicSlider;
    this.sfxToggleText = sfxToggle.text;
    this.updateSfxToggleLabel();
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
    this.hideStartOptions();
    this.isSettingsOpen = true;
    this.settingsContainer.setVisible(true);
    this.startButtonRect.disableInteractive();
    this.settingsButtonRect.disableInteractive();
  }

  hideSettingsMenu() {
    this.isSettingsOpen = false;
    this.settingsContainer.setVisible(false);
    if (!this.startOptionsVisible) this.toggleMainButtons(true);
  }

  setMusicVolume(value, updateSlider = true) {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.musicVolume = clamped;
    this.gameSettings.musicVolume = clamped;
    this.musicEnabled = clamped > 0.001;
    this.gameSettings.musicEnabled = this.musicEnabled;
    if (this.musicEnabled) {
      if (!this.music?.isPlaying) this.beginMusic();
      this.music?.setVolume(clamped);
    } else {
      this.music?.stop();
    }
    if (updateSlider) this.musicVolumeSlider?.setValue(clamped, false);
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    this.gameSettings.sfxEnabled = this.sfxEnabled;
    this.updateSfxToggleLabel();
  }

  updateSfxToggleLabel() {
    if (!this.sfxToggleText) return;
    this.sfxToggleText.setText(`Hangeffektek: ${this.sfxEnabled ? 'BE' : 'KI'}`);
  }
}


