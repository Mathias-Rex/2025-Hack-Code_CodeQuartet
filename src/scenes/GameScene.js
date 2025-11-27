export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.stars = [];
    this.scrollSpeed = 140; // px per second (used by starfield)
    this.starLayers = [
      { countFactor: 0.06, speed: 40, sizeRange: [1, 1.5], alpha: 0.35 },
      { countFactor: 0.08, speed: 70, sizeRange: [1, 2], alpha: 0.45 },
      { countFactor: 0.1, speed: 110, sizeRange: [1.5, 2.5], alpha: 0.6 },
      { countFactor: 0.12, speed: 160, sizeRange: [2, 3], alpha: 0.8 }
    ];
    this.playerSpeed = 320;
    this.fireDelay = 150; // ms between player shots
    this.nextShotAt = 0;
    this.enemySpeed = { min: 90, max: 160 };
    this.maxActiveEnemies = 10;
    this.enemySpawnDelay = 900;
    this.enemyMaxHp = 5;
    this.hitboxes = {
      playerRadiusFactor: 4,
      enemyRadiusFactor: 5,
      bulletWidthFactor: 1,
      bulletHeightFactor: 1
    };
    this.debug = !!window.__DEBUG__;
    console.log(this.debug)
  }

  preload() {
    this.load.image('gameBg', 'assets/images/background.png');
    this.load.image('playerShip', 'assets/sprites/playership1.png');
    this.load.image('enemyShip', 'assets/sprites/enemyship1.png');
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.createStarfield();
    this.createBulletTexture('playerBullet', 4, 18, 0x7cf4ff);
    this.createBulletTexture('enemyBullet', 6, 10, 0xff8a7a);

    this.player = this.createPlayer();
    this.playerBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 60 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 30 });

    this.physics.add.overlap(this.playerBullets, this.enemies, this.handleEnemyHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.spawnWave(Phaser.Math.Between(1, 3));

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.score = 0;
    this.scoreText = this.add.text(18, 16, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: 20,
      color: '#e8f0ff'
    }).setDepth(10).setOrigin(0, 0);

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
  }

  update(time, delta) {
    this.updateStarfield(time, delta);
    if (this.player?.active) {
      this.handlePlayerMovement(delta);
      this.handleShooting(time);
    }
    this.cleanupEntities();
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
        this.stars.push({
          x: Phaser.Math.FloatBetween(0, width),
          y: Phaser.Math.FloatBetween(0, height),
          size,
          speed: layer.speed,
          alphaBase: layer.alpha,
          phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
          layer: idx
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
      if (star.y > height) {
        star.y -= height;
        star.x = Phaser.Math.FloatBetween(0, width);
      }
      const flicker = 0.8 + 0.2 * Math.sin(t * flickerFreq + star.phase);
      const alpha = Phaser.Math.Clamp(star.alphaBase * flicker, 0, 1);
      const color = 0xffffff;
      this.starGraphics.fillStyle(color, alpha);
      this.starGraphics.fillCircle(star.x, star.y, star.size);
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
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, radius * 2, length, radius);
    g.generateTexture(key, radius * 2, length);
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
    this.player.x = Phaser.Math.Clamp(this.player.x + vx, this.player.displayWidth / 2, this.scale.width - this.player.displayWidth / 2);
    this.player.y = Phaser.Math.Clamp(this.player.y + vy, this.player.displayHeight / 2, this.scale.height - this.player.displayHeight / 2);
  }

  handleShooting(time) {
    if (!this.keys.shoot.isDown) return;
    if (time < this.nextShotAt) return;
    this.nextShotAt = time + this.fireDelay;

    const bullet = this.playerBullets.get();
    if (!bullet) return;

    const offsetY = this.player.displayHeight * 0.55;
    bullet.enableBody(true, this.player.x, this.player.y - offsetY, true, true);
    bullet.setTexture('playerBullet');
    bullet.setScale(1);
    bullet.setVelocity(0, -620);
    bullet.setDepth(5);
    bullet.body.setSize(bullet.width * this.hitboxes.bulletWidthFactor, bullet.height * this.hitboxes.bulletHeightFactor).setOffset(0, 0);
  }

  spawnEnemy() {
    if (this.enemies.countActive(true) >= this.maxActiveEnemies) return;
    const enemy = this.enemies.get();
    if (!enemy) return;

    const { width } = this.scale;
    const spawnPadding = 40;
    const x = Phaser.Math.Between(spawnPadding, width - spawnPadding);
    const y = -80;
    const texture = this.textures.get('enemyShip').getSourceImage();
    const targetWidth = Math.min(110, width * 0.16);
    const scale = targetWidth / texture.width;

    enemy.enableBody(true, x, y, true, true);
    enemy.setTexture('enemyShip');
    enemy.setScale(scale);
    enemy.setDepth(4);
    enemy.setVelocity(0, Phaser.Math.Between(this.enemySpeed.min, this.enemySpeed.max));
    const enemyRadius = (enemy.displayWidth * this.hitboxes.enemyRadiusFactor) / 2;
    enemy.body.setCircle(enemyRadius);
    enemy.body.setOffset(
      enemy.displayOriginX - enemyRadius,
      enemy.displayOriginY - enemyRadius
    );
    enemy.hp = this.enemyMaxHp;
  }

  spawnWave(count) {
    for (let i = 0; i < count; i += 1) {
      if (this.enemies.countActive(true) >= this.maxActiveEnemies) break;
      this.spawnEnemy();
    }
  }

  handleEnemyHit(bullet, enemy) {
    bullet.disableBody(true, true);
    enemy.hp = Math.max(0, (enemy.hp ?? this.enemyMaxHp) - 1);
    if (enemy.hp <= 0) {
      enemy.disableBody(true, true);
      this.addExplosion(enemy.x, enemy.y);
      this.updateScore(10);
      this.spawnWave(2); // replace fallen enemy with up to two, capped by maxActiveEnemies
    }
  }

  handlePlayerHit(player, enemy) {
    enemy.disableBody(true, true);
    this.addExplosion(player.x, player.y);
    player.disableBody(true, true);
    this.time.delayedCall(1200, () => this.scene.restart());
  }

  addExplosion(x, y) {
    const flash = this.add.circle(x, y, 6, 0xffe7a4, 1).setDepth(8);
    this.tweens.add({
      targets: flash,
      radius: { from: 6, to: 40 },
      alpha: { from: 1, to: 0 },
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy()
    });
  }

  cleanupEntities() {
    const { height } = this.scale;
    this.playerBullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -60) bullet.disableBody(true, true);
    });
    this.enemies.children.each((enemy) => {
      if (enemy.active && enemy.y > height + 80) enemy.disableBody(true, true);
    });
  }

  updateScore(amount) {
    this.score += amount;
    this.scoreText.setText(`Score: ${this.score}`);
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
}
