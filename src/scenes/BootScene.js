export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    if (window.__DEBUG__ === undefined) {
      window.__DEBUG__ = true;
    }
    if (window.__DEBUG__ = true) console.warning("DEBUG MODE IS ON!!!")

    if (!window.__GAME_SETTINGS__) {
      window.__GAME_SETTINGS__ = { musicEnabled: true, sfxEnabled: true, musicVolume: 0.6 };
    } else {
      window.__GAME_SETTINGS__.musicEnabled ??= true;
      window.__GAME_SETTINGS__.sfxEnabled ??= true;
      window.__GAME_SETTINGS__.musicVolume ??= 0.6;
    }
    this.cameras.main.setBackgroundColor('#1d212d');
    this.scene.start('Preload');
  }
}

