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
    this.enemySpawnDelay = 900;
    this.enemyMaxHp = 3;
    this.enemyTypes = [
      { key: 'enemyShip', speed: { min: 90, max: 160 }, hp: 3, scaleMul: 1, weight: 6 },   // leggyakoribb
      { key: 'enemyShip2', speed: { min: 190, max: 280 }, hp: 1, scaleMul: 1, weight: 4 }, // gyakoribb spawn, gyorsabb
      { key: 'enemyShip3', speed: { min: 55, max: 95 }, hp: 6, scaleMul: 2, weight: 1 }    // legritkább
    ];
    this.maxAmmo = 15;
    this.ammo = this.maxAmmo;
    this.reloadTime = 3000;
    this.reloading = false;
    this.playerMaxHp = 5;
    this.playerHp = this.playerMaxHp;
    this.hitboxes = {
      playerRadiusFactor: 4,
      enemyRadiusFactor: 5,
      bulletWidthFactor: 1,
      bulletHeightFactor: 1
    };
    this.starSpeedMultiplier = 1;
    this.starSpeedLerp = 0.08;
    this.debug = !!window.__DEBUG__;
    console.log(this.debug)
  }

  preload() {
    this.load.image('gameBg', 'assets/images/background.png');
    this.load.image('playerShip', 'assets/sprites/playership1.png');
    this.load.image('enemyShip', 'assets/sprites/enemyship1.png');
    this.load.image('enemyShip2', 'assets/sprites/enemyship2.png');
    this.load.image('enemyShip3', 'assets/sprites/enemyship3.png');
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.sound.stopByKey('gameMusic');
    this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: 0.6 });
    this.gameMusic.play();

    // reset per-run state
    this.reloading = false;
    this.reloadEndTime = null;
    this.ammo = this.maxAmmo;
    this.playerHp = this.playerMaxHp;
    this.starSpeedMultiplier = 1;
    this.playerCollisionPauseUntil = 0;

    this.createStarfield();
    this.createBulletTexture('playerBullet', 4, 18, 0x7cf4ff);
    this.createBulletTexture('enemyBullet', 5, 12, 0xff8a7a);

    this.player = this.createPlayer();
    this.playerBaseY = this.player.y;
    this.playerBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 30 });

    this.physics.add.overlap(this.playerBullets, this.enemies, this.handleEnemyHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.handlePlayerHitByBullet, null, this);
    this.spawnWave(Phaser.Math.Between(1, this.maxActiveEnemies));

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
      reload: Phaser.Input.Keyboard.KeyCodes.R
    });

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
    this.reloadEndTime = null;

    this.createHealthBar();

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

    this.events.once('shutdown', () => this.gameMusic?.stop());
    this.events.once('destroy', () => this.gameMusic?.stop());
  }

  update(time, delta) {
    this.updateStarfield(time, delta);
    if (this.player?.active) {
      this.handlePlayerMovement(delta);
      this.handleShooting(time);
    }
    this.updateEnemyShooting(time);
    this.cleanupEntities();
    this.updateReloadCountdown(time);
    if (this.debug) this.drawDebugHitboxes();
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

  handlePlayerMovement(delta) {
    const move = (this.playerSpeed * delta) / 1000;
    let vx = 0;
    let vy = 0;
    if (this.keys.left.isDown) vx -= move;
    if (this.keys.right.isDown) vx += move;
    if (this.keys.up.isDown) vy -= move;
    if (this.keys.down.isDown) vy += move;
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
    if (this.keys.left.isDown && !this.keys.right.isDown) targetAngle = -45;
    if (this.keys.right.isDown && !this.keys.left.isDown) targetAngle = 45;
    this.player.setAngle(Phaser.Math.Linear(this.player.angle, targetAngle, this.tiltLerp));

    // Adjust starfield speed with W/S
    let targetSpeedMul = 1;
    if (this.keys.up.isDown && !this.keys.down.isDown) targetSpeedMul = 1.8;
    if (this.keys.down.isDown && !this.keys.up.isDown) targetSpeedMul = 0.5;

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

    const bullet = this.playerBullets.get();
    if (!bullet) return;

    const offsetY = this.player.displayHeight * 0.55;
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
    this.attachBulletTrail(bullet);
    this.playShotSound(0.45);
    this.ammo -= 1;
    this.updateAmmoText();
    if (this.ammo <= 0) {
      this.beginReload();
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

    const type = this.pickEnemyType();
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
    const enemyRadius = (enemy.displayWidth * this.hitboxes.enemyRadiusFactor) / 2;
    enemy.body.setCircle(enemyRadius);
    enemy.body.setOffset(
      enemy.displayOriginX - enemyRadius,
      enemy.displayOriginY - enemyRadius
    );
    enemy.hp = type.hp ?? this.enemyMaxHp;
    enemy.setData('typeKey', type.key);
    enemy.setData('nextShotAt', this.time.now + Phaser.Math.Between(800, 1400));
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
    bullet.disableBody(true, true);
    this.addExplosion(bullet.x, bullet.y, 16);
    enemy.hp = Math.max(0, (enemy.hp ?? this.enemyMaxHp) - 1);
    if (enemy.hp <= 0) {
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.playExplodeSound();
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
    const playerDamage = typeKey === 'enemyShip3' ? 2 : 1;
    this.damagePlayer(playerDamage);

    const remainingHp = Math.max(0, (enemy.hp ?? this.enemyMaxHp) - 1);
    enemy.hp = remainingHp;
    if (remainingHp <= 0) {
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.playExplodeSound();
    } else {
      this.addExplosion(enemy.x, enemy.y, 10, 0xffa64d);
    }
  }

  handlePlayerHitByBullet(player, bullet) {
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
      if (enemy.active && enemy.y > height + 80) enemy.disableBody(true, true);
    });
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;
    this.physics.world.setBounds(0, 0, width, height);
    // rebuild starfield to fit new size
    this.createStarfield();
    if (this.player.active) {
      this.player.x = Phaser.Math.Clamp(this.player.x, this.player.displayWidth / 2, width - this.player.displayWidth / 2);
      this.player.y = Phaser.Math.Clamp(this.player.y, this.player.displayHeight / 2, height - this.player.displayHeight / 2);
    }
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

  playShotSound(volume = 0.35) {
    this.sound?.play('shot', { volume });
  }

  playExplodeSound(volume = 0.7) {
    this.sound?.play('explode', { volume });
  }

  playReloadSound(volume = 0.7) {
    this.sound?.play('reload', { volume });
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
      this.playExplodeSound(0.9);
      this.time.delayedCall(1200, () => this.scene.restart());
    }
  }

  updateAmmoText() {
    if (!this.ammoText) return;
    const color = this.reloading || this.ammo <= 0 ? '#ff4d4d' : '#00ff88';
    this.ammoText.setColor(color);
    this.ammoText.setStroke(color, 2);
    this.ammoText.setText(`ammo ${this.ammo}/${this.maxAmmo}`);
    this.updateTextBox(this.ammoText, this.ammoBox, 10, color);
  }

  beginReload() {
    if (this.reloading) return;
    this.reloading = true;
    this.reloadEndTime = this.time.now + this.reloadTime;
    this.updateAmmoText();
    this.time.delayedCall(this.reloadTime, () => {
      this.ammo = this.maxAmmo;
      this.reloading = false;
      this.reloadEndTime = null;
      this.reloadText.setVisible(false);
      this.updateAmmoText();
      this.playReloadSound(0.75);
      this.showAmmoLoadedFlash();
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
  }

  showAmmoLoadedFlash() {
    if (!this.loadedText) return;
    this.loadedText.setText('ammo loaded');
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

    // Player circle
    if (this.player?.active && this.player.body) {
      const body = this.player.body;
      if (body.isCircle) {
        const radius = body.halfWidth;
        this.debugGfx.strokeCircle(body.x + radius, body.y + radius, radius);
      } else {
        this.debugGfx.strokeRect(body.x, body.y, body.width, body.height);
      }
    }

    // Enemy hitboxes (circles)
    this.enemies.children.each((enemy) => {
      if (!enemy.active || !enemy.body) return;
      this.debugGfx.lineStyle(2, 0xff0000, 0.8);
      if (enemy.body.isCircle) {
        const r = enemy.body.halfWidth;
        this.debugGfx.strokeCircle(enemy.body.x + r, enemy.body.y + r, r);
      } else {
        this.debugGfx.strokeRect(enemy.body.x, enemy.body.y, enemy.body.width, enemy.body.height);
      }
    });

    // Player bullets
    this.debugGfx.lineStyle(1, 0x00aaff, 0.8);
    this.playerBullets.children.each((bullet) => {
      if (!bullet.active || !bullet.body) return;
      this.debugGfx.strokeRect(bullet.body.x, bullet.body.y, bullet.body.width, bullet.body.height);
    });
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
}
