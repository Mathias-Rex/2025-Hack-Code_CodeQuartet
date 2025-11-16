export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);

    const bg = this.add.image(width / 2, height / 2, 'gameBg')
      .setDepth(-2);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale);

    this.playAreaWidth = width;

    this.paddle = this.physics.add.image(width / 2, height - 40, 'paddle')
      .setImmovable(true)
      .setCollideWorldBounds(true);
    const desiredWidth = 170;
    const scale = desiredWidth / this.paddle.width;
    this.paddle.setScale(scale);
    this.paddle.body.setSize(this.paddle.displayWidth, this.paddle.displayHeight, true);
    this.paddleHalfWidth = this.paddle.displayWidth / 2;

    this.ball = this.physics.add.image(width / 2, height / 2, 'ball')
      .setVelocity(200, 160)
      .setBounce(1, 1)
      .setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.physics.add.collider(this.ball, this.paddle);

    this.add.text(10, 10, 'Bal/Jobb: paddle | Reset: R | Esc: Menü', {
      fontFamily: 'Arial', fontSize: 14, color: '#a8b3cf'
    });

    this.isPaused = false;
    this.savedVelocity = new Phaser.Math.Vector2();
    this.createPauseMenu();

    // Egérrel is mozgatható a paddle
    this.input.on('pointermove', (p) => {
      if (this.isPaused) return;
      const minX = this.paddleHalfWidth;
      const maxX = this.playAreaWidth - this.paddleHalfWidth;
      this.paddle.x = Phaser.Math.Clamp(p.x, minX, maxX);
    });
  }

  createPauseMenu() {
    const { width, height } = this.scale;
    this.pauseContainer = this.add.container(width / 2, height / 2)
      .setDepth(10)
      .setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0.5);
    const panel = this.add.rectangle(0, 0, 360, 240, 0x0f1e3d, 0.95)
      .setStrokeStyle(4, 0x61dafb);
    const title = this.add.text(0, -80, 'Szünet', {
      fontFamily: 'Arial',
      fontSize: 36,
      color: '#ffffff'
    }).setOrigin(0.5);

    const resumeBtn = this.createMenuButton(0, -15, 'Folytatás', () => this.resumeGame());
    const quitBtn = this.createMenuButton(0, 55, 'Kilépés a főmenübe', () => this.quitToMenu());

    this.pauseContainer.add([overlay, panel, title, resumeBtn, quitBtn]);
  }

  createMenuButton(x, y, label, callback) {
    const button = this.add.rectangle(x, y, 260, 56, 0x00c2ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: 26,
      color: '#03253f'
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x40e9ff, 0.95));
    button.on('pointerout', () => button.setFillStyle(0x00c2ff, 0.9));
    button.on('pointerup', () => {
      this.playClickSound();
      callback();
    });

    return this.add.container(0, 0, [button, text]);
  }

  playClickSound() {
    this.sound.play('click', { volume: 0.7 });
  }

  pauseGame() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.savedVelocity.copy(this.ball.body.velocity);
    this.ball.setVelocity(0, 0);
    this.paddle.setVelocity(0, 0);
    this.physics.world.pause();
    this.pauseContainer.setVisible(true);
  }

  resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.physics.world.resume();
    this.ball.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
    this.pauseContainer.setVisible(false);
  }

  quitToMenu() {
    this.physics.world.resume();
    this.scene.start('Menu');
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      if (this.isPaused) this.resumeGame();
      else this.pauseGame();
    }

    if (this.isPaused) return;

    const speed = 400;
    if (this.cursors.left.isDown) this.paddle.setVelocityX(-speed);
    else if (this.cursors.right.isDown) this.paddle.setVelocityX(speed);
    else this.paddle.setVelocityX(0);

    this.paddle.x = Phaser.Math.Clamp(
      this.paddle.x,
      this.paddleHalfWidth,
      this.playAreaWidth - this.paddleHalfWidth
    );

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
    }
  }
}
