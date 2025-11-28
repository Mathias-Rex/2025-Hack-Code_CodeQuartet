export default class GameScene2 extends Phaser.Scene {
  constructor() {
    super('Tycoon'); // új játékmód a Tycoon helyén
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b1224');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true, musicVolume: 0.6 });
    this.musicVolume = this.gameSettings.musicVolume ?? 0.6;
    this.gameSettings.musicVolume = this.musicVolume;
    if (this.gameSettings.musicEnabled === undefined) this.gameSettings.musicEnabled = this.musicVolume > 0.001;
    if (this.gameSettings.sfxEnabled === undefined) this.gameSettings.sfxEnabled = true;

    this.setupMusic();

    this.wedge = this.add.graphics({ x: 0, y: 0 }).setDepth(2);
    this.walls = this.physics.add.staticGroup();
    this.createRooms();
    this.player = this.createPlayer(width / 2, height / 2);
    this.aimAngle = -Math.PI / 2;
    this.isPaused = false;
    this.physics.world.resume();
    this.pauseContainer = null;

    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.createBulletTexture('tdBullet', 6, 14, 0xff4444);

    this.reloadTime = 5000;
    this.reloading = false;
    this.reloadEndTime = null;
    this.burstCount = 3;
    this.burstInterval = 120;

    const hudX = 18;
    const hudY = 16;
    const hudGap = 36;
    this.ammoText = this.add.text(hudX, hudY, '', {
      fontFamily: 'Arial',
      fontSize: 40,
      fontStyle: 'normal',
      color: '#00ff88',
      stroke: '#00ff88',
      strokeThickness: 2
    }).setDepth(10).setOrigin(0, 0);
    this.ammoBox = this.add.rectangle(0, 0, 10, 10).setOrigin(0, 0).setDepth(9).setStrokeStyle(2, 0x00ff88).setVisible(true);
    this.reloadText = this.add.text(hudX, hudY + 40 + hudGap, '', {
      fontFamily: 'Arial',
      fontSize: 38,
      fontStyle: 'normal',
      color: '#ff4d4d',
      stroke: '#ff4d4d',
      strokeThickness: 2
    }).setDepth(10).setOrigin(0, 0).setVisible(false);
    this.reloadBox = this.add.rectangle(0, 0, 10, 10).setOrigin(0, 0).setDepth(9).setStrokeStyle(2, 0xff4d4d).setVisible(false);
    this.updateAmmoText('ready');

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    this.keyEsc = this.keys.pause;

    this.input.on('pointermove', (pointer) => {
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= 75) {
        this.aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
      }
    });

    this.input.on('pointerdown', () => this.tryShootBurst());

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.bullets, this.walls, (bullet) => {
      bullet.disableBody(true, true);
    });

    this.createPauseMenu();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.gameMusic?.stop());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.gameMusic?.stop());
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.isPaused) this.resumeGame();
      else this.pauseGame();
    }
    if (this.isPaused) return;
    this.handleMovement(delta);
    this.updateWedge();
    this.updateBullets();
    this.updateReloadCountdown(time);
  }

  createPlayer(x, y) {
    const sprite = this.physics.add.sprite(x, y, 'playerman');
    sprite.setCollideWorldBounds(true);
    sprite.setDamping(true).setDrag(0.85).setMaxVelocity(320);
    const targetWidth = Math.min(90, this.scale.width * 0.12);
    const scale = targetWidth / sprite.width;
    sprite.setScale(scale);
    sprite.setDepth(3);
    return sprite;
  }

  handleMovement(delta) {
    const move = (320 * delta) / 1000;
    const forwardInput = (this.keys.up.isDown ? 1 : 0) + (this.keys.down.isDown ? -1 : 0);
    const strafeInput = (this.keys.right.isDown ? 1 : 0) + (this.keys.left.isDown ? -1 : 0);
    const cosA = Math.cos(this.aimAngle);
    const sinA = Math.sin(this.aimAngle);
    const vx = (forwardInput * cosA + strafeInput * -sinA) * move;
    const vy = (forwardInput * sinA + strafeInput * cosA) * move;
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, this.player.displayWidth / 2, this.scale.width - this.player.displayWidth / 2);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy, this.player.displayHeight / 2, this.scale.height - this.player.displayHeight / 2);
    // 180°-os flip a sprite-nek, hogy a textúra fejjel lefelé álljon az irányhoz képest
    this.player.setRotation(this.aimAngle + Math.PI / 2 + Math.PI);
  }

  updateWedge() {
    if (!this.wedge) return;
    this.wedge.clear();
    const radius = 180;
    const halfAngle = Phaser.Math.DegToRad(15);
    const base = this.aimAngle;
    let start = base - halfAngle;
    let end = base + halfAngle;
    if (end < start) end += Math.PI * 2; // biztosan a kisebb ív

    this.wedge.fillStyle(0xff2b2b, 0.25);
    this.wedge.lineStyle(2, 0xff2b2b, 0.6);
    this.wedge.beginPath();
    this.wedge.moveTo(this.player.x, this.player.y);
    this.wedge.arc(this.player.x, this.player.y, radius, start, end, false);
    this.wedge.closePath();
    this.wedge.fillPath();
    this.wedge.strokePath();
  }

  tryShootBurst() {
    if (this.reloading) return;
    const angleDeg = Phaser.Math.RadToDeg(this.aimAngle);
    for (let i = 0; i < this.burstCount; i += 1) {
      const offsetDeg = (i - 1) * 4; // -4,0,4 fok
      this.time.delayedCall(i * this.burstInterval, () => {
        this.fireBullet(Phaser.Math.DegToRad(angleDeg + offsetDeg));
      });
    }
    this.reloading = true;
    this.reloadEndTime = this.time.now + this.reloadTime;
    this.updateAmmoText('reloading');
  }

  fireBullet(angleRad) {
    const bullet = this.bullets.get();
    if (!bullet) return;
    bullet.enableBody(true, this.player.x, this.player.y, true, true);
    bullet.setTexture('tdBullet');
    bullet.setScale(1);
    const speed = 620;
    const vx = Math.cos(angleRad) * speed;
    const vy = Math.sin(angleRad) * speed;
    bullet.setVelocity(vx, vy);
    bullet.setAngle(Phaser.Math.RadToDeg(angleRad) + 90);
    bullet.setDepth(4);
    bullet.body.setSize(bullet.width, bullet.height).setOffset(0, 0);
    this.playShotSound(0.35);
  }

  updateBullets() {
    const { width, height } = this.scale;
    this.bullets.children.each((bullet) => {
      if (!bullet.active) return;
      if (bullet.x < -60 || bullet.x > width + 60 || bullet.y < -60 || bullet.y > height + 60) {
        bullet.disableBody(true, true);
      }
    });
  }

  updateReloadCountdown(time) {
    if (!this.reloadText) return;
    if (!this.reloading || !this.reloadEndTime) {
      this.reloadText.setVisible(false);
      this.reloadBox.setVisible(false);
      return;
    }
    const remaining = Math.max(0, this.reloadEndTime - time);
    const seconds = (remaining / 1000).toFixed(1);
    this.reloadText.setVisible(true);
    this.reloadBox.setVisible(true);
    this.reloadText.setColor('#ff4d4d');
    this.reloadText.setStroke('#ff4d4d', 2);
    this.reloadText.setText(`reloading ${seconds}s`);
    this.updateTextBox(this.reloadText, this.reloadBox, 10, '#ff4d4d');
    if (remaining <= 0) {
      this.reloading = false;
      this.reloadEndTime = null;
      this.updateAmmoText('ready');
      this.playReloadSound(0.65);
    }
  }

  updateAmmoText(label) {
    if (!this.ammoText) return;
    const color = label === 'reloading' ? '#ff4d4d' : '#00ff88';
    this.ammoText.setColor(color);
    this.ammoText.setStroke(color, 2);
    this.ammoText.setText(label === 'reloading' ? 'ammo 0/3' : 'ammo 3/3');
    this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
  }

  updateTextBox(textObj, box, padding, color) {
    if (!textObj || !box) return;
    box.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
    box.setPosition(textObj.x - padding * 0.5, textObj.y - padding * 0.5);
    box.setSize(textObj.displayWidth + padding, textObj.displayHeight + padding);
  }

  createBulletTexture(key, radius, length, color) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(radius - 2, 0, 4, length);
    g.fillStyle(color, 0.8);
    g.fillRect(0, length * 0.2, radius * 2, length * 0.6);
    g.generateTexture(key, radius * 2, length);
    g.destroy();
  }

  setupMusic() {
    if (!this.gameSettings.musicEnabled) {
      this.gameMusic?.stop();
      return;
    }
    if (!this.gameMusic) {
      this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: this.musicVolume });
    }
    this.gameMusic.setVolume(this.musicVolume);
    if (!this.gameMusic.isPlaying) this.gameMusic.play();
  }

  playShotSound(volume = 0.35) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('shot', { volume });
  }

  playReloadSound(volume = 0.7) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('reload', { volume });
  }

  playClickSound() {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('click', { volume: 0.7 });
  }

  pauseGame() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.physics.world.pause();
    this.pauseContainer?.setVisible(true);
  }

  resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.physics.world.resume();
    this.pauseContainer?.setVisible(false);
  }

  quitToMenu() {
    this.isPaused = false;
    this.physics.world.resume();
    this.pauseContainer?.setVisible(false);
    this.gameMusic?.stop();
    this.scene.start('Menu');
  }

  createMenuButton(x, y, label, callback) {
    const button = this.add.rectangle(x, y, 280, 68, 0x00c2ff, 0.9)
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
      callback?.();
    });

    return { button, text };
  }

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseContainer = this.add.container(width / 2, height / 2)
      .setDepth(20)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 480, 360, 0x0f1e3d, 0.95)
      .setStrokeStyle(4, 0x61dafb);
    const title = this.add.text(0, -130, 'Pause', {
      fontFamily: 'Arial',
      fontSize: 40,
      color: '#ffffff'
    }).setOrigin(0.5);

    const resume = this.createMenuButton(0, -40, 'Continue', () => this.resumeGame());
    const quit = this.createMenuButton(0, 60, 'Back to mainmenu', () => this.quitToMenu());

    this.pauseContainer.add([overlay, panel, title, resume.button, resume.text, quit.button, quit.text]);
  }

  createRooms() {
    const { width, height } = this.scale;
    const wallColor = 0x32405a;
    const doorColor = 0x657999;
    const makeWall = (x, y, w, h) => {
      const rect = this.add.rectangle(x, y, w, h, wallColor, 0.92).setDepth(1);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
      return rect;
    };
    const drawDoor = (x, y, w, h) => {
      // vizuális ajtókeret, ütközés nélkül
      this.add.rectangle(x, y, w, h, doorColor, 0.65).setDepth(0.8);
    };

    // Külső keretek (falak)
    const thickness = 26;
    makeWall(width / 2, thickness / 2, width, thickness);
    makeWall(width / 2, height - thickness / 2, width, thickness);
    makeWall(thickness / 2, height / 2, thickness, height);
    makeWall(width - thickness / 2, height / 2, thickness, height);

    // Lakás alaprajz: folyosó + 3 szoba + konyha/nappali
    const hallW = 200;
    const hallX = width * 0.32;
    const hallTop = thickness;
    const hallBottom = height - thickness;

    // Folyosó két hosszanti fala, ajtókkal
    makeWall(hallX - hallW / 2, height / 2, 12, hallBottom - hallTop);
    makeWall(hallX + hallW / 2, height / 2, 12, hallBottom - hallTop);

    // Szobafalak (bal felső háló)
    const room1Top = hallTop + 70;
    const room1Bottom = height * 0.46;
    makeWall((hallX - hallW / 2) / 2, room1Top, hallX - hallW / 2, 12); // felső fal
    makeWall((hallX - hallW / 2) / 2, room1Bottom, hallX - hallW / 2, 12); // alsó fal
    makeWall(12 + (hallX - hallW / 2) / 2, (room1Top + room1Bottom) / 2, 12, room1Bottom - room1Top); // bal fal
    // ajtó a folyosóra
    drawDoor(hallX - hallW / 2, (room1Top + room1Bottom) / 2, 16, 38);

    // Szobafalak (bal alsó dolgozó)
    const room2Top = height * 0.52;
    const room2Bottom = hallBottom - 70;
    makeWall((hallX - hallW / 2) / 2, room2Top, hallX - hallW / 2, 12);
    makeWall((hallX - hallW / 2) / 2, room2Bottom, hallX - hallW / 2, 12);
    makeWall(12 + (hallX - hallW / 2) / 2, (room2Top + room2Bottom) / 2, 12, room2Bottom - room2Top);
    drawDoor(hallX - hallW / 2, (room2Top + room2Bottom) / 2, 16, 38);

    // Nappali/konyha (jobb oldal nagy tér)
    const livingLeft = hallX + hallW / 2 + 60;
    const livingTop = thickness + 40;
    const livingBottom = height - thickness - 40;
    makeWall((livingLeft + width - thickness) / 2, livingTop, width - livingLeft - thickness, 12);
    makeWall((livingLeft + width - thickness) / 2, livingBottom, width - livingLeft - thickness, 12);
    makeWall(livingLeft, (livingTop + livingBottom) / 2, 12, livingBottom - livingTop - 120);
    // Két ajtó a folyosó felől (konyha + nappali)
    drawDoor(hallX + hallW / 2, livingTop + 120, 16, 42);
    drawDoor(hallX + hallW / 2, livingBottom - 120, 16, 42);

    // Fürdő (jobb felső sarok)
    const bathTop = livingTop + 30;
    const bathBottom = livingTop + 190;
    makeWall(width - (width - livingLeft) / 2, bathTop, width - livingLeft - thickness, 12);
    makeWall(width - (width - livingLeft) / 2, bathBottom, width - livingLeft - thickness, 12);
    makeWall(width - thickness - 6, (bathTop + bathBottom) / 2, 12, bathBottom - bathTop);
    drawDoor(livingLeft + 32, (bathTop + bathBottom) / 2, 16, 38);

    // Kis előszoba leválasztás
    const entryY = height * 0.2;
    makeWall(hallX, entryY, hallW, 12);
    drawDoor(hallX, entryY, 32, 20);

    // Látványelemek: egyszerű padló árnyék a szobákba
    const floorColor = 0x0f172a;
    this.add.rectangle((hallX - hallW / 2) / 2, (room1Top + room1Bottom) / 2, hallX - hallW / 2 - 20, room1Bottom - room1Top - 20, floorColor, 0.25).setDepth(-0.5);
    this.add.rectangle((hallX - hallW / 2) / 2, (room2Top + room2Bottom) / 2, hallX - hallW / 2 - 20, room2Bottom - room2Top - 20, floorColor, 0.25).setDepth(-0.5);
    this.add.rectangle((livingLeft + width - thickness) / 2, (livingTop + livingBottom) / 2, width - livingLeft - thickness - 20, livingBottom - livingTop - 20, floorColor, 0.18).setDepth(-0.5);
  }
}
