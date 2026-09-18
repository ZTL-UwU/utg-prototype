import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, RefObject } from 'react';

const COLORS = [
  { label: 'Red', value: '#dc2626' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Blue', value: '#2563eb' },
];
const MAX_STROKES = 50;
const MAX_POINTS = 2048;
const BUTTON_CLASS =
  'min-h-9 rounded-pill border border-forest/30 px-3 py-1 text-sm font-semibold hover:bg-forest/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest/40 disabled:cursor-not-allowed disabled:opacity-50';

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const first = stroke.points[0];
  if (!first) return;
  context.fillStyle = stroke.color;
  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  if (stroke.points.length === 1) {
    context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.moveTo(first.x, first.y);
  for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
  context.stroke();
}

export function AnnotationCanvas({
  screenshot,
  canvasRef,
  disabled,
}: {
  screenshot: HTMLCanvasElement;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  disabled: boolean;
}) {
  const strokes = useRef<Stroke[]>([]);
  const active = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  const [color, setColor] = useState(COLORS[0]!.value);
  const [count, setCount] = useState(0);

  const finishStroke = useCallback(() => {
    const pointerId = active.current?.pointerId;
    active.current = null;
    const canvas = canvasRef.current;
    if (canvas && pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }, [canvasRef]);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (screenshot.width && screenshot.height) context.drawImage(screenshot, 0, 0);
    for (const stroke of strokes.current) drawStroke(context, stroke);
  }, [canvasRef, screenshot]);

  useLayoutEffect(() => {
    finishStroke();
    strokes.current = [];
    setCount(0);
    repaint();
    return finishStroke;
  }, [finishStroke, repaint]);

  useLayoutEffect(() => {
    if (disabled) finishStroke();
  }, [disabled, finishStroke]);

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point | null {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !canvas.width || !canvas.height) return null;
    return {
      x: Math.max(
        0,
        Math.min(canvas.width, ((event.clientX - bounds.left) / bounds.width) * canvas.width),
      ),
      y: Math.max(
        0,
        Math.min(canvas.height, ((event.clientY - bounds.top) / bounds.height) * canvas.height),
      ),
    };
  }

  function startStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (
      disabled ||
      active.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      strokes.current.length >= MAX_STROKES
    )
      return;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext('2d');
    if (!point || !context) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: Stroke = {
      color,
      width: (4 * event.currentTarget.width) / event.currentTarget.getBoundingClientRect().width,
      points: [point],
    };
    active.current = { pointerId: event.pointerId, stroke };
    strokes.current.push(stroke);
    setCount(strokes.current.length);
    drawStroke(context, stroke);
  }

  function extendStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || active.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext('2d');
    if (!point || !context) return;
    const stroke = active.current.stroke;
    const previous = stroke.points[stroke.points.length - 1]!;
    if (point.x === previous.x && point.y === previous.y) return;
    stroke.points.push(point);
    drawStroke(context, { ...stroke, points: [previous, point] });
    if (stroke.points.length >= MAX_POINTS) finishStroke();
  }

  function endStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current?.pointerId !== event.pointerId) return;
    if (event.type === 'pointerup') extendStroke(event);
    finishStroke();
  }

  function removeStrokes(clear: boolean) {
    if (disabled) return;
    finishStroke();
    if (clear) strokes.current = [];
    else strokes.current.pop();
    setCount(strokes.current.length);
    repaint();
  }

  return (
    <div className="min-w-0 space-y-3 bg-cream font-body text-ink">
      <fieldset disabled={disabled} className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Annotation tools</legend>
        <div role="group" aria-label="Pen color" className="flex flex-wrap gap-2">
          {COLORS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              aria-label={`${label} pen`}
              aria-pressed={color === value}
              onClick={() => {
                if (!disabled) setColor(value);
              }}
              className={`${BUTTON_CLASS} flex items-center gap-2 ${color === value ? 'border-forest bg-forest/10 ring-2 ring-forest' : ''}`}
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-ink/20"
                style={{ backgroundColor: value }}
              />
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={disabled || count === 0}
            onClick={() => removeStrokes(false)}
            className={BUTTON_CLASS}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={disabled || count === 0}
            onClick={() => removeStrokes(true)}
            className={BUTTON_CLASS}
          >
            Clear
          </button>
        </div>
      </fieldset>
      <canvas
        ref={canvasRef}
        width={screenshot.width}
        height={screenshot.height}
        role="img"
        aria-label="Screenshot annotation canvas"
        aria-disabled={disabled}
        tabIndex={0}
        className={`mx-auto block h-auto w-auto max-h-100 max-w-full object-contain touch-none select-none rounded-lg ring-1 ring-forest/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest/40 ${disabled || count >= MAX_STROKES ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        onPointerDown={startStroke}
        onPointerMove={extendStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onLostPointerCapture={endStroke}
      >
        Screenshot preview. Freehand annotations require a canvas-capable browser.
      </canvas>
    </div>
  );
}
