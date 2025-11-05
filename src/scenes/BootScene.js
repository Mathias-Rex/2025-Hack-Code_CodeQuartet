export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.cameras.main.setBackgroundColor('#1d212d');
    this.scene.start('Preload');
  }
}

