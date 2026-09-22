import { sound } from '@pixi/sound';
import { FetchError } from 'ofetch';

import { engine } from '../engine/getEngine';
import { useAuthStore } from '../zustandStores/auth';
import { api } from './api';

export const FEEDBACK_REQUEST_TYPES = ['issue', 'new_feature', 'content', 'other'] as const;
export type FeedbackRequestType = (typeof FEEDBACK_REQUEST_TYPES)[number];

export const FEEDBACK_REQUEST_TYPE_LABELS: Record<FeedbackRequestType, string> = {
  issue: 'Issue',
  new_feature: 'New feature',
  content: 'Content',
  other: 'Other',
};

export function isFeedbackHotkey(event: KeyboardEvent): boolean {
  const modifier = event.ctrlKey || event.metaKey;
  return modifier && event.shiftKey && !event.altKey && event.code === 'KeyF';
}

export function feedbackHotkeyLabel(): string {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return isMac ? '⌘⇧F' : 'Ctrl+Shift+F';
}

export function feedbackErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FetchError && typeof error.data?.detail === 'string') {
    return error.data.detail;
  }
  return error instanceof Error ? error.message : fallback;
}

const MAX_SCREENSHOT_EDGE = 1600;

function blankScreenshot(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function sourceSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  const sized = source as { width: number; height: number };
  return { width: Number(sized.width) || 0, height: Number(sized.height) || 0 };
}

/** Copy the current Pixi frame into a JPEG-sized canvas the player can draw on. */
export function captureGameScreenshot(): HTMLCanvasElement {
  const app = engine();
  let source: CanvasImageSource | null = null;

  try {
    if (app?.renderer && app.stage) {
      app.render();
      // Clip to the visible renderer screen. extract.canvas(stage) uses the
      // stage's local bounds, which include off-screen sprites (e.g. the camel
      // walking in from negative x).
      source = app.renderer.extract.canvas({
        target: app.stage,
        frame: app.renderer.screen.clone(),
      }) as CanvasImageSource;
    }
  } catch (error) {
    console.warn('[feedback] Could not extract the Pixi canvas', error);
  }

  if (!source && app?.canvas) {
    source = app.canvas;
  }
  if (!source) return blankScreenshot();

  const { width: srcWidth, height: srcHeight } = sourceSize(source);
  if (srcWidth < 1 || srcHeight < 1) return blankScreenshot();

  const scale = Math.min(1, MAX_SCREENSHOT_EDGE / Math.max(srcWidth, srcHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcWidth * scale));
  canvas.height = Math.max(1, Math.round(srcHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function currentGameScreenLabel(): string {
  try {
    const nav = engine().navigation;
    return [nav.currentScreen?.screenName, nav.currentPopup?.screenName]
      .filter(Boolean)
      .join(' / ');
  } catch {
    return '';
  }
}

let pauseDepth = 0;

export async function pauseGameForFeedback(): Promise<void> {
  pauseDepth += 1;
  if (pauseDepth !== 1) return;

  const app = engine();
  const target = app.navigation.currentPopup ?? app.navigation.currentScreen;
  if (target) {
    target.interactiveChildren = false;
    await target.pause?.();
  }
  if (app.ticker.started) {
    app.ticker.stop();
  }
  sound.pauseAll();
}

export async function resumeGameAfterFeedback(): Promise<void> {
  if (pauseDepth === 0) return;
  pauseDepth -= 1;
  if (pauseDepth !== 0) return;

  const app = engine();
  if (!app.ticker.started) {
    app.ticker.start();
  }
  sound.resumeAll();
  const target = app.navigation.currentPopup ?? app.navigation.currentScreen;
  if (target) {
    target.interactiveChildren = true;
    await target.resume?.();
  }
}

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the screenshot.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export function submitFeedback(input: {
  requestType: FeedbackRequestType;
  title: string;
  description: string;
  screen: string;
  image: Blob;
}) {
  const body = new FormData();
  body.append('request_type', input.requestType);
  body.append('title', input.title);
  body.append('description', input.description);
  body.append('screen', input.screen);
  body.append('image', input.image, 'screenshot.jpg');
  // Signed-in players use the authenticated route so an expired access token
  // 401s and the shared client refreshes it. The public route always stores a guest.
  const path = useAuthStore.getState().accessToken ? '/user/feedback' : '/feedback';
  return api(path, { method: 'POST', body });
}
