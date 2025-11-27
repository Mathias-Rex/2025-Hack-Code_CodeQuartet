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

    this.activeTimers = [];
    this.activeTweens = [];
    this.introFlowStarted = false;
    this.skipReady = false;

    this.introTitle = this.add.text(width / 2, height / 2 - 40, 'Code Quartet Studios', {
      fontFamily: 'Arial',
      fontSize: 42,
      fontStyle: 'bold',
      color: '#7de8ff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 18, true, true);

    this.introSubtitle = this.add.text(width / 2, height / 2 + 16, 'bemutatja', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#c6d6ff'
    }).setOrigin(0.5);
    this.introSubtitle.setAlpha(0);
    this.introSubtitleTween = this.tweens.add({
      targets: this.introSubtitle,
      alpha: 1,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
      paused: true
    });
    this.activeTweens.push(this.introSubtitleTween);

    this.finished = false;
    this.playIntroSound();
    this.enableSkipOrUnlock();

    this.showOutbackTimer = this.registerTimer(this.time.delayedCall(5000, () => this.showOutbackTitle()));
    if (this.showOutbackTimer) this.showOutbackTimer.paused = true;
  }

  playIntroSound() {
    this.introSound = this.sound.get('introSound') || this.sound.add('introSound', {
      volume: 0.9
    });

    const startFlowAndPlay = () => {
      if (this.finished) return;
      this.startIntroFlow();
      if (this.introSound?.isPlaying) return;
      this.introSound?.play();
    };

    if (this.introSound) {
      this.introSound.once(Phaser.Sound.Events.PLAY, () => this.startIntroFlow());
    }

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, startFlowAndPlay);
    } else {
      startFlowAndPlay();
    }

    if (this.introSound) {
      this.introSound.once('complete', () => this.finishIntro());
    } else {
      this.startIntroFlow();
      this.registerTimer(this.time.delayedCall(1000, () => this.finishIntro()));
    }
  }

  startIntroFlow() {
    if (this.finished || this.introFlowStarted) return;
    this.introFlowStarted = true;
    this.skipReady = true;
    if (this.introSubtitleTween) {
      this.introSubtitleTween.restart();
      this.introSubtitleTween.play();
    }
    if (this.showOutbackTimer) this.showOutbackTimer.paused = false;
  }

  enableSkipOrUnlock() {
    this.handleInteraction = () => {
      if (this.finished) return;
      if (!this.skipReady || this.sound.locked || !this.introSound?.isPlaying) {
        if (this.sound?.context?.state === 'suspended') {
          this.sound.context.resume();
        }
        if (!this.introSound?.isPlaying) {
          this.introSound?.play();
        }
        return;
      }
      this.introSound?.stop();
      this.finishIntro();
    };

    this.input.keyboard.on('keydown-SPACE', this.handleInteraction);
    this.input.on('pointerdown', this.handleInteraction);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown-SPACE', this.handleInteraction);
      this.input.off('pointerdown', this.handleInteraction);
    });
  }

  showOutbackTitle() {
    if (this.finished) return;
    const fadeOut = this.tweens.add({
      targets: [this.introTitle, this.introSubtitle],
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onComplete: () => this.displayOutback()
    });
    this.activeTweens.push(fadeOut);
  }

  displayOutback() {
    const { width, height } = this.scale;
    this.outbackTitle = this.add.text(width / 2, height / 2 - 40, '', {
      fontFamily: 'Arial',
      fontSize: 96,
      fontStyle: 'bold',
      color: '#4cb6ff'
    }).setOrigin(0.5);
    this.outbackSubtitle = this.add.text(width / 2, height / 2 + 60, '', {
      fontFamily: 'Arial',
      fontSize: 52,
      color: '#4cb6ff'
    }).setOrigin(0.5);

    this.outbackTitle.setAlpha(0);
    this.outbackSubtitle.setAlpha(0);

    const titleTween = this.tweens.add({
      targets: this.outbackTitle,
      alpha: 1,
      duration: 1000,
      ease: 'Sine.easeInOut'
    });
    this.activeTweens.push(titleTween);

    this.typewriteText(this.outbackTitle, "BEHIND GOD'S BACK", 80, () => {
      const subTween = this.tweens.add({
        targets: this.outbackSubtitle,
        alpha: 1,
        duration: 800,
        ease: 'Sine.easeInOut'
      });
      this.activeTweens.push(subTween);
      this.typewriteText(this.outbackSubtitle, 'demo', 120);
    });

    this.registerTimer(this.time.delayedCall(10000, () => this.startCreditsSequence()));
  }

  startCreditsSequence() {
    if (this.finished || this.creditsStarted) return;
    this.creditsStarted = true;
    const toFade = [this.outbackTitle, this.outbackSubtitle].filter(Boolean);
    const fade = this.tweens.add({
      targets: toFade,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        toFade.forEach((t) => t?.destroy());
        this.showCreditName(0);
      }
    });
    this.activeTweens.push(fade);
  }

  showCreditName(index) {
    if (this.finished) return;
    const names = ['Bozzay Péter', 'Gamási Gergő', 'Hajnal Bálint', 'Mester Levente'];
    if (index >= names.length) return;
    const { width, height } = this.scale;
    if (this.creditText) this.creditText.destroy();
    this.creditText = this.add.text(width / 2, height / 2, names[index], {
      fontFamily: 'Arial',
      fontSize: 42,
      fontStyle: 'bold',
      color: '#4cb6ff'
    }).setOrigin(0.5);
    this.creditText.setAlpha(0);

    const fadeIn = this.tweens.add({
      targets: this.creditText,
      alpha: 1,
      duration: 700,
      ease: 'Sine.easeInOut'
    });
    this.activeTweens.push(fadeIn);

    this.registerTimer(this.time.delayedCall(5000, () => {
      if (this.finished) return;
      const fadeOut = this.tweens.add({
        targets: this.creditText,
        alpha: 0,
        duration: 700,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.creditText?.destroy();
          this.showCreditName(index + 1);
        }
      });
      this.activeTweens.push(fadeOut);
    }));
  }

  typewriteText(target, fullText, intervalMs, onComplete) {
    target.setText('');
    let index = 0;
    const timer = this.time.addEvent({
      delay: intervalMs,
      repeat: fullText.length - 1,
      callback: () => {
        if (this.finished) {
          timer.remove(false);
          return;
        }
        target.setText(fullText.slice(0, index + 1));
        index += 1;
        if (index >= fullText.length && onComplete) {
          onComplete();
        }
      }
    });
    this.registerTimer(timer);
  }

  registerTimer(timer) {
    if (!timer) return timer;
    this.activeTimers.push(timer);
    return timer;
  }

  clearTimersAndTweens() {
    this.activeTimers.forEach((t) => t?.remove(false));
    this.activeTimers = [];
    this.activeTweens.forEach((tw) => tw?.stop());
    this.activeTweens = [];
  }

  finishIntro() {
    if (this.finished) return;
    this.finished = true;
    window.__INTRO_SHOWN = true;
    this.introSound?.stop();
    this.clearTimersAndTweens();
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
