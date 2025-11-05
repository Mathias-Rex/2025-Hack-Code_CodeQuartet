export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.paddle = this.physics.add.image(this.scale.width / 2, this.scale.height - 40, 'paddle')
      .setImmovable(true)
      .setCollideWorldBounds(true);

    this.ball = this.physics.add.image(this.scale.width / 2, this.scale.height / 2, 'ball')
      .setVelocity(200, 160)
      .setBounce(1, 1)
      .setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.physics.add.collider(this.ball, this.paddle);

    this.add.text(10, 10, 'Bal/Jobb: paddle | Reset: R', {
      fontFamily: 'Arial', fontSize: 14, color: '#a8b3cf'
    });

    // Egérrel is mozgatható a paddle
    this.input.on('pointermove', (p) => {
      const minX = this.paddle.width / 2;
      const maxX = this.scale.width - this.paddle.width / 2;
      this.paddle.x = Phaser.Math.Clamp(p.x, minX, maxX);
    });
  }

  update() {
    const speed = 400;
    if (this.cursors.left.isDown) this.paddle.setVelocityX(-speed);
    else if (this.cursors.right.isDown) this.paddle.setVelocityX(speed);
    else this.paddle.setVelocityX(0);

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
    }
  }
}

