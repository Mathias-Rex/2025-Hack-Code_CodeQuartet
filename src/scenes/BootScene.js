export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    if (!window.__GAME_SETTINGS__) {
      window.__GAME_SETTINGS__ = { musicEnabled: true };
    }
    this.cameras.main.setBackgroundColor('#1d212d');
    this.scene.start('Preload');
  }
}

