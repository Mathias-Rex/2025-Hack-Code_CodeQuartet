export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#02030a');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.image(width / 2, height / 2, 'introBg')
      .setDisplaySize(width, height)
      .setAlpha(0.35)
      .setDepth(-1);

    this.add.text(width / 2, height / 2 - 40, 'Code Quartet Studios', {
      fontFamily: 'Arial',
      fontSize: 42,
      fontStyle: 'bold',
      color: '#7de8ff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 18, true, true);

    const subtitle = this.add.text(width / 2, height / 2 + 16, 'bemutatja', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#c6d6ff'
    }).setOrigin(0.5);
    subtitle.setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1
    });

    this.finished = false;
    this.playIntroSound();
    this.enableSkipWithSpace();
  }

  playIntroSound() {
    this.introSound = this.sound.get('introSound') || this.sound.add('introSound', {
      volume: 0.9
    });

    const triggerPlay = () => {
      if (this.introSound?.isPlaying) return;
      this.introSound?.play();
    };

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, triggerPlay);
    } else {
      triggerPlay();
    }

    if (this.introSound) {
      this.introSound.once('complete', () => this.finishIntro());
    } else {
      this.time.delayedCall(1000, () => this.finishIntro());
    }
  }

  enableSkipWithSpace() {
    this.input.keyboard.once('keydown-SPACE', () => {
      if (this.finished) return;
      this.introSound?.stop();
      this.finishIntro();
    });
  }

  finishIntro() {
    if (this.finished) return;
    this.finished = true;
    window.__INTRO_SHOWN = true;
    this.introSound?.stop();
    this.fadeToScene('Menu');
  }

  fadeToScene(targetScene, duration = 650) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetScene);
    });
    this.cameras.main.fadeOut(duration, 0, 0, 0);
  }
}
