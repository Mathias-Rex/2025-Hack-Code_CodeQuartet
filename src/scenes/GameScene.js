class Shield {
  constructor(scene, enemy, options = {}) {
    this.scene = scene;
    this.enemy = enemy;
    this.hp = options.hp ?? 3;
    this.radius = options.radius ?? 80;
    this.thickness = options.thickness ?? 10;
    this.arcDeg = options.arcDeg ?? 90;
    this.color = options.color ?? 0x4cc3ff;
    this.baseAngle = options.baseAngle ?? 0;
    this.lastAngle = this.baseAngle;
    this.graphics = scene.add.graphics({ x: 0, y: 0 }).setDepth(6);
    this.graphics.setAlpha(0.55);
  }

  takeDamage(amount = 1) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.destroy();
  }

  destroy() {
    if (this.enemy?.setData) this.enemy.setData('shield', null);
    this.graphics?.destroy();
    this.graphics = null;
    this.enemy = null;
  }

  update(player) {
    if (!this.graphics || !this.enemy?.active) {
      this.destroy();
      return;
    }
    const targetX = player?.x ?? this.enemy.x;
    const targetY = player?.y ?? this.enemy.y;
    const angle = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, targetX, targetY) + this.baseAngle;
    this.lastAngle = angle;
    this.drawArc(angle);
  }

  drawArc(angle) {
    this.graphics.clear();
    const half = Phaser.Math.DegToRad((this.arcDeg ?? 90) / 2);
    const start = angle - half;
    const end = angle + half;
    // halvány "blur" halo
    this.graphics.lineStyle(this.thickness * 1.8, this.color, 0.22);
    this.graphics.beginPath();
    this.graphics.arc(this.enemy.x, this.enemy.y, this.radius, start, end);
    this.graphics.strokePath();
    // élesebb ív
    this.graphics.lineStyle(this.thickness, this.color, 0.9);
    this.graphics.beginPath();
    this.graphics.arc(this.enemy.x, this.enemy.y, this.radius, start, end);
    this.graphics.strokePath();
  }

  block(bullet) {
    if (this.hp <= 0 || !bullet?.active || !this.enemy?.active) return false;
    const dx = bullet.x - this.enemy.x;
    const dy = bullet.y - this.enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius + this.thickness * 1.5) return false;
    const angToBullet = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(angToBullet - this.lastAngle);
    const half = Phaser.Math.DegToRad((this.arcDeg ?? 90) / 2);
    if (Math.abs(diff) <= half) {
      this.takeDamage(1);
      this.scene?.addExplosion(bullet.x, bullet.y, 10, 0x4cc3ff);
      return true;
    }
    return false;
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.stars = [];
    this.scrollSpeed = 140; // px per second (used by starfield)
    this.starLayers = [
      { countFactor: 1.8, speed: 40, sizeRange: [1, 1.5], alpha: 0.35 },
      { countFactor: 1, speed: 70, sizeRange: [1, 2], alpha: 0.45 },
      { countFactor: 0.5, speed: 110, sizeRange: [1.5, 2.5], alpha: 0.6 },
      { countFactor: 0.1, speed: 160, sizeRange: [2, 3], alpha: 0.8 },
      { countFactor: 0.015, speed: 18, sizeRange: [100, 200], alpha: 0.01, kind: 'blob', color: 0xfff3c4, blurScale: 45 } // nagy, halvány foltok
    ];
    this.playerSpeed = 320;
    this.tiltLerp = 0.18;
    this.fireDelay = 150; // ms between player shots
    this.nextShotAt = 0;
    this.maxActiveEnemies = 2;
    this.enemyShip2Count = 0;
    this.lastShip3SpawnAt = 0;
    this.lastShip3SpawnAt = 0;
    this.enemySpawnDelay = 900;
    this.enemyMaxHp = 4;
    this.enemyTypes = [
      { key: 'enemyShip', speed: { min: 90, max: 160 }, hp: 4, scaleMul: 1, weight: 6, hitboxFactor: 5 },    // leggyakoribb
      { key: 'enemyShip2', speed: { min: 220, max: 320 }, hp: 2, scaleMul: 1, weight: 4, hitboxFactor: 5, waveAmp: 120, waveFreq: 0.0025 },  // gyakoribb spawn, gyorsabb, kanyargó
      { key: 'enemyShip3', speed: { min: 55, max: 95 }, hp: 7, scaleMul: 2, weight: 1, hitboxFactor: 2.5 }   // legritkább, kisebb hitbox
    ];
    this.maxAmmoBlue = 15;
    this.maxAmmoRed = 1; // lézer időalapú
    this.maxAmmo = this.maxAmmoBlue;
    this.ammoBlue = this.maxAmmoBlue;
    this.ammoRed = this.maxAmmoRed;
    this.ammo = this.ammoBlue;
    this.reloadTime = 3000;
    this.reloadTimeAlt = 3000;
    this.redFireDuration = 3000;
    this.redReloadDuration = 3000;
    this.redFiringUntil = 0;
    this.redBeamLength = 500;
    this.reloading = false;
    this.reloadingBlue = false;
    this.reloadingRed = false;
    this.reloadEndTime = null;
    this.reloadEndTimeBlue = null;
    this.reloadEndTimeRed = null;
    this.redNextReloadDue = 0;
    this.playerMaxHp = 5;
    this.playerHp = this.playerMaxHp;
    this.gameSettings = window.__GAME_SETTINGS__ || (window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true, musicVolume: 0.6 });
    this.musicVolume = this.gameSettings.musicVolume ?? 0.6;
    this.gameSettings.musicVolume = this.musicVolume;
    if (this.gameSettings.musicEnabled === undefined) this.gameSettings.musicEnabled = this.musicVolume > 0.001;
    if (this.gameSettings.sfxEnabled === undefined) this.gameSettings.sfxEnabled = true;
    if (!this.gameSettings.musicTrack) this.gameSettings.musicTrack = 'cosmic';
    this.gameMusicKey = null;
    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.pauseContainer = null;
    this.pauseSettingsContainer = null;
    this.pauseButtons = [];
    this.pauseMusicSlider = null;
    this.pauseSfxLabel = null;
    this.keyEsc = null;
    this.enemyKillCount = 0;
    this.survivalStartTime = 0;
    this.gameOver = false;
    this.gameOverTransitioning = false;
    this.gameOverOverlay = null;
    this.hitboxes = {
      playerRadiusFactor: 4,
      enemyRadiusFactor: 5,
      bulletWidthFactor: 1,
      bulletHeightFactor: 1
    };
    this.shields = [];
    this.gearPickups = null;
    this.shieldPickups = null;
    this.weaponIconBlue = null;
    this.weaponIconRed = null;
    this.beamSprite = null;
    this.pickupFallSpeedGear = 70;
    this.pickupFallSpeedShield = 60;
    this.playerShield = null;
    this.starSpeedMultiplier = 1;
    this.starSpeedLerp = 0.08;
    this.debug = !!window.__DEBUG__;
    this.currentWeapon = 'blue';
  }

  preload() {
    this.load.image('gameBg', 'assets/images/background.png');
    this.load.image('playerShip', 'assets/sprites/playership1.png');
    this.load.image('enemyShip', 'assets/sprites/enemyship1.png');
    this.load.image('enemyShip2', 'assets/sprites/enemyship2.png');
    this.load.image('enemyShip3', 'assets/sprites/enemyship3.png');
    this.load.image('gearPickup', 'assets/sprites/fogaskerék.png');
  }

  create() {
    // no initial flash; menu already faded to black before switching scenes
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.sound.stopByKey('gameMusic');
    this.sound.stopByKey('gameMusicAlt');
    this.setupMusic();

    // reset per-run state
    this.reloading = false;
    this.reloadingBlue = false;
    this.reloadingRed = false;
    this.reloadEndTime = null;
    this.reloadEndTimeBlue = null;
    this.reloadEndTimeRed = null;
    this.maxAmmo = this.currentWeapon === 'red' ? this.maxAmmoRed : this.maxAmmoBlue;
    this.ammoBlue = this.maxAmmoBlue;
    this.ammoRed = this.maxAmmoRed;
    this.ammo = this.currentWeapon === 'red' ? this.ammoRed : this.ammoBlue;
    this.reloadEndTime = this.currentWeapon === 'red' ? this.reloadEndTimeRed : this.reloadEndTimeBlue;
    this.playerHp = this.playerMaxHp;
    this.starSpeedMultiplier = 1;
    this.playerCollisionPauseUntil = 0;
    this.enemyKillCount = 0;
    this.survivalStartTime = this.time.now;
    this.gameOver = false;
    this.gameOverOverlay = null;
    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.shields = [];
    this.enemyShip2Count = 0;

    this.createStarfield();
    this.createBulletTexture('playerBullet', 4, 18, 0x7cf4ff);
    this.createBulletTexture('enemyBullet', 5, 12, 0xff8a7a);
    this.createBulletTexture('playerBeam', 4, 18, 0xff4d4d);
    this.createGearTexture('gearPickup');
    this.createShieldTexture('shieldPickup');

    this.player = this.createPlayer();
    this.playerBaseY = this.player.y;
    this.playerBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 30 });
    this.gearPickups = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, allowGravity: false });
    this.shieldPickups = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, allowGravity: false });

    this.physics.add.overlap(this.playerBullets, this.enemies, this.handleEnemyHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.handlePlayerHitByBullet, null, this);
    this.physics.add.overlap(this.enemies, this.enemies, this.resolveEnemyOverlap, null, this);
    this.physics.add.overlap(this.player, this.gearPickups, this.handleGearPickup, null, this);
    this.physics.add.overlap(this.player, this.shieldPickups, this.handleShieldPickup, null, this);
    this.spawnWave(Phaser.Math.Between(1, this.maxActiveEnemies));

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
      reload: Phaser.Input.Keyboard.KeyCodes.R,
      weapon1: Phaser.Input.Keyboard.KeyCodes.Q,
      weapon2: Phaser.Input.Keyboard.KeyCodes.E,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    this.keyEsc = this.keys.pause;

    const hudX = 18;
    const hudY = 16;
    const hudGap = 36;
    this.ammoText = this.add.text(hudX, hudY, '', {
      fontFamily: 'Arial',
      fontSize: 44,
      fontStyle: 'normal',
      color: '#00ff88',
      stroke: '#00ff88',
      strokeThickness: 2
    }).setDepth(10).setOrigin(0, 0);
    this.ammoBox = this.add.rectangle(0, 0, 10, 10).setOrigin(0, 0).setDepth(9).setStrokeStyle(2, 0x00ff88).setVisible(true);
    this.updateAmmoText();
    this.reloadText = this.add.text(hudX, hudY + 44 + hudGap, '', {
      fontFamily: 'Arial',
      fontSize: 44,
      fontStyle: 'normal',
      color: '#ff4d4d',
      stroke: '#ff4d4d',
      strokeThickness: 2
    }).setDepth(10).setOrigin(0, 0).setVisible(false);
    this.reloadBox = this.add.rectangle(0, 0, 10, 10).setOrigin(0, 0).setDepth(9).setStrokeStyle(2, 0xff4d4d).setVisible(false);
    this.loadedText = this.add.text(hudX, hudY + 44 + hudGap, '', {
      fontFamily: 'Arial',
      fontSize: 44,
      fontStyle: 'normal',
      color: '#ffd84d',
      stroke: '#ffd84d',
      strokeThickness: 2
    }).setDepth(10).setOrigin(0, 0).setVisible(false);
    this.loadedBox = this.add.rectangle(0, 0, 10, 10).setOrigin(0, 0).setDepth(9).setStrokeStyle(2, 0xffd84d).setVisible(false);
    this.reloadEndTime = this.currentWeapon === 'red' ? this.reloadEndTimeRed : this.reloadEndTimeBlue;

    this.createHealthBar();
    this.createWeaponIcons();

    this.scale.on('resize', this.handleResize, this);
    this.debug = !!window.__DEBUG__;
    if (this.debug && !this.debugGfx) {
      this.debugGfx = this.add.graphics({ x: 0, y: 0 }).setDepth(50);
    }

    this.spawnTimer = this.time.addEvent({
      delay: this.enemySpawnDelay,
      callback: () => this.spawnWave(1),
      loop: true
    });

    this.createPauseMenu();

    this.events.once('shutdown', () => this.gameMusic?.stop());
    this.events.once('destroy', () => this.gameMusic?.stop());
  }

  updateEnemyWave(time) {
    const { width } = this.scale;
    this.enemies.children.each((enemy) => {
      if (!enemy.active) return;
      const typeKey = enemy.getData('typeKey');
      if (typeKey === 'enemyShip') {
        enemy.rotation = 0; // ne forogjon az enemyShip1
        return;
      }
      if (enemy.getData('typeKey') !== 'enemyShip2') return;
      const baseX = enemy.getData('waveBaseX') ?? enemy.x;
      const amp = enemy.getData('waveAmp') ?? 60;
      const freq = enemy.getData('waveFreq') ?? 0.003;
      const offset = enemy.getData('waveOffset') ?? 0;
      const newX = baseX + Math.sin(time * freq + offset) * amp;
      const halfW = enemy.displayWidth / 2;
      const clamped = Phaser.Math.Clamp(newX, halfW + 10, width - halfW - 10);
      enemy.setX(clamped);
      const vx = amp * freq * Math.cos(time * freq + offset);
      const vy = enemy.body?.velocity?.y ?? 0;
      const speed = Math.hypot(vx, vy);
      if (speed > 0.5) {
        const targetAngle = Math.atan2(vy, vx) + Math.PI / 2 + Math.PI; // 180° flip, hogy a sprite alja előre nézzen
        enemy.rotation = Phaser.Math.Angle.RotateTo(enemy.rotation, targetAngle, 0.04);
      }
    });
  }

  countActiveType(key) {
    let count = 0;
    this.enemies.children.each((enemy) => {
      if (enemy.active && enemy.getData('typeKey') === key) count += 1;
    });
    return count;
  }

  clampEnemiesToBounds() {
    const { width } = this.scale;
    this.enemies.children.each((enemy) => {
      if (!enemy.active) return;
      const halfW = enemy.displayWidth / 2;
      const clampedX = Phaser.Math.Clamp(enemy.x, halfW + 2, width - halfW - 2);
      enemy.x = clampedX;
      if (enemy.body) enemy.body.x = clampedX - halfW;
    });
  }

  update(time, delta) {
    // keep debug flag in sync with global toggle
    const dbg = !!window.__DEBUG__;
    if (dbg !== this.debug) this.debug = dbg;
    if (this.debug && !this.debugGfx) {
      this.debugGfx = this.add.graphics({ x: 0, y: 0 }).setDepth(50);
    }
    if (this.debug) this.drawDebugHitboxes(); // debug overlay maradjon game over alatt is
    if (this.gameOver) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.weapon1)) {
      this.switchWeapon('blue');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.weapon2)) {
      this.switchWeapon('red');
    }
    if (this.currentWeapon === 'red') {
      if (!this.reloading && this.redFiringUntil > 0 && time > this.redFiringUntil) {
        this.beginReload();
      }
      if (this.keys.shoot.isDown && !this.reloading && this.ammo > 0) {
        this.updateRedBeam();
      } else if (this.beamSprite) {
        this.beamSprite.destroy();
        this.beamSprite = null;
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.isPaused && this.pauseSettingsVisible) {
        this.hidePauseSettings();
        return;
      }
      if (this.isPaused) this.resumeGame();
      else this.pauseGame();
    }
    if (this.isPaused) return;
    this.updateStarfield(time, delta);
    if (this.player?.active) {
      this.handlePlayerMovement(delta);
      this.handleShooting(time);
    }
    this.updateEnemyWave(time);
    this.updateShields();
    this.updateEnemyShooting(time);
    this.cleanupEntities();
    this.checkGearTouch();
    this.syncPickupHitboxes();
    this.updateReloadCountdown(time);
    if (this.debug) this.drawDebugHitboxes();
    this.checkVictoryConditions(time);
  }

  createStarfield() {
    const { width, height } = this.scale;
    this.starGraphics = this.add.graphics().setDepth(-5);
    this.stars = [];
    const area = width * height / 10000;
    this.starLayers.forEach((layer, idx) => {
      const count = Math.max(8, Math.floor(area * layer.countFactor));
      for (let i = 0; i < count; i += 1) {
        const size = Phaser.Math.FloatBetween(...layer.sizeRange);
        const kind = layer.kind || 'star';
        this.stars.push({
          x: Phaser.Math.FloatBetween(0, width),
          y: Phaser.Math.FloatBetween(0, height),
          size,
          speed: layer.speed,
          alphaBase: layer.alpha,
          phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
          layer: idx,
          kind,
          blurScale: layer.blurScale ?? 1.4,
          color: layer.color ?? 0xffffff,
          points: kind === 'blob' ? this.createBlobPoints(size) : null
        });
      }
    });
  }

  updateStarfield(time, delta) {
    if (!this.starGraphics) return;
    const { width, height } = this.scale;
    const t = time / 1000;
    const flickerFreq = 0.9;
    this.starGraphics.clear();
    this.stars.forEach((star) => {
      star.y += (star.speed * delta) / 1000;
      star.y += ((star.speed * (this.starSpeedMultiplier - 1)) * delta) / 1000;
      if (star.y > height) {
        star.y -= height;
        star.x = Phaser.Math.FloatBetween(0, width);
      }
      const flicker = 0.8 + 0.2 * Math.sin(t * flickerFreq + star.phase);
      const alpha = Phaser.Math.Clamp(star.alphaBase * flicker, 0, 1);
      const color = star.color ?? 0xffffff;
      if (star.kind === 'blob' && star.points) {
        const pts = star.points;
        const drawScaledBlob = (scale, a) => {
          this.starGraphics.fillStyle(color, a);
          this.starGraphics.beginPath();
          this.starGraphics.moveTo(star.x + pts[0].x * scale, star.y + pts[0].y * scale);
          for (let i = 1; i < pts.length; i += 1) {
            this.starGraphics.lineTo(star.x + pts[i].x * scale, star.y + pts[i].y * scale);
          }
          this.starGraphics.closePath();
          this.starGraphics.fillPath();
        };
        // soft blur-like halo, then core
        drawScaledBlob(star.blurScale, alpha * 0.35);
        drawScaledBlob(1, alpha);
      } else {
        this.starGraphics.fillStyle(color, alpha);
        this.starGraphics.fillCircle(star.x, star.y, star.size);
      }
    });
  }

  createPlayer() {
    const { width, height } = this.scale;
    const sprite = this.physics.add.sprite(width / 2, height * 0.82, 'playerShip');
    const targetWidth = Math.min(120, width * 0.18);
    const scale = targetWidth / sprite.width;
    sprite.setScale(scale);
    sprite.setDepth(6);
    sprite.setCollideWorldBounds(true);
    sprite.setDamping(true).setDrag(0.85).setMaxVelocity(this.playerSpeed);
    const hitboxRadius = (sprite.displayWidth * this.hitboxes.playerRadiusFactor) / 2;
    sprite.body.setCircle(hitboxRadius);
    sprite.body.setOffset(
      sprite.displayOriginX - hitboxRadius,
      sprite.displayOriginY - hitboxRadius
    );
    return sprite;
  }

  createBulletTexture(key, radius, length, color) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.clear();
    g.fillStyle(color, 1);
    const w = radius * 2;
    const h = length;
    const tip = { x: w / 2, y: 0 };
    const left = { x: 0, y: h * 0.35 };
    const right = { x: w, y: h * 0.35 };
    const bottomLeft = { x: w * 0.2, y: h };
    const bottomRight = { x: w * 0.8, y: h };
    g.beginPath();
    g.moveTo(tip.x, tip.y);
    g.lineTo(right.x, right.y);
    g.lineTo(bottomRight.x, bottomRight.y);
    g.lineTo(bottomLeft.x, bottomLeft.y);
    g.lineTo(left.x, left.y);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, w, h);
    g.destroy();
  }

  createGearTexture(key) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 48;
    g.clear();
    g.fillStyle(0x9aa0ab, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(0xc4c8d0, 1);
    const drawCog = (cx, cy, rOuter, teeth) => {
      for (let i = 0; i < teeth; i += 1) {
        const ang = (Math.PI * 2 * i) / teeth;
        const x1 = cx + Math.cos(ang) * rOuter * 0.55;
        const y1 = cy + Math.sin(ang) * rOuter * 0.55;
        const x2 = cx + Math.cos(ang) * rOuter;
        const y2 = cy + Math.sin(ang) * rOuter;
        g.lineStyle(4, 0xc4c8d0, 1);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
      }
    };
    drawCog(size / 2 - 10, size / 2, size / 3, 6);
    drawCog(size / 2 + 12, size / 2 - 6, size / 4, 7);
    drawCog(size / 2 + 6, size / 2 + 12, size / 5, 5);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  createShieldTexture(key) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 48;
    const h = 60;
    g.clear();
    g.fillStyle(0x9aa0ab, 0.9);
    g.lineStyle(3, 0xcfd4de, 1);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w, h * 0.3);
    g.lineTo(w * 0.75, h);
    g.lineTo(w * 0.25, h);
    g.lineTo(0, h * 0.3);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture(key, w, h);
    g.destroy();
  }

  handlePlayerMovement(delta) {
    const move = (this.playerSpeed * delta) / 1000;
    let vx = 0;
    let vy = 0;
    const leftDown = this.keys.left.isDown || this.keys.left2.isDown;
    const rightDown = this.keys.right.isDown || this.keys.right2.isDown;
    const upDown = this.keys.up.isDown || this.keys.up2.isDown;
    const downDown = this.keys.down.isDown || this.keys.down2.isDown;
    if (leftDown) vx -= move;
    if (rightDown) vx += move;
    if (upDown) vy -= move;
    if (downDown) vy += move;
    if (Phaser.Input.Keyboard.JustDown(this.keys.reload)) {
      this.beginReload();
    }
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, this.player.displayWidth / 2, this.scale.width - this.player.displayWidth / 2);
    const minY = (this.playerBaseY ?? this.player.y) - 200;
    const maxY = (this.playerBaseY ?? this.player.y) + 200;
    const clampedY = Phaser.Math.Clamp(this.player.y + vy, minY, maxY);
    this.player.y = clampedY;

    // Tilt ship based on horizontal input
    let targetAngle = 0;
    if (leftDown && !rightDown) targetAngle = -45;
    if (rightDown && !leftDown) targetAngle = 45;
    this.player.setAngle(Phaser.Math.Linear(this.player.angle, targetAngle, this.tiltLerp));

    // Adjust starfield speed with W/S
    let targetSpeedMul = 1;
    if (upDown && !downDown) targetSpeedMul = 1.8;
    if (downDown && !upDown) targetSpeedMul = 0.5;

    // ha eléri a mozgástartomány tetejét/alját, gyorsítson vagy lassítson a starfield a régi terv szerint
    const hitTop = clampedY <= minY + 0.01;
    const hitBottom = clampedY >= maxY - 0.01;
    if (hitTop) targetSpeedMul = 1.8;
    if (hitBottom) targetSpeedMul = 0.5;

    this.starSpeedMultiplier = Phaser.Math.Linear(this.starSpeedMultiplier, targetSpeedMul, this.starSpeedLerp);
  }

  handleShooting(time) {
    if (!this.keys.shoot.isDown) return;
    if (time < this.nextShotAt) return;
    if (this.reloading) return;
    if (this.ammo <= 0) {
      this.beginReload();
      return;
    }
    this.nextShotAt = time + this.fireDelay;

    const offsetY = this.player.displayHeight * 0.55;
    const isRed = this.currentWeapon === 'red';
    if (isRed) {
      if (this.redFiringUntil <= 0) this.redFiringUntil = time + this.redFireDuration;
      if (time > this.redFiringUntil) {
        this.beginReload();
        return;
      }
      this.fireRedBeam(time);
    } else {
      const bullet = this.playerBullets.get();
      if (!bullet) return;
      bullet.enableBody(true, this.player.x, this.player.y - offsetY, true, true);
      bullet.setTexture('playerBullet');
      bullet.setScale(1);
      const speed = 620;
      const angleDeg = this.player.angle;
      const angleRad = Phaser.Math.DegToRad(angleDeg);
      const vx = speed * Math.sin(angleRad);
      const vy = -speed * Math.cos(angleRad);
      bullet.setVelocity(vx, vy);
      bullet.setAngle(angleDeg);
      bullet.setDepth(5);
      bullet.body.setSize(bullet.width * this.hitboxes.bulletWidthFactor, bullet.height * this.hitboxes.bulletHeightFactor).setOffset(0, 0);
      bullet.setData('weapon', this.currentWeapon);
      this.attachBulletTrail(bullet);
      this.playShotSound(0.45);
      this.ammo -= 1;
      this.ammoBlue = this.ammo;
      this.updateAmmoText();
      if (this.ammo <= 0) {
        this.beginReload();
      }
    }
  }

  updateEnemyShooting(time) {
    if (!this.player?.active) return;
    this.enemies.children.each((enemy) => {
      if (!enemy.active) return;
      if (enemy.getData('typeKey') !== 'enemyShip') return; // csak enemyship1 lő
      const next = enemy.getData('nextShotAt') ?? 0;
      if (time < next) return;
      enemy.setData('nextShotAt', time + Phaser.Math.Between(900, 1400));

      const bullet = this.enemyBullets.get();
      if (!bullet) return;
      bullet.enableBody(true, enemy.x, enemy.y + enemy.displayHeight * 0.35, true, true);
      bullet.setTexture('enemyBullet');
      bullet.setScale(0.9);
      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const speed = 280;
      const vx = Math.cos(angleToPlayer) * speed;
      const vy = Math.sin(angleToPlayer) * speed;
      bullet.setVelocity(vx, vy);
      bullet.setAngle(Phaser.Math.RadToDeg(angleToPlayer) + 90);
      bullet.setDepth(4);
      bullet.body.setSize(bullet.width * this.hitboxes.bulletWidthFactor, bullet.height * this.hitboxes.bulletHeightFactor).setOffset(0, 0);
      this.playShotSound(0.35);
    });
  }

  spawnEnemy() {
    if (this.enemies.countActive(true) >= this.maxActiveEnemies) return;
    const enemy = this.enemies.get();
    if (!enemy) return;

    const now = this.time.now;
    let type = this.pickEnemyType();
    if ((now - this.lastShip3SpawnAt) > 15000 && this.countActiveType('enemyShip3') < 1) {
      const forced = this.enemyTypes.find((t) => t.key === 'enemyShip3');
      if (forced) type = forced;
    }
    if (type.key === 'enemyShip2' && this.enemyShip2Count >= 1) return; // egyszerre csak egy enemyShip2
    const { width } = this.scale;
    const spawnPadding = 40;
    const x = Phaser.Math.Between(spawnPadding, width - spawnPadding);
    const y = -80;
    const texture = this.textures.get(type.key).getSourceImage();
    const targetWidth = Math.min(110, width * 0.16) * type.scaleMul;
    const scale = targetWidth / texture.width;

    enemy.enableBody(true, x, y, true, true);
    enemy.setTexture(type.key);
    enemy.setScale(scale);
    enemy.setDepth(4);
    enemy.setVelocity(0, Phaser.Math.Between(type.speed.min, type.speed.max));
    const hitboxFactor = type.hitboxFactor ?? this.hitboxes.enemyRadiusFactor;
    const enemyRadius = (enemy.displayWidth * hitboxFactor) / 2;
    enemy.body.setCircle(enemyRadius);
    enemy.body.setOffset(
      enemy.displayOriginX - enemyRadius,
      enemy.displayOriginY - enemyRadius
    );
    enemy.hp = type.hp ?? this.enemyMaxHp;
    enemy.setData('typeKey', type.key);
    enemy.setData('hitboxFactor', hitboxFactor);
    enemy.setData('nextShotAt', this.time.now + Phaser.Math.Between(800, 1400));
    if (type.key === 'enemyShip3') {
      this.lastShip3SpawnAt = now ?? this.time.now;
    }
    if (type.key === 'enemyShip2') {
      this.enemyShip2Count += 1;
      enemy.setData('waveBaseX', x);
      enemy.setData('waveAmp', type.waveAmp ?? 60);
      enemy.setData('waveFreq', type.waveFreq ?? 0.003);
      enemy.setData('waveOffset', Math.random() * Math.PI * 2);
    }
    this.attachShield(enemy);
  }

  pickEnemyType() {
    const total = this.enemyTypes.reduce((sum, t) => sum + (t.weight ?? 1), 0);
    let r = Math.random() * total;
    for (const t of this.enemyTypes) {
      r -= (t.weight ?? 1);
      if (r <= 0) return t;
    }
    return this.enemyTypes[0];
  }

  spawnWave(count) {
    for (let i = 0; i < count; i += 1) {
      if (this.enemies.countActive(true) >= this.maxActiveEnemies) break;
      this.spawnEnemy();
    }
  }

  handleEnemyHit(bullet, enemy) {
    this.stopBulletTrail(bullet);
    const shield = enemy?.getData('shield');
    if (shield && shield.block(bullet)) {
      bullet.disableBody(true, true);
      return;
    }
    bullet.disableBody(true, true);
    this.addExplosion(bullet.x, bullet.y, 16);
    const weapon = bullet.getData('weapon');
    const now = this.time.now;
    let damage = 1;
    if (weapon === 'red') {
      const lastHit = enemy.getData('lastRedHitAt') ?? 0;
      if (now - lastHit < 1000) return; // max 1 hp / s
      enemy.setData('lastRedHitAt', now);
    }
    enemy.hp = Math.max(0, (enemy.hp ?? this.enemyMaxHp) - damage);
    this.showDamageNumber(enemy.x, enemy.y - enemy.displayHeight * 0.3, damage);
    if (enemy.hp <= 0) {
      this.markEnemyRemoved(enemy);
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.playExplodeSound();
      this.detachShield(enemy);
      this.spawnShieldPickup(enemy);
      this.spawnGearPickup(enemy);
      this.enemyKillCount += 1;
      this.checkVictoryConditions(this.time.now);
      this.spawnWave(2); // replace fallen enemy with up to two, capped by maxActiveEnemies
    }
  }

  handlePlayerHit(player, enemy) {
    if (!player?.active || !enemy?.active) return;

    const now = this.time.now;
    if (now < (this.playerCollisionPauseUntil ?? 0)) return; // ütközés után 3s védettség
    this.playerCollisionPauseUntil = now + 3000;

    const cooldownUntil = enemy.getData('collisionCooldownUntil') ?? 0;
    if (now < cooldownUntil) return; // ne sebezzen minden frame-ben
    enemy.setData('collisionCooldownUntil', now + 450);

    const typeKey = enemy.getData('typeKey') || enemy.texture?.key;
    if (typeKey === 'enemyShip2') {
      this.damagePlayer(this.playerHp); // instant kill
      enemy.hp = 0;
    }
    const playerDamage = typeKey === 'enemyShip3' ? 2 : 1;
    if (typeKey === 'enemyShip2') {
      const fatal = enemy.hp ?? this.enemyMaxHp;
      enemy.hp = 0;
      this.showDamageNumber(enemy.x, enemy.y - enemy.displayHeight * 0.3, fatal);
    }
    const shield = this.playerShield;
    if (shield?.hp > 0 && shield.graphics) {
      shield.takeDamage(playerDamage);
      this.addExplosion(player.x, player.y, 12, 0x4cc3ff);
      if (!shield.graphics || shield.hp <= 0) {
        this.detachPlayerShield();
      }
    } else {
      this.damagePlayer(playerDamage);
    }

    const remainingHp = typeKey === 'enemyShip2'
      ? 0
      : Math.max(0, (enemy.hp ?? this.enemyMaxHp) - 1);
    enemy.hp = remainingHp;
    if (remainingHp <= 0) {
      this.markEnemyRemoved(enemy);
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.playExplodeSound();
      this.detachShield(enemy);
      this.spawnGearPickup(enemy);
      this.enemyKillCount += 1;
      this.checkVictoryConditions(this.time.now);
    } else {
      this.addExplosion(enemy.x, enemy.y, 10, 0xffa64d);
    }
  }

  handlePlayerHitByBullet(player, bullet) {
    const shield = this.playerShield;
    if (shield?.hp > 0 && shield.graphics && shield.block(bullet)) {
      bullet.disableBody(true, true);
      if (!shield.graphics || shield.hp <= 0) {
        this.detachPlayerShield();
      }
      return;
    }
    this.stopBulletTrail(bullet);
    bullet.disableBody(true, true);
    this.damagePlayer();
  }

  addExplosion(x, y, radius = 4, color = 0xffa64d) {
    const flash = this.add.circle(x, y, radius, color, 1).setDepth(8);
    this.tweens.add({
      targets: flash,
      radius: { from: radius, to: radius * 3 },
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy()
    });
  }

  cleanupEntities() {
    const { height } = this.scale;
    this.playerBullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -60) {
        this.stopBulletTrail(bullet);
        bullet.disableBody(true, true);
      }
    });
    this.enemyBullets.children.each((bullet) => {
      if (bullet.active && (bullet.y < -60 || bullet.y > height + 80)) {
        bullet.disableBody(true, true);
      }
    });
    this.enemies.children.each((enemy) => {
      if (enemy.active && enemy.y > height + 80) {
        this.markEnemyRemoved(enemy);
        enemy.disableBody(true, true);
      }
    });
    this.gearPickups?.children?.each((pickup) => {
      if (pickup.active && pickup.y > height + 120) {
        this.removePickupHitbox(pickup);
        pickup.disableBody(true, true);
      }
    });
    this.shieldPickups?.children?.each((pickup) => {
      if (pickup.active && pickup.y > height + 120) pickup.disableBody(true, true);
    });
    // ha enemy kiment, a pajzsát is töröljük
    this.shields = this.shields.filter((shield) => {
      if (!shield.enemy?.active) {
        shield.destroy();
        return false;
      }
      return true;
    });
  }

  removePickupHitbox(pickup) {
    const viz = pickup?.getData?.('hitboxViz');
    if (viz?.destroy) viz.destroy();
    pickup?.setData?.('hitboxViz', null);
  }

  syncPickupHitboxes() {
    if (!this.gearPickups) return;
    this.gearPickups.children.each((pickup) => {
      const viz = pickup?.getData?.('hitboxViz');
      if (!viz) return;
      if (!pickup.active) {
        viz.destroy();
        pickup.setData('hitboxViz', null);
        return;
      }
      viz.setPosition(pickup.x, pickup.y);
    });
  }

  attachShield(enemy) {
    if (!enemy) return;
    if (enemy.getData('typeKey') !== 'enemyShip3') return; // csak a nagy hajó kap pajzsot
    const shield = new Shield(this, enemy, {
      hp: 4,
      radius: enemy.displayWidth * 0.8,
      thickness: 8,
      arcDeg: 90,
      color: 0x4cc3ff,
      baseAngle: 0
    });
    this.shields.push(shield);
    enemy.setData('shield', shield);
  }

  detachShield(enemy) {
    const shield = enemy?.getData('shield');
    if (shield) shield.destroy();
    enemy?.setData('shield', null);
    this.shields = this.shields.filter((s) => s !== shield);
  }

  attachPlayerShield() {
    if (this.playerShield) this.detachPlayerShield();
    const radius = (this.player.displayWidth * this.hitboxes.playerRadiusFactor) / 4; // fele akkora sugár
    const shield = new Shield(this, this.player, {
      hp: 2,
      radius,
      thickness: 8,
      arcDeg: 90,
      color: 0x4cc3ff,
      baseAngle: Math.PI + Math.PI / 2 // 90 fokkal elforgatva óramutató irányába
    });
    shield.isPlayerShield = true;
    this.playerShield = shield;
    this.shields.push(shield);
    this.player.setData('shield', shield);
  }

  detachPlayerShield() {
    if (!this.playerShield) return;
    const shield = this.playerShield;
    shield.destroy();
    this.playerShield = null;
    this.shields = this.shields.filter((s) => s !== shield);
    this.player?.setData('shield', null);
  }

  updateShields() {
    if (!this.shields?.length) return;
    this.handleShieldBulletCollisions();
    this.shields = this.shields.filter((shield) => {
      const alive = shield.graphics && shield.enemy?.active && shield.hp > 0;
      if (!alive) {
        shield.destroy();
        if (shield.isPlayerShield && this.playerShield === shield) {
          this.playerShield = null;
          this.player?.setData('shield', null);
        }
        return false;
      }
      if (shield.isPlayerShield) {
        const angle = Phaser.Math.DegToRad(this.player.angle) + Math.PI + Math.PI / 2;
        shield.lastAngle = angle;
        shield.drawArc(angle);
      } else {
        shield.update(this.player);
      }
      return true;
    });
  }

  handleShieldBulletCollisions() {
    this.shields.forEach((shield) => {
      if (!shield?.graphics || !shield.enemy?.active || shield.hp <= 0) return;
      const bulletGroup = shield.isPlayerShield ? this.enemyBullets : this.playerBullets;
      if (!bulletGroup) return;
      bulletGroup.children.each((bullet) => {
        if (!bullet?.active) return;
        if (shield.block(bullet)) {
          if (!shield.isPlayerShield) this.stopBulletTrail(bullet);
          bullet.disableBody(true, true);
          if (shield.isPlayerShield && (!shield.graphics || shield.hp <= 0)) {
            this.playerShield = null;
            this.player?.setData('shield', null);
          }
        }
      });
    });
  }

  handleResize(gameSize) {
    if (!this.physics?.world) return;
    const { width, height } = gameSize;
    this.physics.world.setBounds(0, 0, width, height);
    // rebuild starfield to fit new size
    this.createStarfield();
    if (this.player?.active) {
      this.player.x = Phaser.Math.Clamp(this.player.x, this.player.displayWidth / 2, width - this.player.displayWidth / 2);
      this.player.y = Phaser.Math.Clamp(this.player.y, this.player.displayHeight / 2, height - this.player.displayHeight / 2);
    }
    this.positionWeaponIcons();
  }

  createHealthBar() {
    const { width } = this.scale;
    const barWidth = 300;
    const barHeight = 36;
    const x = width - barWidth - 20;
    const y = 16;
    this.hpBarBg = this.add.rectangle(x, y, barWidth, barHeight, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(10);
    this.hpSegments = [];
    const segmentW = barWidth / this.playerMaxHp;
    for (let i = 0; i < this.playerMaxHp; i += 1) {
      const seg = this.add.rectangle(x + i * segmentW + 2, y + 2, segmentW - 4, barHeight - 4, 0x1ee66d, 1)
        .setOrigin(0, 0)
        .setDepth(11);
      this.hpSegments.push(seg);
    }
    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.hpSegments) return;
    this.hpSegments.forEach((seg, idx) => {
      if (idx < this.playerHp) {
        seg.setFillStyle(0x1ee66d, 1);
        seg.setAlpha(1);
        seg.setVisible(true);
      } else if (seg.visible) {
        this.flashHpSegmentOff(seg);
      }
    });
  }

  flashHpSegmentOff(seg) {
    if (!seg) return;
    this.tweens.killTweensOf(seg);
    seg.setFillStyle(0xffd84d, 1);
    seg.setAlpha(1);
    seg.setVisible(true);
    this.tweens.add({
      targets: seg,
      alpha: { from: 1, to: 0 },
      duration: 140,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        seg.setVisible(false);
        seg.setAlpha(1);
        seg.setFillStyle(0x1ee66d, 1);
      }
    });
  }

  damagePlayer(amount = 1) {
    if (!this.player.active) return;
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.addExplosion(this.player.x, this.player.y, 8, 0xff5555);
    this.updateHealthBar();
    if (this.playerHp <= 0) {
      this.player.disableBody(true, true);
      this.playPlayerDeathSound(0.9);
      this.endGame('defeat');
    }
  }

  updateAmmoText() {
    if (!this.ammoText) return;
    const isRed = this.currentWeapon === 'red';
    const isReloading = isRed ? this.reloadingRed : this.reloadingBlue;
    const reloadEnd = isRed ? this.reloadEndTimeRed : this.reloadEndTimeBlue;
    if (isRed) {
      if (isReloading && reloadEnd) {
        const remaining = Math.max(0, reloadEnd - this.time.now);
        const seconds = (remaining / 1000).toFixed(1);
        const color = '#ff4d4d';
        this.ammoText.setColor(color);
        this.ammoText.setStroke(color, 2);
        this.ammoText.setText(`ammo ${seconds}s`);
        this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
      } else if (this.redFiringUntil > this.time.now) {
        const remaining = Math.max(0, this.redFiringUntil - this.time.now);
        const seconds = (remaining / 1000).toFixed(1);
        const color = '#00ff88';
        this.ammoText.setColor(color);
        this.ammoText.setStroke(color, 2);
        this.ammoText.setText(`ammo ${seconds}s`);
        this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
      } else {
        const color = '#00ff88';
        this.ammoText.setColor(color);
        this.ammoText.setStroke(color, 2);
        this.ammoText.setText('ammo ready');
        this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
      }
    } else {
      const color = isReloading || this.ammo <= 0 ? '#ff4d4d' : '#00ff88';
      this.ammoText.setColor(color);
      this.ammoText.setStroke(color, 2);
      this.ammoText.setText(`ammo ${this.ammo}/${this.maxAmmo}`);
      this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
    }
  }

  beginReload() {
    const isRed = this.currentWeapon === 'red';
    if (isRed ? this.reloadingRed : this.reloadingBlue) return;
    const reloadMs = isRed ? this.redReloadDuration : this.reloadTime;
    const endTime = this.time.now + reloadMs;
    if (isRed) {
      this.reloadingRed = true;
      this.reloadEndTimeRed = endTime;
      this.redFiringUntil = 0;
    } else {
      this.reloadingBlue = true;
      this.reloadEndTimeBlue = endTime;
    }
    this.reloading = isRed ? this.reloadingRed : this.reloadingBlue;
    this.reloadEndTime = isRed ? this.reloadEndTimeRed : this.reloadEndTimeBlue;
    this.updateAmmoText();
    this.time.delayedCall(reloadMs, () => {
      if (isRed) {
        this.ammoRed = this.maxAmmoRed;
        this.reloadingRed = false;
        this.reloadEndTimeRed = null;
      } else {
        this.ammoBlue = this.maxAmmoBlue;
        this.reloadingBlue = false;
        this.reloadEndTimeBlue = null;
      }
      if (this.currentWeapon === 'red') {
        this.ammo = this.ammoRed;
        this.reloading = this.reloadingRed;
        this.reloadEndTime = this.reloadEndTimeRed;
      } else {
        this.ammo = this.ammoBlue;
        this.reloading = this.reloadingBlue;
        this.reloadEndTime = this.reloadEndTimeBlue;
      }
      this.reloadText.setVisible(false);
      this.updateAmmoText();
      if (isRed) this.playReload2Sound(0.7);
      else this.playReloadSound(0.75);
      if (this.currentWeapon === (isRed ? 'red' : 'blue')) this.showAmmoLoadedFlash();
      if (this.beamSprite) {
        this.beamSprite.setVisible(false);
      }
    });
  }

  updateReloadCountdown(time) {
    if (!this.reloadText) return;
    const isRed = this.currentWeapon === 'red';
    const isReloading = isRed ? this.reloadingRed : this.reloadingBlue;
    const reloadEnd = isRed ? this.reloadEndTimeRed : this.reloadEndTimeBlue;
    if (!isReloading || !reloadEnd) {
      this.reloadText.setVisible(false);
      this.reloadBox.setVisible(false);
      return;
    }
    const remaining = Math.max(0, reloadEnd - time);
    const seconds = (remaining / 1000).toFixed(1);
    this.reloadText.setVisible(true);
    this.reloadBox.setVisible(true);
    this.reloadText.setColor('#ff4d4d');
    this.reloadText.setStroke('#ff4d4d', 2);
    this.reloadText.setText(`reloading ${seconds}s`);
    this.updateTextBox(this.reloadText, this.reloadBox, 10, '#ff4d4d');
  }

  setupMusic() {
    if (!this.gameSettings.musicEnabled) {
      this.gameMusic?.stop();
      return;
    }
    const desiredKey = this.gameSettings.musicTrack === 'chill' ? 'gameMusicAlt' : 'gameMusic';
    if (!this.gameMusic || this.gameMusicKey !== desiredKey) {
      this.gameMusic?.stop();
      this.gameMusic = this.sound.add(desiredKey, { loop: true, volume: this.musicVolume });
      this.gameMusicKey = desiredKey;
    }
    this.gameMusic.setVolume(this.musicVolume);
    if (!this.gameMusic.isPlaying) this.gameMusic.play();
  }

  playClickSound() {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('click', { volume: 0.7 });
  }

  playShotSound(volume = 0.35) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('shot', { volume });
  }

  playExplodeSound(volume = 0.7) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('explode', { volume });
  }

  playPlayerDeathSound(volume = 0.9) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('playerDeath', { volume });
  }

  playReloadSound(volume = 0.7) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('reload', { volume });
  }

  playReload2Sound(volume = 0.7) {
    if (!this.gameSettings?.sfxEnabled) return;
    this.sound?.play('reload2', { volume });
  }

  createWeaponIcons() {
    const { width } = this.scale;
    const { height } = this.scale;
    const size = 52;
    const gap = 12;
    const y = 16 + 36 + 16; // HP sáv alatt
    this.weaponIconBlue = this.add.rectangle(0, y, size, size, 0x4da0ff, 0.4)
      .setStrokeStyle(2, 0x4da0ff, 0.9)
      .setOrigin(0, 0)
      .setDepth(9)
      .setScrollFactor(0);
    this.weaponIconRed = this.add.rectangle(0, y, size, size, 0xff5a5a, 0.4)
      .setStrokeStyle(2, 0xff5a5a, 0.9)
      .setOrigin(0, 0)
      .setDepth(9)
      .setScrollFactor(0);
    this.weaponIconBlue.setX(width - (size * 2 + gap * 2));
    this.weaponIconRed.setX(width - (size + gap));
    this.updateWeaponIconState();
  }

  positionWeaponIcons() {
    if (!this.weaponIconBlue || !this.weaponIconRed) return;
    const { width } = this.scale;
    const size = this.weaponIconBlue.width;
    const gap = 12;
    this.weaponIconBlue.setX(width - (size * 2 + gap * 2));
    this.weaponIconRed.setX(width - (size + gap));
    const y = 16 + 36 + 16;
    this.weaponIconBlue.setY(y);
    this.weaponIconRed.setY(y);
  }

  updateWeaponIconState() {
    if (!this.weaponIconBlue || !this.weaponIconRed) return;
    const activeBlue = this.currentWeapon === 'blue';
    this.weaponIconBlue.setAlpha(activeBlue ? 0.95 : 0.25);
    this.weaponIconRed.setAlpha(activeBlue ? 0.25 : 0.95);
  }

  fireRedBeam(time) {
    const angleDeg = this.player.angle; // a hajó nézési iránya
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const dir = new Phaser.Math.Vector2(Math.sin(angleRad), -Math.cos(angleRad)); // előre mutató vektor
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const hitInfo = this.findBeamHit(origin, dir);
    this.drawRedBeam(origin, angleDeg, hitInfo.distance);
    if (hitInfo.enemy) {
      const now = this.time.now;
      const lastHit = hitInfo.enemy.getData('lastRedHitAt') ?? 0;
      if (now - lastHit >= 1000) {
        hitInfo.enemy.setData('lastRedHitAt', now);
        this.applyBeamDamage(hitInfo.enemy);
      }
    }
  }

  findBeamHit(origin, dir) {
    let best = { enemy: null, distance: this.redBeamLength };
    this.enemies.children.each((enemy) => {
      if (!enemy.active) return;
      const body = enemy.body;
      const ex = body?.center?.x ?? enemy.x;
      const ey = body?.center?.y ?? enemy.y;
      const toEnemy = new Phaser.Math.Vector2(ex - origin.x, ey - origin.y);
      const proj = Phaser.Math.Clamp(toEnemy.dot(dir), 0, this.redBeamLength);
      if (proj <= 0) return;
      const perp2 = toEnemy.lengthSq() - proj * proj;
      let radius = enemy.displayWidth * ((enemy.getData('hitboxFactor') ?? this.hitboxes.enemyRadiusFactor) / 2);
      if (body?.isCircle) radius = body.halfWidth;
      else if (body) radius = Math.max(body.halfWidth, body.halfHeight);
      if (perp2 > radius * radius) return;
      const offset = Math.sqrt(Math.max(0, radius * radius - perp2));
      const hitDist = proj - offset;
      if (hitDist < best.distance) {
        best = { enemy, distance: hitDist };
      }
    });
    const maxDist = this.distanceToScreenEdge(origin, dir, this.redBeamLength);
    if (best.distance > maxDist) {
      best.distance = maxDist;
      best.enemy = null;
    }
    return best;
  }

  distanceToScreenEdge(origin, dir, maxDist) {
    const { width, height } = this.scale;
    let best = maxDist;
    const eps = 1e-6;
    const candidates = [];
    if (Math.abs(dir.x) > eps) {
      candidates.push((0 - origin.x) / dir.x);
      candidates.push((width - origin.x) / dir.x);
    }
    if (Math.abs(dir.y) > eps) {
      candidates.push((0 - origin.y) / dir.y);
      candidates.push((height - origin.y) / dir.y);
    }
    candidates.forEach((t) => {
      if (t > 0) best = Math.min(best, t);
    });
    return best;
  }

  drawRedBeam(origin, angleDeg, distance) {
    if (!this.beamSprite) {
      this.beamSprite = this.add.image(origin.x, origin.y, 'playerBeam').setOrigin(0.5, 1).setDepth(4);
    }
    this.beamSprite.setVisible(true);
    this.beamSprite.setPosition(origin.x, origin.y);
    this.beamSprite.setAngle(angleDeg);
    const len = Math.min(distance, this.redBeamLength);
    this.beamSprite.setDisplaySize(this.beamSprite.width, len + 20); // kis ráhagyás, hogy vizuálisan érintse a hitboxot
  }

  applyBeamDamage(enemy) {
    const shield = enemy.getData('shield');
    if (shield && shield.block({ getData: () => 'red', x: enemy.x, y: enemy.y })) {
      return;
    }
    const damage = 3;
    enemy.hp = Math.max(0, (enemy.hp ?? this.enemyMaxHp) - damage);
    this.showDamageNumber(enemy.x, enemy.y - enemy.displayHeight * 0.3, damage);
    if (enemy.hp <= 0) {
      this.markEnemyRemoved(enemy);
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.playExplodeSound();
      this.detachShield(enemy);
      this.spawnShieldPickup(enemy);
      this.spawnGearPickup(enemy);
      this.enemyKillCount += 1;
      this.checkVictoryConditions(this.time.now);
      this.spawnWave(2);
    }
  }

  updateRedBeam() {
    if (!this.beamSprite || !this.beamSprite.visible) return;
    const angleDeg = this.player.angle;
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const dir = new Phaser.Math.Vector2(Math.sin(angleRad), -Math.cos(angleRad));
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const hitInfo = this.findBeamHit(origin, dir);
    this.drawRedBeam(origin, angleDeg, hitInfo.distance);
  }

  switchWeapon(key) {
    if (this.currentWeapon === key) return;
    if (this.currentWeapon === 'red') {
      this.ammoRed = this.ammo;
      this.reloadingRed = this.reloading;
      this.reloadEndTimeRed = this.reloadEndTime;
    } else {
      this.ammoBlue = this.ammo;
      this.reloadingBlue = this.reloading;
      this.reloadEndTimeBlue = this.reloadEndTime;
    }
    this.currentWeapon = key;
    this.maxAmmo = key === 'red' ? this.maxAmmoRed : this.maxAmmoBlue;
    this.ammo = key === 'red' ? this.ammoRed : this.ammoBlue;
    this.reloading = key === 'red' ? this.reloadingRed : this.reloadingBlue;
    this.reloadEndTime = key === 'red' ? this.reloadEndTimeRed : this.reloadEndTimeBlue;
    if (this.beamSprite) {
      this.beamSprite.destroy();
      this.beamSprite = null;
    }
    this.updateAmmoText();
    this.updateWeaponIconState();
  }

  spawnGearPickup(enemy) {
    if (!enemy || enemy.getData('typeKey') !== 'enemyShip3') return;
    if (!this.gearPickups) return;
    const gear = this.gearPickups.get(enemy.x, enemy.y, 'gearPickup');
    if (!gear) return;
    gear.enableBody(true, enemy.x, enemy.y, true, true);
    gear.setDisplaySize(gear.width / 8, gear.height / 8);
    gear.setActive(true).setVisible(true);
    gear.setDepth(8);
    gear.setVelocity(0, this.pickupFallSpeedGear ?? 40);
    gear.setImmovable(true);
    if (gear.body?.setCircle) {
      const r = (gear.displayWidth ?? gear.width) / 2;
      const offset = (gear.displayWidth / 2) - r;
      gear.body.setCircle(r, offset, offset);
    }
    gear.setInteractive({ useHandCursor: true });
    gear.removeAllListeners('pointerup');
    gear.on('pointerup', () => {
      if (!gear.active) return;
      this.handleGearPickup(this.player, gear);
    });
    this.removePickupHitbox(gear);
    gear.setData('hitboxViz', null); // hitbox vizuálisan rejtve
  }

  spawnShieldPickup(enemy) {
    if (!enemy || enemy.getData('typeKey') !== 'enemyShip2') return;
    if (!this.shieldPickups) return;
    const shield = this.shieldPickups.get(enemy.x, enemy.y, 'shieldPickup');
    if (!shield) return;
    shield.enableBody(true, enemy.x, enemy.y, true, true);
    shield.setActive(true).setVisible(true);
    shield.setDepth(8);
    shield.setVelocity(0, this.pickupFallSpeedShield ?? 30);
    shield.setImmovable(true);
  }

  handleGearPickup(_player, gear) {
    if (!gear?.active) return;
    this.removePickupHitbox(gear);
    gear.disableBody(true, true);
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 1);
    this.updateHealthBar();
  }

  handleShieldPickup(_player, shield) {
    if (!shield?.active) return;
    shield.disableBody(true, true);
    this.attachPlayerShield();
  }

  checkGearTouch() {
    if (!this.player?.active || !this.gearPickups) return;
    this.gearPickups.children.each((pickup) => {
      if (!pickup?.active) return;
      const radius = (pickup.displayWidth ?? pickup.width) / 2;
      const dx = this.player.x - pickup.x;
      const dy = this.player.y - pickup.y;
      if ((dx * dx + dy * dy) <= radius * radius) {
        this.handleGearPickup(this.player, pickup);
      }
    });
  }

  resolveEnemyOverlap(enemyA, enemyB) {
    if (!enemyA || !enemyB || enemyA === enemyB) return;
    if (!enemyA.body || !enemyB.body) return;
    const dx = enemyB.x - enemyA.x;
    const dy = enemyB.y - enemyA.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 === 0) return;
    const n = new Phaser.Math.Vector2(dx, dy).normalize();
    const push = 40;
    enemyA.setVelocity(enemyA.body.velocity.x - n.x * push, enemyA.body.velocity.y);
    enemyB.setVelocity(enemyB.body.velocity.x + n.x * push, enemyB.body.velocity.y);
    enemyA.x -= n.x * 4;
    enemyB.x += n.x * 4;
  }

  pauseGame() {
    if (this.gameOver || this.isPaused) return;
    this.isPaused = true;
    this.pauseSettingsVisible = false;
    this.physics.world.pause();
    if (this.spawnTimer) this.spawnTimer.paused = true;
    this.pauseContainer?.setVisible(true);
    this.pauseSettingsContainer?.setVisible(false);
    this.enablePauseButtons(true);
  }

  resumeGame() {
    if (this.gameOver || !this.isPaused) return;
    this.isPaused = false;
    this.pauseSettingsVisible = false;
    this.physics.world.resume();
    if (this.spawnTimer) this.spawnTimer.paused = false;
    this.pauseContainer?.setVisible(false);
    this.pauseSettingsContainer?.setVisible(false);
  }

  quitToMenu() {
    this.physics.world.resume();
    this.gameMusic?.stop();
    this.scene.start('Menu');
  }

  showPauseSettings() {
    this.pauseSettingsVisible = true;
    this.pauseSettingsContainer?.setVisible(true);
    this.pauseContainer?.setVisible(false);
    this.enablePauseButtons(false);
  }

  hidePauseSettings() {
    this.pauseSettingsVisible = false;
    this.pauseSettingsContainer?.setVisible(false);
    this.pauseContainer?.setVisible(true);
    this.enablePauseButtons(true);
  }

  enablePauseButtons(enable) {
    this.pauseButtons.forEach((container) => {
      if (!container?.buttonRef) return;
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
      callback?.();
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
      callback?.();
    });

    return { button, text };
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

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseContainer = this.add.container(width / 2, height / 2)
      .setDepth(10)
      .setVisible(false);
    this.pauseButtons = [];

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 500, 420, 0x0f1e3d, 0.95)
      .setStrokeStyle(4, 0x61dafb);
    const title = this.add.text(0, -150, 'Szünet', {
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

  checkVictoryConditions(time) {
    if (this.gameOver) return;
    const survivedMs = Math.max(0, time - (this.survivalStartTime ?? 0));
    if (survivedMs >= 300000 || this.enemyKillCount >= 25) {
      this.endGame('victory');
    }
  }

  endGame(result) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.world.pause();
    this.spawnTimer?.remove(false);
    this.spawnTimer = null;
    this.gameMusic?.stop();
    this.reloading = false;
    this.reloadingBlue = false;
    this.reloadingRed = false;
    this.reloadEndTime = null;
    this.reloadEndTimeBlue = null;
    this.reloadEndTimeRed = null;
    this.showGameOverOverlay(result);
  }

  showGameOverOverlay(result) {
    const { width, height } = this.scale;
    const isVictory = result === 'victory';
    const titleText = isVictory ? 'VICTORY' : 'DEFEAT';
    const titleColor = isVictory ? '#4cc3ff' : '#ff4d4d';

    const overlay = this.add.container(0, 0).setDepth(200);
    const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, isVictory ? 0.55 : 1)
      .setScrollFactor(0);
    const title = this.add.text(width / 2, height * 0.35, titleText, {
      fontFamily: 'Arial',
      fontSize: 96,
      fontStyle: 'bold',
      color: titleColor,
      stroke: titleColor,
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(isVictory ? 1 : 0);
    const deathImg = !isVictory
      ? this.add.image(width / 2, height / 2, 'death')
        .setAlpha(1)
        .setScale(1)
        .setDisplaySize(width * 0.8, height * 0.8)
      : null;

    const resumeBtn = this.createUiButton(width / 2, height * 0.55, 'Resume', () => {
      this.goToSceneFromGameOver('Game', true);
    }).setAlpha(0).setVisible(!isVictory);
    const returnBtn = this.createUiButton(width / 2, height * 0.55 + 90, 'Return to hangar', () => {
      this.goToSceneFromGameOver('Menu', false);
    }).setAlpha(0);

    overlay.add([dimBg, ...(deathImg ? [deathImg] : []), title, resumeBtn, returnBtn]);
    this.gameOverOverlay = overlay;

    if (!isVictory) {
      this.tweens.add({
        targets: title,
        alpha: 1,
        duration: 1200,
        ease: 'Cubic.easeOut',
        delay: 2000
      });
      const btnDelayBase = 4000;
      this.time.delayedCall(btnDelayBase, () => {
        resumeBtn.setVisible(true);
        this.tweens.add({
          targets: resumeBtn,
          alpha: 1,
          duration: 700,
          ease: 'Cubic.easeOut'
        });
      });
      this.time.delayedCall(btnDelayBase + 400, () => {
        this.tweens.add({
          targets: returnBtn,
          alpha: 1,
          duration: 700,
          ease: 'Cubic.easeOut'
        });
      });
    }
  }

  goToSceneFromGameOver(targetScene, restart = false) {
    if (this.gameOverTransitioning) return;
    this.gameOverTransitioning = true;
    this.gameMusic?.stop();
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.gameOverTransitioning = false;
      if (restart) this.scene.restart();
      else this.scene.start(targetScene);
    });
    this.cameras.main.fadeOut(800, 0, 0, 0);
  }

  createUiButton(x, y, label, onClick) {
    const btnWidth = 320;
    const btnHeight = 72;
    const btn = this.add.container(x, y).setSize(btnWidth, btnHeight).setDepth(201);
    const rect = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x0c1a2f, 0.85)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0x4cc3ff, 0.9);
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: 38,
      fontStyle: 'bold',
      color: '#cfe9ff'
    }).setOrigin(0.5);
    btn.add([rect, txt]);
    btn.setInteractive({ useHandCursor: true })
      .on('pointerover', () => rect.setFillStyle(0x123356, 0.95))
      .on('pointerout', () => rect.setFillStyle(0x0c1a2f, 0.85))
      .on('pointerdown', () => {
        rect.setFillStyle(0x20508c, 1);
      })
      .on('pointerup', () => {
        rect.setFillStyle(0x123356, 0.95);
        onClick?.();
      });
    return btn;
  }

  showAmmoLoadedFlash() {
    if (!this.loadedText) return;
    const text = this.currentWeapon === 'blue' ? 'ammo loaded' : 'ammo full';
    this.loadedText.setText(text);
    this.loadedText.setVisible(true);
    this.loadedText.setAlpha(1);
    const flashOnce = (delay) => {
      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: this.loadedText,
          alpha: { from: 1, to: 0 },
          duration: 250,
          yoyo: true,
          repeat: 0
        });
      });
    };
    this.loadedText.setStroke('#ffd84d', 2);
    this.loadedBox.setVisible(true);
    this.updateTextBox(this.loadedText, this.loadedBox, 10, '#ffd84d');
    flashOnce(0);
    flashOnce(350);
    this.time.delayedCall(800, () => {
      this.loadedText.setVisible(false);
      this.loadedText.setAlpha(1);
      this.loadedBox.setVisible(false);
    });
  }

  updateTextBox(textObj, box, padding, color) {
    if (!textObj || !box) return;
    box.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
    box.setPosition(textObj.x - padding * 0.5, textObj.y - padding * 0.5);
    box.setSize(textObj.displayWidth + padding, textObj.displayHeight + padding);
  }

  createBlobPoints(size) {
    const points = [];
    const segments = 6 + Math.floor(Math.random() * 4);
    const baseRadius = size * 0.5;
    for (let i = 0; i < segments; i += 1) {
      const angle = (Math.PI * 2 * i) / segments;
      const jitter = Phaser.Math.FloatBetween(0.5, 1.15);
      const r = baseRadius * jitter;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
  }

  drawDebugHitboxes() {
    if (!this.debugGfx) return;
    this.debugGfx.clear();
    this.debugGfx.lineStyle(2, 0x00ff00, 0.8);

    // Player circle (rajzoljuk akkor is, ha a body már disabled)
    if (this.player) {
      const body = this.player.body;
      if (body?.isCircle) {
        const radius = body.halfWidth;
        this.debugGfx.strokeCircle(body.x + radius, body.y + radius, radius);
      } else if (body) {
        this.debugGfx.strokeRect(body.x, body.y, body.width, body.height);
      } else {
        const radius = (this.player.displayWidth * this.hitboxes.playerRadiusFactor) / 2;
        this.debugGfx.strokeCircle(this.player.x, this.player.y, radius);
      }
    }

    // Enemy hitboxes (circles)
    this.enemies.children.each((enemy) => {
      if (!enemy.active || !enemy.body) return;
      this.debugGfx.lineStyle(2, 0xff0000, 0.8);
      if (enemy.body.isCircle) {
        const r = enemy.body.halfWidth;
        this.debugGfx.strokeCircle(enemy.body.x + r, enemy.body.y + r, r);
        this.addDebugHp(enemy, enemy.hp ?? this.enemyMaxHp, enemy.body.x + r, enemy.body.y + r - r - 10);
      } else {
        this.debugGfx.strokeRect(enemy.body.x, enemy.body.y, enemy.body.width, enemy.body.height);
        this.addDebugHp(enemy, enemy.hp ?? this.enemyMaxHp, enemy.body.x + enemy.body.width / 2, enemy.body.y - 10);
      }
    });
    // Shields (circular arcs for debug)
    this.shields.forEach((shield) => {
      if (!shield?.enemy?.active || shield.hp <= 0) return;
      const { x, y } = shield.enemy;
      const radius = shield.radius;
      const half = Phaser.Math.DegToRad((shield.arcDeg ?? 90) / 2);
      const start = shield.lastAngle - half;
      const end = shield.lastAngle + half;
      this.debugGfx.lineStyle(1, 0x4cc3ff, 0.7);
      this.debugGfx.beginPath();
      this.debugGfx.arc(x, y, radius, start, end);
      this.debugGfx.strokePath();
      this.debugGfx.lineBetween(x, y, x + Math.cos(start) * radius, y + Math.sin(start) * radius);
      this.debugGfx.lineBetween(x, y, x + Math.cos(end) * radius, y + Math.sin(end) * radius);
      this.addDebugHp(shield, shield.hp, x, y - radius - 8, '#4cc3ff');
    });

    // Player bullets
    this.debugGfx.lineStyle(1, 0x00aaff, 0.8);
    this.playerBullets.children.each((bullet) => {
      if (!bullet.active || !bullet.body) return;
      this.debugGfx.strokeRect(bullet.body.x, bullet.body.y, bullet.body.width, bullet.body.height);
    });

    // Player HP text
    if (this.player?.body) {
      const px = this.player.body.center.x;
      const py = this.player.body.y - 10;
      this.addDebugHp(this.player, this.playerHp, px, py, '#00ff88');
    }
  }

  attachBulletTrail(bullet) {
    if (!bullet) return;
    this.stopBulletTrail(bullet);
    const timer = this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        if (!bullet.active) return;
        const trail = this.add.image(bullet.x, bullet.y, 'playerBullet')
          .setScale(0.7)
          .setDepth(3)
          .setAlpha(0.7);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.3,
          duration: 300,
          onComplete: () => trail.destroy()
        });
      }
    });
    bullet.setData('trailTimer', timer);
  }

  stopBulletTrail(bullet) {
    if (!bullet) return;
    const timer = bullet.getData('trailTimer');
    if (timer) {
      timer.remove(false);
      bullet.setData('trailTimer', null);
    }
  }

  markEnemyRemoved(enemy) {
    if (enemy?.getData('typeKey') === 'enemyShip2' && this.enemyShip2Count > 0) {
      this.enemyShip2Count -= 1;
    }
  }

  addDebugHp(entity, value, x, y, color = '#ff5252') {
    if (!this.debug) return;
    if (!this.debugGfx) return;
    const text = this.add.text(x, y, `${value}`, {
      fontFamily: 'Arial',
      fontSize: 14,
      color,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(51);
    this.time.delayedCall(16, () => text.destroy()); // csak egy frame-re jelenjen meg
  }

  showDamageNumber(x, y, amount) {
    const txt = this.add.text(x, y, `-${amount}`, {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffd84d',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(1000, () => txt.destroy());
  }
}



