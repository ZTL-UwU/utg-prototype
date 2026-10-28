import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';

import App from './App';

declare global {
  interface Window {
    /** TEMP: startup breadcrumb, shown on screen in native builds. */
    __trace?: (label: string) => void;
  }
}

// // TEMP: native builds have no reachable console, so print startup steps and errors on screen.
if (Capacitor.isNativePlatform()) {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:50vh;overflow:auto;padding:8px;background:rgba(0,0,0,0.85);font:11px/1.3 monospace;white-space:pre-wrap;pointer-events:none';
  document.body.appendChild(panel);
  const start = performance.now();
  const line = (color: string, text: string) => {
    const row = document.createElement('div');
    row.style.color = color;
    row.textContent = `${((performance.now() - start) / 1000).toFixed(2)}s ${text}`;
    panel.appendChild(row);
    panel.scrollTop = panel.scrollHeight;
  };
  const describe = (value: unknown) =>
    value instanceof Error ? `${value.message}\n${value.stack}` : String(value);

  window.__trace = (label) => line('#8f8', label);
  window.addEventListener('error', (e) => line('#f88', `error: ${describe(e.error ?? e.message)}`));
  window.addEventListener('unhandledrejection', (e) =>
    line('#f88', `unhandledrejection: ${describe(e.reason)}`),
  );
  for (const level of ['error', 'warn'] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      original(...args);
      line(
        level === 'error' ? '#f88' : '#fd8',
        `console.${level}: ${args.map(describe).join(' ')}`,
      );
    };
  }
  window.__trace('main.tsx loaded');
}

// No Strict Mode because Pixi is not designed for double rendering
createRoot(document.getElementById('root')!).render(<App />);
