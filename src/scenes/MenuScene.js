export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0f172a');
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true });

    this.add.image(width / 2, height / 2, 'menuBg')
      .setDisplaySize(width, height)
      .setDepth(-1);

    this.title = this.add.text(width / 2, height / 2 - 120, 'T H E BACK of BEYOND', {
      fontFamily: 'Arial',
      fontSize: 110,
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 16, true, true);

    this.musicVolume = this.gameSettings.musicVolume ?? 0.6;
    this.musicEnabled = this.gameSettings.musicEnabled ?? this.musicVolume > 0.001;
    this.gameSettings.musicVolume = this.musicVolume;
    this.gameSettings.musicEnabled = this.musicEnabled;
    this.sfxEnabled = this.gameSettings.sfxEnabled ?? true;

    let startLocked = false;
    const beginSceneTransition = () => {
      if (startLocked) return false;
      if (this.isSettingsOpen) return false;
      startLocked = true;
      if (this.unlockHandler) {
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler);
        this.unlockHandler = null;
      }
      this.music?.stop();
      return true;
    };

    const startCampaign = () => {
      if (!beginSceneTransition()) return;
      this.transitionToScene('Game');
    };

    const startTycoon = () => {
      if (!beginSceneTransition()) return;
      this.transitionToScene('Tycoon');
    };

    const startBtn = this.createButton(width / 2, height / 2 + 70, 'Start', () => this.showStartOptions());
    this.startButton = startBtn;
    this.startButtonRect = startBtn.rect;

    const settingsBtn = this.createButton(width / 2, height / 2 + 220, 'Settings', () => this.showSettingsMenu());
    this.settingsButton = settingsBtn;
    this.settingsButtonRect = settingsBtn.rect;
    this.createStartOptionsMenu(startCampaign, startTycoon);

    this.input.keyboard.once('keydown-ENTER', () => {
      startCampaign();
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
    const fill = this.add.rectangle(-sliderWidth / 2, 0, sliderWidth * initialValue, 8, 0x72c9f1, 1)
      .setOrigin(0, 0.5);
    const knob = this.add.circle(-sliderWidth / 2 + sliderWidth * initialValue, 0, 10, 0xe8f6ff)
      .setStrokeStyle(2, 0x4fa9d7)
      .setInteractive({ useHandCursor: true });

    slider.add([label, track, fill, knob]);

    const updateLabel = (value) => {
      label.setText(`Music volume: ${Math.round(value * 100)}%`);
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

  createStartOptionsMenu(startCampaign, startTycoon) {
    const { width, height } = this.scale;
    this.startOptionsVisible = false;

    const campaignBtn = this.createButton(width / 2, height / 2 + 40, 'START CAMPAIGN', () => {
      this.hideStartOptions(true);
      startCampaign();
    }, 360, 110, 36);
    const tycoonBtn = this.createButton(width / 2, height / 2 + 200, 'START TYCOON', () => {
      this.hideStartOptions(true);
      startTycoon();
    }, 360, 110, 36);
    this.startOptionButtons = [campaignBtn, tycoonBtn];
    this.toggleStartSubmenu(false);
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
  }

  showStartOptions() {
    if (this.startOptionsVisible || this.isSettingsOpen) return;
    this.startOptionsVisible = true;
    this.toggleMainButtons(false);
    this.toggleStartSubmenu(true);
  }

  hideStartOptions(skipMainButtonToggle = false) {
    if (!this.startOptionsVisible) return;
    this.startOptionsVisible = false;
    this.toggleStartSubmenu(false);
    if (!skipMainButtonToggle && !this.isSettingsOpen) this.toggleMainButtons(true);
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
    const panel = this.add.rectangle(0, 0, 520, 420, 0x0a1a32, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(4, 0x5de1ff);
    const title = this.add.text(0, -160, 'Settings', {
      fontFamily: 'Arial',
      fontSize: 42,
      color: '#ffffff'
    }).setOrigin(0.5);

    const musicSlider = this.createVolumeSlider(-80, this.musicVolume, (value) => this.setMusicVolume(value, false));
    const sfxToggle = this.createSettingsButton(20, () => this.toggleSfx(), 'Sound Effect: ');
    const back = this.createSettingsButton(140, () => this.hideSettingsMenu(), 'Back');

    this.settingsContainer.add([overlay, panel, title, musicSlider, sfxToggle.button, sfxToggle.text, back.button, back.text]);
    this.musicVolumeSlider = musicSlider;
    this.sfxToggleText = sfxToggle.text;
    this.updateSfxToggleLabel();
  }

  createSettingsButton(y, callback, customLabel) {
    const label = customLabel || 'Music: ';
    const button = this.add.rectangle(0, y, 320, 72, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, y, label, {
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
    this.sfxToggleText.setText(`Sound Effect: ${this.sfxEnabled ? 'ON' : 'OFF'}`);
  }

  transitionToScene(targetScene, duration = 650) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetScene);
    });
    this.cameras.main.fadeOut(duration, 0, 0, 0);
  }
}


