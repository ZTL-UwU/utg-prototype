import { useEffect, useRef, useState } from 'react';

import { engine } from '../../engine/getEngine';
import { encodeFeedbackImage, submitFeedbackDemo, type FeedbackReceipt } from '../../lib/feedback';
import { CloseButton } from '../ui/CloseButton';
import { PrimaryButton } from '../ui/PrimaryButton';
import { AnnotationCanvas } from './AnnotationCanvas';

export function FeedbackOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const activeRef = useRef(false);
  const sessionRef = useRef(0);
  const releaseRef = useRef<(() => Promise<void>) | null>(null);
  const closeRef = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<HTMLCanvasElement | null>(null);
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
        descriptionRef.current?.focus();
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
      const result = await submitFeedbackDemo(description, image);
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
                <p className="mb-1 text-xs font-bold tracking-widest text-forest uppercase">
                  Game paused · Frontend demo
                </p>
                <h1 id="feedback-title" className="font-display text-3xl font-semibold">
                  Share feedback
                </h1>
                <p id="feedback-help" className="mt-2 text-sm">
                  Describe what happened and mark the screenshot. Only the game canvas is captured.
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
                  The local receiver decoded a multipart POST containing your description and
                  annotated PNG. Nothing was sent to a server or saved.
                </p>
                <dl className="grid gap-2 rounded-xl border border-forest/30 bg-white/60 p-4 text-sm">
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
                <label className="block text-sm font-bold" htmlFor="feedback-description">
                  Description
                </label>
                <textarea
                  ref={descriptionRef}
                  id="feedback-description"
                  required
                  maxLength={5000}
                  rows={3}
                  value={description}
                  disabled={sending}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What went wrong, or what could be better?"
                  className="w-full resize-y rounded-xl border-2 border-ink bg-white/70 p-3 outline-none focus:ring-4 focus:ring-forest/30 disabled:opacity-60"
                />
                {screenshot ? (
                  <AnnotationCanvas
                    screenshot={screenshot}
                    canvasRef={canvasRef}
                    disabled={sending}
                  />
                ) : (
                  !error && <p role="status">Pausing game and capturing screenshot…</p>
                )}
                {error && (
                  <p role="alert" className="text-sm text-alert">
                    {error}
                  </p>
                )}
                <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-4">
                  <p className="max-w-sm text-xs">
                    Demo only: Send prepares and reads a real multipart payload locally. No network
                    request is made.
                  </p>
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
