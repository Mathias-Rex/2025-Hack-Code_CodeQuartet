const PRESS_ANY_KEY_PULSE_MS = 900;
const PRESENTS_TEXT_TWEEN_MS = 1500;
const INTRO_BG_FADE_IN_MS = 2000;
const STUDIOS_TITLE_DELAY_MS = 600;
const STUDIOS_TITLE_FADE_MS = 700;
const CODE_QUARTET_FADE_OUT_MS = 1200;
const BACK_OF_BEYOND_FADE_IN_MS = 1000;
const DEMO_SUBTITLE_FADE_IN_MS = 800;
const CREDITS_SEQUENCE_FADE_OUT_MS = 900;
const CREDITS_NAME_FADE_IN_MS = 700;
const CREDITS_NAME_FADE_OUT_MS = 700;
const TRAILER_FADE_MS = 800;

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#02030a');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.introBg = this.add.image(width / 2, height / 2, 'introBg')
      .setDisplaySize(width, height)
      .setAlpha(0)
      .setDepth(-1);

    this.activeTimers = [];
    this.activeTweens = [];
    this.introFlowStarted = false;
    this.skipReady = false;
    this.waitingForStart = true;
    this.trailerFinished = !!window.__TRAILER_SHOWN__;
    this.trailerWasSkipped = false;
    this.trailerFaded = false;

    this.introTitle = this.add.text(width / 2, height / 2 - 40, 'Code Quartet Studios', {
      fontFamily: 'Arial',
      fontSize: 42,
      fontStyle: 'bold',
      color: '#7de8ff'
    }).setOrigin(0.5).setShadow(0, 0, '#00c2ff', 18, true, true);
    this.introTitle.setAlpha(0);

    this.introSubtitle = this.add.text(width / 2, height / 2 + 16, 'presents', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#c6d6ff'
    }).setOrigin(0.5);
    this.introSubtitle.setAlpha(0);
    this.introSubtitleTween = this.tweens.add({
      targets: this.introSubtitle,
      alpha: 1,
      duration: PRESENTS_TEXT_TWEEN_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
      paused: true
    });
    this.activeTweens.push(this.introSubtitleTween);

    this.startPrompt = this.add.text(width / 2, height - 80, 'Press any key to start', {
      fontFamily: 'Arial',
      fontSize: 24,
      color: '#9fd6ff'
    }).setOrigin(0.5);
    this.startPromptTween = this.tweens.add({
      targets: this.startPrompt,
      alpha: { from: 0.35, to: 1 },
      duration: PRESS_ANY_KEY_PULSE_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    this.activeTweens.push(this.startPromptTween);

    this.finished = false;
    this.setupIntroSound();
    this.setupTrailer();
    this.enableStartThenSkip();

    this.showOutbackTimer = this.registerTimer(this.time.delayedCall(5000, () => this.showOutbackTitle()));
    if (this.showOutbackTimer) this.showOutbackTimer.paused = true;
  }

  setupTrailer() {
    if (window.__TRAILER_SHOWN__) return;
    const { width, height } = this.scale;

    const size = Math.min(width, height) / 2;
    this.trailer = this.add.video(width / 2, height / 2, 'trailerVideo')
      .setDisplaySize(size, size)
      .setDepth(-2)
      .setAlpha(0);

    this.trailer.once('play', () => {
      this.loadingText?.setVisible(false);
      this.trailer.setAlpha(1);
    });

    this.trailer.once('complete', () => {
      if (this.trailerFinished) return;
      this.trailerFinished = true;
      this.fadeTrailerToBlack(false);
      this.startPromptTween?.restart();
      this.startPromptTween?.play();
    });

    // start playback immediately
    this.trailer.play(false);
  }

  setupIntroSound() {
    this.introSound = this.sound.get('introSound') || this.sound.add('introSound', {
      volume: 0.9
    });

    this.forceResumeAndPlay = () => {
      if (this.finished) return false;
      try {
        if (this.sound?.context?.state === 'suspended') {
          this.sound.context.resume().catch(() => {});
        }
        if (!this.introSound?.isPlaying) {
          this.introSound?.play();
        }
        return !!this.introSound?.isPlaying;
      } catch (e) {
        return false;
      }
    };

    if (this.introSound) {
      this.introSound.once('complete', () => this.finishIntro());
    } else {
      this.startIntroFlow();
      this.registerTimer(this.time.delayedCall(1000, () => this.finishIntro()));
    }
  }

  startIntroPlayback() {
    if (this.finished) return;
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.forceResumeAndPlay());
      this.forceResumeAndPlay();
    } else {
      this.forceResumeAndPlay();
    }

    if (!this.audioRetryTimer || this.audioRetryTimer.hasDispatched) {
      // Retry a few times after user interaction in case play was still blocked.
      this.audioRetryTimer = this.registerTimer(this.time.addEvent({
        delay: 500,
        repeat: 6,
        callback: () => {
          if (this.finished || this.waitingForStart || this.introSound?.isPlaying) {
            this.audioRetryTimer?.remove(false);
            return;
          }
          this.forceResumeAndPlay();
        }
      }));
    }
  }

  startIntroFlow() {
    if (this.finished || this.introFlowStarted) return;
    this.introFlowStarted = true;
    this.skipReady = true;
    const titleFade = this.tweens.add({
      targets: this.introTitle,
      alpha: 1,
      duration: STUDIOS_TITLE_FADE_MS,
      ease: 'Sine.easeOut'
    });
    this.activeTweens.push(titleFade);
    if (this.introSubtitleTween) {
      this.introSubtitleTween.restart();
      this.introSubtitleTween.play();
    }
    if (this.showOutbackTimer) this.showOutbackTimer.paused = false;
  }

  enableStartThenSkip() {
    this.startHandler = () => {
      if (this.finished || !this.waitingForStart) return;
      if (!this.trailerFinished) {
        this.trailerWasSkipped = true;
        this.fadeTrailerToBlack(true);
        return;
      }
      this.beginIntroSequence();
    };

    this.skipHandler = () => {
      if (this.finished || this.waitingForStart) return;
      if (!this.skipReady || this.sound.locked || !this.introSound?.isPlaying) {
        this.startIntroPlayback();
        return;
      }
      this.introSound?.stop();
      this.finishIntro();
    };

    this.input.keyboard.on('keydown', this.startHandler);
    this.input.keyboard.on('keydown-SPACE', this.skipHandler);
    this.input.on('pointerdown', this.startHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown', this.startHandler);
      this.input.keyboard.off('keydown-SPACE', this.skipHandler);
      this.input.off('pointerdown', this.startHandler);
    });
  }

  beginIntroSequence() {
    if (this.finished || !this.waitingForStart) return;
    this.waitingForStart = false;
    this.cameras.main.fadeIn(TRAILER_FADE_MS, 0, 0, 0);
    if (this.startPromptTween) this.startPromptTween.stop();
    this.startPrompt?.destroy();
    const bgFade = this.tweens.add({
      targets: this.introBg,
      alpha: 0.35,
      duration: INTRO_BG_FADE_IN_MS,
      ease: 'Sine.easeOut',
      onComplete: () => {
        const pauseBeforeTitle = this.registerTimer(this.time.delayedCall(STUDIOS_TITLE_DELAY_MS, () => {
          this.startIntroFlow();
          this.startIntroPlayback();
        }));
        if (pauseBeforeTitle) this.activeTimers.push(pauseBeforeTitle);
      }
    });
    this.activeTweens.push(bgFade);
  }

  fadeTrailerToBlack(startIntroAfterFade) {
    if (this.trailerFaded) return;
    this.trailerFaded = true;
    if (this.trailer) {
      if (this.trailer.isPlaying()) this.trailer.stop();
      this.trailer.setVisible(false).setAlpha(0);
      this.trailer.destroy();
      this.trailer = null;
    }
    window.__TRAILER_SHOWN__ = true;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (startIntroAfterFade) {
        this.beginIntroSequence();
      }
    });
    this.cameras.main.fadeOut(TRAILER_FADE_MS, 0, 0, 0);
  }

  showOutbackTitle() {
    if (this.finished) return;
    const fadeOut = this.tweens.add({
      targets: [this.introTitle, this.introSubtitle],
      alpha: 0,
      duration: CODE_QUARTET_FADE_OUT_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.displayOutback()
    });
    this.activeTweens.push(fadeOut);
  }

  displayOutback() {
    const { width, height } = this.scale;
    this.outbackTitle = this.add.text(width / 2, height / 2 - 60, '', {
      fontFamily: 'Arial',
      fontSize: 98,
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
      duration: BACK_OF_BEYOND_FADE_IN_MS,
      ease: 'Sine.easeInOut'
    });
    this.activeTweens.push(titleTween);

    this.typewriteText(this.outbackTitle, 'The Back of Beyond', 80, () => {
      const subTween = this.tweens.add({
        targets: this.outbackSubtitle,
        alpha: 1,
        duration: DEMO_SUBTITLE_FADE_IN_MS,
        ease: 'Sine.easeInOut'
      });
      this.activeTweens.push(subTween);
      this.typewriteText(this.outbackSubtitle, '', 120);
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
      duration: CREDITS_SEQUENCE_FADE_OUT_MS,
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
      duration: CREDITS_NAME_FADE_IN_MS,
      ease: 'Sine.easeInOut'
    });
    this.activeTweens.push(fadeIn);

    this.registerTimer(this.time.delayedCall(5000, () => {
      if (this.finished) return;
      const fadeOut = this.tweens.add({
        targets: this.creditText,
        alpha: 0,
        duration: CREDITS_NAME_FADE_OUT_MS,
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
    const target = window.__DEBUG__ ? 'Game' : 'Menu';
    this.fadeToScene(target);
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
