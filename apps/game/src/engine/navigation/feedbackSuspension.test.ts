import { sound } from '@pixi/sound';
import { Container } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { CreationEngine } from '../engine';
import { Navigation } from './navigation';

vi.mock('pixi.js', () => {
  class Container {
    parent?: Container;
    children: Container[] = [];
    interactiveChildren = true;
    eventMode = 'auto';
    destroyed = false;

    addChild(child: Container) {
      child.parent?.removeChild(child);
      this.children.push(child);
      child.parent = this;
      return child;
    }

    removeChild(child: Container) {
      this.children = this.children.filter((item) => item !== child);
      child.parent = undefined;
      return child;
    }
  }

  return {
    Container,
    Application: class {},
    extensions: { add: vi.fn(), remove: vi.fn() },
    ResizePlugin: {},
    BigPool: { get: (ctor: new () => Container) => new ctor() },
    Assets: { loadBundle: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock('@pixi/devtools', () => ({ initDevtools: vi.fn() }));
vi.mock('@pixi/layout/devtools', () => ({}));
vi.mock('pixi.js/app', () => ({}));
vi.mock('../audio/AudioPlugin', () => ({ CreationAudioPlugin: {} }));
vi.mock('./NavigationPlugin', () => ({ CreationNavigationPlugin: {} }));
vi.mock('../resize/ResizePlugin', () => ({ CreationResizePlugin: {} }));
vi.mock('@pixi/sound', () => {
  const context = { paused: false };
  return {
    sound: {
      context,
      disableAutoPause: false,
      pauseAll: vi.fn(() => {
        context.paused = true;
      }),
      resumeAll: vi.fn(() => {
        context.paused = false;
      }),
    },
  };
});

vi.mock('../../zustandStores/courseStore', () => ({
  ensureMascotsReady: vi.fn(),
  REMOTE_MASCOTS_BUNDLE: 'mascots',
}));
vi.mock('../../zustandStores/rewardStore', () => ({
  ensureRewardsReady: vi.fn(),
  REMOTE_REWARDS_BUNDLE: 'rewards',
}));
vi.mock('../../zustandStores/sentenceStore', () => ({
  ensureSentencesReady: vi.fn(),
  REMOTE_SENTENCES_BUNDLE: 'sentences',
}));
vi.mock('../../zustandStores/wordStore', () => ({
  ensureWordsReady: vi.fn(),
  REMOTE_WORDS_BUNDLE: 'words',
}));

class Screen extends Container {
  pause = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
  show = vi.fn().mockResolvedValue(undefined);
  hide = vi.fn().mockResolvedValue(undefined);
}

function setup(started = true) {
  const navigation = new Navigation();
  const ticker = {
    started,
    start: vi.fn(() => {
      ticker.started = true;
    }),
    stop: vi.fn(() => {
      ticker.started = false;
    }),
    add: vi.fn(),
    remove: vi.fn(),
  };
  const stage = new Container();
  const restoreAudio = vi.fn();
  const suspendAudioForFeedback = vi.fn(() => restoreAudio);
  navigation.init({ stage, ticker, suspendAudioForFeedback } as unknown as CreationEngine);
  return { navigation, ticker, stage, suspendAudioForFeedback, restoreAudio };
}

describe('feedback suspension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores ticker and stage state and releases only once', async () => {
    const { navigation, ticker, stage, restoreAudio } = setup();
    const screen = new Screen();
    navigation.currentScreen = screen;
    stage.eventMode = 'static';
    const release = await navigation.suspendForFeedback();
    expect(ticker.started).toBe(false);
    expect(stage.eventMode).toBe('none');
    expect(stage.interactiveChildren).toBe(false);
    expect(screen.pause).toHaveBeenCalledOnce();
    await Promise.all([release(), release()]);
    expect(screen.resume).toHaveBeenCalledOnce();
    expect(ticker.start).toHaveBeenCalledOnce();
    expect(stage.eventMode).toBe('static');
    expect(stage.interactiveChildren).toBe(true);
    expect(restoreAudio).toHaveBeenCalledOnce();
  });

  it('does not start a previously stopped ticker or enable disabled interaction', async () => {
    const { navigation, ticker, stage } = setup(false);
    stage.interactiveChildren = false;
    stage.eventMode = 'none';
    await (
      await navigation.suspendForFeedback()
    )();
    expect(ticker.start).not.toHaveBeenCalled();
    expect(stage.interactiveChildren).toBe(false);
    expect(stage.eventMode).toBe('none');
  });

  it('pauses and resumes only the active popup', async () => {
    const { navigation } = setup();
    const screen = new Screen();
    const popup = new Screen();
    navigation.currentScreen = screen;
    navigation.currentPopup = popup;
    await (
      await navigation.suspendForFeedback()
    )();
    expect(popup.pause).toHaveBeenCalledOnce();
    expect(popup.resume).toHaveBeenCalledOnce();
    expect(screen.pause).not.toHaveBeenCalled();
    expect(screen.resume).not.toHaveBeenCalled();
  });

  it('blocks popup dismissal and screen changes until release', async () => {
    const { navigation } = setup();
    await navigation.showScreen(Screen);
    await navigation.showPopup(Screen);
    const popup = navigation.currentPopup as Screen;
    const screen = navigation.currentScreen as Screen;
    const release = await navigation.suspendForFeedback();
    const closed = vi.fn();
    const changed = vi.fn();
    const close = navigation.hidePopup().then(closed);
    const change = navigation.showScreen(Screen).then(changed);
    await Promise.resolve();
    await Promise.resolve();
    expect(closed).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(navigation.currentPopup).toBe(popup);
    expect(navigation.currentScreen).toBe(screen);
    await release();
    await Promise.all([close, change]);
    expect(popup.resume).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledOnce();
  });

  it('blocks nested popup creation and leaves the underlying screen paused', async () => {
    const { navigation } = setup();
    await navigation.showScreen(Screen);
    await navigation.showPopup(Screen);
    const screen = navigation.currentScreen as Screen;
    const parent = navigation.currentPopup as Screen;
    const release = await navigation.suspendForFeedback();
    const opened = vi.fn();
    const opening = navigation.showNestedPopup(Screen).then(opened);
    await Promise.resolve();
    expect(opened).not.toHaveBeenCalled();
    expect(navigation.currentPopup).toBe(parent);
    await release();
    await opening;
    await navigation.hidePopup();
    expect(navigation.currentPopup).toBe(parent);
    expect(screen.resume).not.toHaveBeenCalled();
  });

  it('does not restart a destroyed stage', async () => {
    const { navigation, ticker, stage } = setup();
    const screen = new Screen();
    navigation.currentScreen = screen;
    const release = await navigation.suspendForFeedback();
    Object.assign(stage, { destroyed: true });
    await release();
    expect(ticker.start).not.toHaveBeenCalled();
    expect(screen.resume).not.toHaveBeenCalled();
  });

  it('holds suspension until every concurrent caller releases', async () => {
    const { navigation, ticker } = setup();
    const screen = new Screen();
    navigation.currentScreen = screen;
    const [first, second] = await Promise.all([
      navigation.suspendForFeedback(),
      navigation.suspendForFeedback(),
    ]);
    await first();
    expect(ticker.started).toBe(false);
    await second();
    expect(screen.pause).toHaveBeenCalledOnce();
    expect(screen.resume).toHaveBeenCalledOnce();
  });

  it('restores resources after pause or resume rejects', async () => {
    const { navigation, ticker, stage } = setup();
    const screen = new Screen();
    navigation.currentScreen = screen;
    screen.pause.mockRejectedValueOnce(new Error('pause'));
    await expect(navigation.suspendForFeedback()).rejects.toThrow('pause');
    expect(ticker.started).toBe(true);
    expect(stage.interactiveChildren).toBe(true);
    const release = await navigation.suspendForFeedback();
    screen.resume.mockRejectedValueOnce(new Error('resume'));
    await expect(release()).rejects.toThrow('resume');
    expect(ticker.started).toBe(true);
    await navigation.showScreen(Screen);
  });

  it('does not resume a replaced target', async () => {
    const { navigation } = setup();
    const screen = new Screen();
    navigation.currentScreen = screen;
    const release = await navigation.suspendForFeedback();
    const replacement = new Screen();
    navigation.currentScreen = replacement;
    await release();
    expect(screen.resume).not.toHaveBeenCalled();
    expect(replacement.resume).not.toHaveBeenCalled();
  });

  it('waits for in-flight show and nested navigation before stopping the ticker', async () => {
    const { navigation, ticker } = setup();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    class TransitionScreen extends Screen {
      show = vi.fn(async () => {
        await pending;
        await navigation.showPopup(Screen);
      });
    }
    const change = navigation.showScreen(TransitionScreen);
    await Promise.resolve();
    const acquired = vi.fn();
    const suspension = navigation.suspendForFeedback().then((release) => {
      acquired();
      return release;
    });
    await Promise.resolve();
    expect(ticker.started).toBe(true);
    expect(acquired).not.toHaveBeenCalled();
    finish();
    await change;
    const release = await suspension;
    expect(ticker.started).toBe(false);
    const popup = navigation.currentPopup as Screen;
    expect(popup.pause).toHaveBeenCalledOnce();
    await release();
    expect(popup.resume).toHaveBeenCalledOnce();
  });

  it('keeps only the last screen after overlapping changes with a popup open', async () => {
    const { navigation } = setup();
    await navigation.showScreen(Screen);
    await navigation.showPopup(Screen);
    const popup = navigation.currentPopup;
    class First extends Screen {}
    class Last extends Screen {}

    await Promise.all([navigation.showScreen(First), navigation.showScreen(Last)]);

    expect(navigation.currentScreen).toBeInstanceOf(Last);
    expect(navigation.currentPopup).toBe(popup);
    expect(navigation.container.children).toEqual([popup, navigation.currentScreen]);
  });
});

describe('feedback audio and visibility', () => {
  class TestEngine extends CreationEngine {
    visibilityChanged() {
      this.visibilityChange();
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', { hidden: false });
    sound.context.paused = false;
    sound.disableAutoPause = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setupEngine() {
    const { navigation, ticker, stage } = setup();
    const app = new TestEngine();
    Object.assign(app, { stage, ticker, navigation });
    navigation.init(app);
    return { app, navigation, ticker, stage };
  }

  it('does not resume audio or focus a screen when returning to feedback', async () => {
    const { app, navigation } = setupEngine();
    const screen = Object.assign(new Screen(), { focus: vi.fn(), blur: vi.fn() });
    navigation.currentScreen = screen;
    const release = await navigation.suspendForFeedback();
    expect(sound.context.paused).toBe(true);
    expect(sound.disableAutoPause).toBe(true);
    vi.stubGlobal('document', { hidden: true });
    app.visibilityChanged();
    vi.stubGlobal('document', { hidden: false });
    app.visibilityChanged();
    expect(sound.context.paused).toBe(true);
    expect(screen.focus).not.toHaveBeenCalled();
    await release();
    expect(sound.context.paused).toBe(false);
    expect(sound.disableAutoPause).toBe(false);
    expect(screen.focus).toHaveBeenCalledOnce();
  });

  it('keeps audio paused on hidden release until visibility returns', async () => {
    const { app, navigation } = setupEngine();
    const release = await navigation.suspendForFeedback();
    vi.stubGlobal('document', { hidden: true });
    app.visibilityChanged();
    await release();
    expect(sound.context.paused).toBe(true);
    vi.stubGlobal('document', { hidden: false });
    app.visibilityChanged();
    expect(sound.context.paused).toBe(false);
  });

  it('preserves already-paused audio across feedback and visibility changes', async () => {
    const { app, navigation } = setupEngine();
    sound.context.paused = true;
    sound.disableAutoPause = true;
    const release = await navigation.suspendForFeedback();
    vi.stubGlobal('document', { hidden: true });
    app.visibilityChanged();
    await release();
    vi.stubGlobal('document', { hidden: false });
    app.visibilityChanged();
    expect(sound.context.paused).toBe(true);
    expect(sound.disableAutoPause).toBe(true);
  });
});
