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
    this.physics.world.on('worldbounds', (body) => this.handleWorldBoundsCollision(body));

    const bgTexture = this.textures.get('gameBg').getSourceImage();
    const bgTextureWidth = bgTexture.width;
    const bgTextureHeight = bgTexture.height;
    this.background = this.add.tileSprite(width / 2, height / 2, bgTextureWidth, bgTextureHeight, 'gameBg')
      .setDepth(-2);
    const bgScale = Math.max(width / bgTextureWidth, height / bgTextureHeight);
    this.background.setScale(bgScale);
    this.backgroundBaseScrollSpeed = 0.5;
    this.backgroundScrollSpeed = this.backgroundBaseScrollSpeed;
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
    this.paddleVerticalOffset = 90;
    this.paddleMaxTilt = Phaser.Math.DegToRad(35);
    this.paddleTiltLerp = 0.12;
    this.paddle.y = height - this.paddleHalfHeight - this.edgePadding - this.paddleVerticalOffset;

    const contactLabel = '!!CONTACT!!';
    this.contactText = this.add.text(width / 2, 0, contactLabel, {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#ff2b2b'
    }).setOrigin(0.5, 0.5).setDepth(5);
    const barWidth = Math.max(12, this.contactText.displayWidth * 3);
    const barHeight = 26;
    const barY = barHeight * 0.5;
    this.contactBar = this.add.rectangle(width / 2, barY, barWidth, barHeight, 0x000000, 0)
      .setOrigin(0.5, 0.5)
      .setDepth(5)
      .setStrokeStyle(2, 0xff0000, 1);
    this.contactText.setY(this.contactBar.y);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.createLaserTexture();
    this.createEnemyLaserTexture();
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: 'laserBeam',
      maxSize: 30
    });
    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: 'enemyLaser',
      maxSize: 30
    });
    this.lastShotTime = 0;
    this.magazineSize = 15;
    this.shotsFired = 0;
    this.isReloading = false;
    this.playerDead = false;
    this.playerDead = false;
    const reloadY = this.contactText.y + this.contactText.displayHeight + 24;
    const reloadX = 20;
    this.reloadBg = this.add.rectangle(reloadX, reloadY, 10, 10, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setDepth(4.5)
      .setStrokeStyle(2, 0xff2b2b)
      .setVisible(true);
    this.reloadText = this.add.text(reloadX, reloadY, '', {
      fontFamily: 'Arial',
      fontSize: 36,
      color: '#ff2b2b'
    }).setOrigin(0, 0).setDepth(5).setVisible(true);
    this.reloadTimer = null;
    this.updateAmmoText();
    this.enemyHitsToDestroy = 5;
    this.totalEnemiesToSpawn = 10;
    this.remainingEnemies = this.totalEnemiesToSpawn;
    const enemyLabelY = reloadY + this.reloadText.displayHeight + 12;
    this.enemyCountBg = this.add.rectangle(reloadX, enemyLabelY, 10, 10, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setDepth(4.5)
      .setStrokeStyle(2, 0xff2b2b)
      .setVisible(true);
    this.enemyCountText = this.add.text(reloadX, enemyLabelY, '', {
      fontFamily: 'Arial',
      fontSize: 36,
      color: '#ff2b2b'
    }).setOrigin(0, 0).setDepth(5).setVisible(true);
    this.updateEnemyCountLabel();
    this.enemyOverlap = null;
    this.enemyFireTimer = null;
    this.victoryShown = false;
    this.victoryContainer = null;
    this.spawnEnemyShip();
    this.aimLine = this.add.graphics({ lineStyle: { width: 0.8 } }).setDepth(2);
    this.aimLineEnabled = true;

    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.createPauseMenu();
    this.physics.add.overlap(this.enemyBullets, this.paddle, this.handlePlayerHit, null, this);

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

  createLaserTexture() {
    if (this.textures.exists('laserBeam')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1c9bff, 1);
    g.fillRect(0, 4, 8, 22);
    g.fillStyle(0x9be8ff, 1);
    g.fillRect(2, 0, 4, 26);
    g.generateTexture('laserBeam', 8, 26);
    g.destroy();
  }

  createEnemyLaserTexture() {
    if (this.textures.exists('enemyLaser')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffe066, 1);
    g.fillRect(0, 4, 8, 22);
    g.fillStyle(0xffc107, 1);
    g.fillRect(2, 0, 4, 26);
    g.generateTexture('enemyLaser', 8, 26);
    g.destroy();
  }

  tryShootLaser() {
    if (this.isReloading) return;
    const now = this.time.now;
    const cooldownMs = 220;
    if (now - this.lastShotTime < cooldownMs) return;
    this.lastShotTime = now;

    const muzzleOffset = new Phaser.Math.Vector2(0, -this.paddleHalfHeight - 10).rotate(this.paddle.rotation);
    const spawnX = this.paddle.x + muzzleOffset.x;
    const spawnY = this.paddle.y + muzzleOffset.y;
    const bullet = this.bullets.get(spawnX, spawnY, 'laserBeam');
    if (!bullet) return;

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.enable = true;
    bullet.body.reset(spawnX, spawnY);
    bullet.body.setAllowGravity(false);
    bullet.body.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.setDepth(1);
    bullet.setRotation(this.paddle.rotation);
    const direction = new Phaser.Math.Vector2(0, -1).rotate(this.paddle.rotation);
    const bulletSpeed = 650;
    bullet.setVelocity(direction.x * bulletSpeed, direction.y * bulletSpeed);

    this.shotsFired += 1;
    if (this.shotsFired >= this.magazineSize) {
      this.startReload();
    } else {
      this.updateAmmoText();
    }
  }

  spawnEnemyShip() {
    if (this.remainingEnemies <= 0) return;
    const { width } = this.scale;
    this.enemyShipHits = 0;
    const desiredWidth = this.paddle.displayWidth;
    const spawnOrReuse = () => {
      if (this.enemyShip) return this.enemyShip;
      const sprite = this.physics.add.image(width / 2, 0, 'enemyShip1');
      sprite.setImmovable(true);
      sprite.body.setAllowGravity(false);
      return sprite;
    };
    this.enemyShip = spawnOrReuse();
    const baseScale = desiredWidth / this.enemyShip.width;
    const savedScaleX = this.lastEnemyState?.scaleX;
    const savedScaleY = this.lastEnemyState?.scaleY;
    const scaleX = savedScaleX ?? baseScale;
    const scaleY = savedScaleY ?? baseScale;
    this.enemyShip.setScale(scaleX, scaleY);
    const bodyWidth = this.enemyShip.displayWidth * 0.65;
    const bodyHeight = this.enemyShip.displayHeight * 0.8;
    this.enemyShip.body.setSize(bodyWidth, bodyHeight, true);
    const startX = this.lastEnemyState?.x ?? width / 2;
    const startY = this.lastEnemyState?.y ?? -this.enemyShip.displayHeight;
    const hpToUse = this.lastEnemyState?.hp ?? this.enemyHitsToDestroy;
    const vx = 0;
    const vy = 80; // lassan lefelé indul
    const rotation = this.lastEnemyState?.rotation ?? 0;
    this.enemyShip.enableBody(true, startX, startY, true, true);
    this.enemyShip.setData('hp', hpToUse);
    this.enemyShip.setVelocity(vx, vy);
    this.enemyShip.setRotation(rotation);
    this.enemyShip.setDepth(0.5);
    this.enemyOverlap?.destroy();
    this.enemyOverlap = this.physics.add.overlap(
      this.bullets,
      this.enemyShip,
      this.handleBulletHitEnemy,
      (bullet, enemy) => this.bulletHitsShipBody(bullet, enemy),
      this
    );
    this.resetEnemyFire();
  }

  snapshotEnemyState(enemy, hpValue) {
    if (!enemy) return;
    const body = enemy.body;
    const safeHp = Math.max(1, hpValue ?? enemy.getData('hp') ?? this.enemyHitsToDestroy);
    this.lastEnemyState = {
      x: enemy.x,
      y: enemy.y,
      rotation: enemy.rotation,
      scaleX: enemy.scaleX,
      scaleY: enemy.scaleY,
      velocityX: body?.velocity.x ?? 0,
      velocityY: body?.velocity.y ?? 0,
      hp: safeHp
    };
  }

  handleBulletHitEnemy(bullet, enemy) {
    bullet.disableBody(true, true);
    if (!enemy.active) return;
    const currentHp = enemy.getData('hp') ?? this.enemyHitsToDestroy;
    const newHp = currentHp - 1;
    enemy.setData('hp', newHp);
    this.enemyShipHits += 1;
    if (newHp <= 0 || this.enemyShipHits >= this.enemyHitsToDestroy) {
      this.destroyEnemyShip(enemy, { snapshot: true, hp: currentHp });
    }
  }

  bulletHitsShipBody(bullet, ship) {
    if (!bullet?.body || !ship?.body) return false;
    const b = bullet.body;
    const s = ship.body;
    return Phaser.Geom.Intersects.RectangleToRectangle(
      new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height),
      new Phaser.Geom.Rectangle(s.x, s.y, s.width, s.height)
    );
  }

  resetEnemyFire() {
    this.enemyFireTimer?.remove(false);
    this.enemyFireTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1200, 2000),
      loop: true,
      callback: () => this.enemyShoot()
    });
  }

  enemyShoot() {
    if (!this.enemyShip || !this.enemyShip.active) return;
    const bullet = this.enemyBullets.get(this.enemyShip.x, this.enemyShip.y + this.enemyShip.displayHeight * 0.35, 'enemyLaser');
    if (!bullet) return;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.enable = true;
    bullet.body.reset(bullet.x, bullet.y);
    bullet.body.setAllowGravity(false);
    bullet.body.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.setDepth(1);
    const target = new Phaser.Math.Vector2(this.paddle.x, this.paddle.y);
    const direction = target.subtract(new Phaser.Math.Vector2(bullet.x, bullet.y)).normalize();
    const speed = 260;
    bullet.setRotation(Phaser.Math.Angle.Between(bullet.x, bullet.y, this.paddle.x, this.paddle.y) + Math.PI / 2);
    bullet.setVelocity(direction.x * speed, direction.y * speed);
  }

  handlePlayerHit(paddle, enemyBullet) {
    if (this.playerDead || !enemyBullet?.active) return;
    enemyBullet.disableBody(true, true);
    this.playerDead = true;
    this.physics.world.pause();
    this.cameras.main.fadeOut(400, 0, 0, 0, (_camera, progress) => {
      if (progress === 1) {
        this.scene.restart();
      }
    });
  }

  destroyEnemyShip(enemy, options = {}) {
    const { snapshot = false, hp } = options;
    if (snapshot) {
      this.snapshotEnemyState(enemy, hp ?? enemy?.getData('hp'));
    }
    enemy.disableBody(true, true);
    this.enemyFireTimer?.remove(false);
    this.remainingEnemies = Math.max(0, this.remainingEnemies - 1);
    this.updateEnemyCountLabel();
    if (this.remainingEnemies > 0) {
      this.spawnEnemyShip();
    } else {
      this.showVictoryBanner();
    }
  }

  handleEnemyOutOfBounds() {
    if (!this.enemyShip || !this.enemyShip.active) return;
    const { width, height } = this.scale;
    const buffer = 40;
    const left = -buffer;
    const right = width + buffer;
    const bottom = height + buffer;
    const halfW = this.enemyShip.displayWidth / 2;
    const halfH = this.enemyShip.displayHeight / 2;
    const outOfHorizontal = this.enemyShip.x + halfW < left || this.enemyShip.x - halfW > right;
    const outBelow = this.enemyShip.y - halfH > bottom;
    if (outOfHorizontal || outBelow) {
      this.destroyEnemyShip(this.enemyShip, { snapshot: false });
    }
  }

  recycleBullets() {
    this.bullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -50) {
        bullet.disableBody(true, true);
      }
    });
  }

  recycleEnemyBullets() {
    this.enemyBullets.children.each((bullet) => {
      if (bullet.active && bullet.y > this.scale.height + 50) {
        bullet.disableBody(true, true);
      }
    });
  }

  handleWorldBoundsCollision(body) {
    const go = body?.gameObject;
    if (!go) return;
    if (this.bullets.contains(go) || this.enemyBullets.contains(go)) {
      go.disableBody(true, true);
    }
  }

  startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.setReloadLabel('Reloading...', true);
    this.reloadTimer?.remove(false);
    this.reloadTimer = this.time.delayedCall(5000, () => {
      this.shotsFired = 0;
      this.isReloading = false;
      this.reloadTimer = null;
      this.updateAmmoText();
    });
  }

  updateAmmoText() {
    if (this.isReloading) return;
    const remaining = Math.max(0, this.magazineSize - this.shotsFired);
    this.setReloadLabel(`Ammo: ${remaining}/${this.magazineSize}`, true);
  }

  setReloadLabel(text, visible) {
    this.reloadText.setText(text);
    this.reloadText.setVisible(visible);
    const hasAmmo = !this.isReloading;
    const textColor = hasAmmo ? '#00ff6a' : '#ff2b2b';
    const strokeColor = hasAmmo ? 0x00ff6a : 0xff2b2b;
    this.reloadText.setColor(textColor);
    const paddingX = 10;
    const paddingY = 6;
    const bgW = this.reloadText.displayWidth + paddingX;
    const bgH = this.reloadText.displayHeight + paddingY;
    const bgX = this.reloadText.x - paddingX * 0.35;
    const bgY = this.reloadText.y - paddingY * 0.35;
    this.reloadBg
      .setPosition(bgX, bgY)
      .setSize(bgW, bgH)
      .setVisible(visible)
      .setStrokeStyle(2, strokeColor);
    this.updateEnemyCountLabel();
  }

  showVictoryBanner() {
    if (this.victoryShown) return;
    this.victoryShown = true;
    // UI elrejtése
    this.contactText.setVisible(false);
    this.contactBar.setVisible(false);
    this.reloadText.setVisible(false);
    this.reloadBg.setVisible(false);
    this.enemyCountText.setVisible(false);
    this.enemyCountBg.setVisible(false);

    const { width, height } = this.scale;
    const barWidth = Math.min(width * 0.9, 820);
    const barHeight = 180;
    const container = this.add.container(width / 2, height / 2).setDepth(10);
    const bar = this.add.rectangle(0, 0, barWidth, barHeight, 0x1d69ff, 0.9)
      .setStrokeStyle(6, 0x79aaff, 0.95)
      .setOrigin(0.5);
    const title = this.add.text(0, -32, 'Your Victory', {
      fontFamily: 'Arial',
      fontSize: 52,
      fontStyle: 'bold',
      color: '#eaf2ff'
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 34, 'the threat eliminated', {
      fontFamily: 'Arial',
      fontSize: 30,
      color: '#d1e4ff'
    }).setOrigin(0.5);
    container.add([bar, title, subtitle]);
    this.victoryContainer = container;
  }

  updateAimLine() {
    if (!this.aimLine) return;
    if (!this.aimLineEnabled) return;
    this.aimLine.clear();
    const origin = new Phaser.Math.Vector2(this.paddle.x, this.paddle.y - this.paddleHalfHeight);
    const dir = new Phaser.Math.Vector2(0, -1).rotate(this.paddle.rotation).normalize();
    if (dir.lengthSq() < 0.0001) return;

    const { width, height } = this.scale;
    const hits = [];
    const screenRect = { left: 0, right: width, top: 0, bottom: height };

    const intersectRect = (rect) => {
      const tx1 = dir.x !== 0 ? (rect.left - origin.x) / dir.x : -Infinity;
      const tx2 = dir.x !== 0 ? (rect.right - origin.x) / dir.x : Infinity;
      const ty1 = dir.y !== 0 ? (rect.top - origin.y) / dir.y : -Infinity;
      const ty2 = dir.y !== 0 ? (rect.bottom - origin.y) / dir.y : Infinity;
      const tmin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
      const tmax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
      if (tmax < 0 || tmin > tmax) return null;
      const tHit = tmin >= 0 ? tmin : tmax;
      return tHit >= 0 ? tHit : null;
    };

    const tScreen = intersectRect(screenRect);
    if (tScreen !== null) hits.push(tScreen);

    if (this.enemyShip && this.enemyShip.active) {
      const halfW = this.enemyShip.displayWidth / 2;
      const halfH = this.enemyShip.displayHeight / 2;
      const rect = {
        left: this.enemyShip.x - halfW,
        right: this.enemyShip.x + halfW,
        top: this.enemyShip.y - halfH,
        bottom: this.enemyShip.y + halfH
      };
      const tEnemy = intersectRect(rect);
      if (tEnemy !== null) hits.push(tEnemy);
    }

    if (!hits.length) return;
    const t = Math.min(...hits);
    const end = origin.clone().add(dir.scale(t));
    const hasAmmo = !this.isReloading;
    const color = hasAmmo ? 0x00ff6a : 0xff2b2b;
    this.aimLine.lineStyle(0.8, color, 1);
    this.aimLine.beginPath();
    this.aimLine.moveTo(origin.x, origin.y);
    this.aimLine.lineTo(end.x, end.y);
    this.aimLine.strokePath();
  }

  updateEnemyCountLabel() {
    if (!this.enemyCountText) return;
    const label = `Enemies: ${Math.max(this.remainingEnemies, 0)}`;
    this.enemyCountText.setText(label);
    this.enemyCountText.setVisible(true);
    const paddingX = 10;
    const paddingY = 6;
    const bgW = this.enemyCountText.displayWidth + paddingX;
    const bgH = this.enemyCountText.displayHeight + paddingY;
    const bgX = this.enemyCountText.x - paddingX * 0.35;
    const bgY = this.enemyCountText.y - paddingY * 0.35;
    if (this.enemyCountBg) {
      this.enemyCountBg
        .setPosition(bgX, bgY)
        .setSize(bgW, bgH)
        .setVisible(true);
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

    const speed = 160;
    const moveLeft = this.cursors.left.isDown || this.keyA.isDown;
    const moveRight = this.cursors.right.isDown || this.keyD.isDown;

    if (moveLeft && !moveRight) this.paddle.setVelocityX(-speed);
    else if (moveRight && !moveLeft) this.paddle.setVelocityX(speed);
    else this.paddle.setVelocityX(0);
    this.paddle.setVelocityY(0);
    const targetTilt = moveLeft === moveRight
      ? 0
      : (moveLeft ? -this.paddleMaxTilt : this.paddleMaxTilt);
    this.paddle.rotation = Phaser.Math.Linear(this.paddle.rotation, targetTilt, this.paddleTiltLerp);

    this.paddle.x = Phaser.Math.Clamp(
      this.paddle.x,
      this.paddleHalfWidth + this.edgePadding,
      this.playAreaWidth - this.paddleHalfWidth - this.edgePadding
    );
    this.paddle.y = this.scale.height - this.paddleHalfHeight - this.edgePadding - this.paddleVerticalOffset;

    if (this.keySpace.isDown) {
      this.tryShootLaser();
    }

    if (this.isReloading && this.reloadTimer) {
      const remaining = Math.max(0, this.reloadTimer.getRemainingSeconds());
      this.setReloadLabel(`Reloading... ${remaining.toFixed(1)}s`, true);
    } else {
      this.updateAmmoText();
    }
    this.recycleBullets();
    this.recycleEnemyBullets();
    this.handleEnemyOutOfBounds();
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.aimLineEnabled = !this.aimLineEnabled;
      if (!this.aimLineEnabled) this.aimLine.clear();
    }
    this.updateAimLine();

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.startReload();
    }

    if (this.background) {
      let scrollSpeed = this.backgroundBaseScrollSpeed;
      const faster = this.keyW.isDown && !this.keyS.isDown;
      const slower = this.keyS.isDown && !this.keyW.isDown;
      if (faster) scrollSpeed *= 1.6;
      else if (slower) scrollSpeed *= 0.45;
      this.background.tilePositionY -= scrollSpeed;
    }
  }
}



