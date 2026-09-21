import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { Button, cn } from '../ui';

const DRAW_COLORS = ['#e23b2f', '#f5c518', '#111111', '#fbf4dd'] as const;

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };

export type ScreenshotAnnotatorHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

function pointerToCanvas(event: PointerEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;
  return {
    x: ((event.clientX - rect.left) / width) * canvas.width,
    y: ((event.clientY - rect.top) / height) * canvas.height,
  };
}

function paint(
  ctx: CanvasRenderingContext2D,
  screenshot: HTMLCanvasElement,
  strokes: Stroke[],
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(screenshot, 0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      ctx.beginPath();
      ctx.fillStyle = stroke.color;
      ctx.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
}

export const ScreenshotAnnotator = forwardRef<
  ScreenshotAnnotatorHandle,
  { screenshot: HTMLCanvasElement }
>(function ScreenshotAnnotator({ screenshot }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const colorRef = useRef<string>(DRAW_COLORS[0]);
  const [color, setColor] = useState<string>(DRAW_COLORS[0]);
  const [canUndo, setCanUndo] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    paint(ctx, screenshot, strokesRef.current);
  }, [screenshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = screenshot.width;
    canvas.height = screenshot.height;
    strokesRef.current = [];
    drawingRef.current = null;
    setCanUndo(false);
    redraw();
  }, [screenshot, redraw]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const strokeWidth = () => Math.max(6, screenshot.width / 260);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const stroke: Stroke = {
      color: colorRef.current,
      width: strokeWidth(),
      points: [pointerToCanvas(event.nativeEvent, canvas)],
    };
    drawingRef.current = stroke;
    strokesRef.current = [...strokesRef.current, stroke];
    setCanUndo(true);
    redraw();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const stroke = drawingRef.current;
    if (!canvas || !stroke) return;
    stroke.points.push(pointerToCanvas(event.nativeEvent, canvas));
    redraw();
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = null;
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setCanUndo(strokesRef.current.length > 0);
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    drawingRef.current = null;
    setCanUndo(false);
    redraw();
  };

  const screenshotWidth = Math.max(1, screenshot.width);
  const screenshotHeight = Math.max(1, screenshot.height);

  return (
    <div className="flex flex-col gap-2">
      <div className="mx-auto w-fit max-w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-ink shadow-[0_3px_0_0_var(--color-ink)]">
        <canvas
          ref={canvasRef}
          className="block h-auto w-auto max-h-[38vh] max-w-full cursor-crosshair touch-none select-none"
          style={{ aspectRatio: `${screenshotWidth} / ${screenshotHeight}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-body text-sm text-muted">Draw on the screenshot</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {DRAW_COLORS.map((value) => (
            <Button
              key={value}
              type="button"
              variant="icon"
              aria-label={`Draw in ${value}`}
              aria-pressed={color === value}
              className={cn(
                'size-8 border-[3px] border-ink',
                color === value && 'ring-4 ring-forest/40',
              )}
              style={{ backgroundColor: value }}
              onClick={() => {
                colorRef.current = value;
                setColor(value);
              }}
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            className="mx-0 w-auto px-3 py-1 text-sm"
            disabled={!canUndo}
            onClick={undo}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="mx-0 w-auto px-3 py-1 text-sm"
            disabled={!canUndo}
            onClick={clear}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
});
