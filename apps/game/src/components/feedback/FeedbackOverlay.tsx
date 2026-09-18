import { useEffect, useRef, useState } from 'react';

import { engine } from '../../engine/getEngine';
import {
  encodeFeedbackImage,
  FEEDBACK_REQUEST_TYPE_LABELS,
  FEEDBACK_REQUEST_TYPES,
  submitFeedbackDemo,
  type FeedbackReceipt,
  type FeedbackRequestType,
} from '../../lib/feedback';
import { CloseButton } from '../ui/CloseButton';
import { PrimaryButton } from '../ui/PrimaryButton';
import { AnnotationCanvas } from './AnnotationCanvas';

const FIELD_CLASS =
  'w-full rounded-xl border-2 border-ink bg-white/70 p-3 outline-none focus:ring-4 focus:ring-forest/30 disabled:opacity-60';

export function FeedbackOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const activeRef = useRef(false);
  const sessionRef = useRef(0);
  const releaseRef = useRef<(() => Promise<void>) | null>(null);
  const closeRef = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<HTMLCanvasElement | null>(null);
  const [requestType, setRequestType] = useState<FeedbackRequestType>('issue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!receipt) return;
    const url = URL.createObjectURL(receipt.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    let previousFocus: HTMLElement | null = null;

    const close = () => {
      generation++;
      activeRef.current = false;
      sessionRef.current++;
      dialogRef.current?.close();
      setOpen(false);
      setScreenshot(null);
      setReceipt(null);
      setImageUrl('');
      const release = releaseRef.current;
      releaseRef.current = null;
      if (release)
        void release().catch(() => setError('Could not resume the game. Please reload.'));
      previousFocus?.focus();
    };
    closeRef.current = close;

    const launch = async () => {
      const app = engine();
      if (!app.renderer || !app.navigation?.currentScreen || activeRef.current) return;
      const currentGeneration = ++generation;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      activeRef.current = true;
      setOpen(true);
      setRequestType('issue');
      setTitle('');
      setDescription('');
      setError('');
      setSending(false);
      dialogRef.current?.showModal();
      try {
        const release = await app.navigation.suspendForFeedback();
        if (!mounted || currentGeneration !== generation) {
          await release();
          return;
        }
        releaseRef.current = release;
        app.render();
        const source = app.canvas;
        const capture = document.createElement('canvas');
        const scale = Math.min(1, 1920 / Math.max(source.width, source.height));
        capture.width = Math.max(1, Math.round(source.width * scale));
        capture.height = Math.max(1, Math.round(source.height * scale));
        const context = capture.getContext('2d');
        if (!context) throw new Error('Could not capture the game canvas.');
        context.drawImage(source, 0, 0, capture.width, capture.height);
        await encodeFeedbackImage(capture);
        if (!mounted || currentGeneration !== generation) return;
        setScreenshot(capture);
        typeRef.current?.focus();
      } catch {
        if (mounted && currentGeneration === generation) {
          setError('Could not capture the game. Close this window and try again.');
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.code === 'KeyF';
      if (activeRef.current) {
        event.stopImmediatePropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        } else if (shortcut) {
          event.preventDefault();
        }
        return;
      }
      if (!shortcut || event.repeat || event.isComposing) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void launch();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (activeRef.current) event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      mounted = false;
      generation++;
      activeRef.current = false;
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      dialogRef.current?.close();
      const release = releaseRef.current;
      releaseRef.current = null;
      if (release) void release().catch(() => {});
    };
  }, []);

  const send = async () => {
    if (!canvasRef.current || !description.trim() || sending) return;
    const session = sessionRef.current;
    setSending(true);
    setError('');
    try {
      const image = await encodeFeedbackImage(canvasRef.current);
      const result = await submitFeedbackDemo({
        type: requestType,
        title,
        description,
        image,
      });
      if (activeRef.current && sessionRef.current === session) setReceipt(result);
    } catch {
      if (activeRef.current && sessionRef.current === session)
        setError('Could not prepare feedback. Your drawing is still here; please try again.');
    } finally {
      if (activeRef.current && sessionRef.current === session) setSending(false);
    }
  };

  return (
    <>
      <span className="pointer-events-none fixed right-3 bottom-3 z-20 rounded-full bg-ink/80 px-3 py-1.5 font-body text-xs text-white">
        Feedback: Ctrl / ⌘ + Shift + F
      </span>
      <dialog
        ref={dialogRef}
        aria-labelledby="feedback-title"
        aria-describedby="feedback-help"
        onCancel={(event) => {
          event.preventDefault();
          closeRef.current();
        }}
        className="fixed inset-0 m-auto max-h-[94dvh] w-[min(960px,94vw)] overflow-y-auto rounded-3xl border-2 border-ink bg-cream p-5 font-body text-ink shadow-2xl backdrop:bg-black/65 md:p-7"
      >
        {open && (
          <>
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h1 id="feedback-title" className="font-display text-3xl font-semibold">
                  Share feedback
                </h1>
                <p id="feedback-help" className="mt-2 text-sm">
                  Report an issue or suggest an improvement. You can attach a screenshot to help us
                  understand.
                </p>
              </div>
              <CloseButton
                onClick={() => closeRef.current()}
                aria-label="Close feedback and resume"
              />
            </header>
            {receipt ? (
              <section className="space-y-4" aria-live="polite">
                <h2 className="font-display text-2xl text-forest">Demo upload received</h2>
                <p className="text-sm">
                  The local receiver decoded a multipart POST containing your request type, title,
                  description, and annotated PNG. Nothing was sent to a server or saved.
                </p>
                <dl className="grid gap-2 rounded-xl border border-forest/30 bg-white/60 p-4 text-sm">
                  <dt className="font-bold">type</dt>
                  <dd>{FEEDBACK_REQUEST_TYPE_LABELS[receipt.type]}</dd>
                  <dt className="font-bold">title</dt>
                  <dd>{receipt.title || '—'}</dd>
                  <dt className="font-bold">description</dt>
                  <dd className="max-h-28 overflow-auto whitespace-pre-wrap break-words">
                    {receipt.description}
                  </dd>
                  <dt className="font-bold">image</dt>
                  <dd>
                    {receipt.image.name} · {receipt.image.type} ·{' '}
                    {Math.ceil(receipt.image.size / 1024)} KB
                  </dd>
                  <dt className="font-bold">Multipart request size</dt>
                  <dd>{receipt.requestBytes.toLocaleString()} bytes</dd>
                </dl>
                {imageUrl && (
                  <a
                    href={imageUrl}
                    download="feedback.png"
                    className="inline-block font-bold text-forest underline"
                  >
                    Download submitted PNG
                  </a>
                )}
                <PrimaryButton className="block" onClick={() => closeRef.current()}>
                  Done — resume game
                </PrimaryButton>
              </section>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
                className="space-y-4"
              >
                <label className="mb-2 block text-sm font-bold">Screenshot</label>
                {screenshot ? (
                  <AnnotationCanvas
                    screenshot={screenshot}
                    canvasRef={canvasRef}
                    disabled={sending}
                  />
                ) : (
                  !error && <p role="status">Pausing game and capturing screenshot…</p>
                )}
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="feedback-type">
                    Type of request
                  </label>
                  <select
                    ref={typeRef}
                    id="feedback-type"
                    required
                    value={requestType}
                    disabled={sending}
                    onChange={(event) => setRequestType(event.target.value as FeedbackRequestType)}
                    className={FIELD_CLASS}
                  >
                    {FEEDBACK_REQUEST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {FEEDBACK_REQUEST_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="feedback-subject">
                    Title
                  </label>
                  <input
                    id="feedback-subject"
                    type="text"
                    maxLength={200}
                    value={title}
                    disabled={sending}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Short title (optional)"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="feedback-description">
                    Description
                  </label>
                  <textarea
                    id="feedback-description"
                    required
                    maxLength={5000}
                    rows={3}
                    value={description}
                    disabled={sending}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What went wrong, or what could be better?"
                    className={`${FIELD_CLASS} resize-y`}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-alert">
                    {error}
                  </p>
                )}
                <footer className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <PrimaryButton
                    type="submit"
                    disabled={!screenshot || !description.trim() || sending}
                    className="mx-0 w-auto px-7 py-3 text-lg"
                  >
                    {sending ? 'Preparing…' : 'Send feedback'}
                  </PrimaryButton>
                </footer>
              </form>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
