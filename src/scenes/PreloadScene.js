export default class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    // Egyszerű textúrák generálása (nincs külső asset)
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffcc00, 1);
    g.fillCircle(32, 32, 32);
    g.generateTexture('ball', 64, 64);

    g.clear();
    g.fillStyle(0x00e5ff, 1);
    g.fillRoundedRect(0, 0, 120, 20, 10);
    g.generateTexture('paddle', 120, 20);

    g.destroy();

    this.add.text(400, 300, 'Betöltés...', {
      fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start('Game');
  }
}

