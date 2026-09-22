import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { engine } from '../../engine/getEngine';
import {
  canvasToJpegBlob,
  captureGameScreenshot,
  currentGameScreenLabel,
  FEEDBACK_REQUEST_TYPE_LABELS,
  FEEDBACK_REQUEST_TYPES,
  feedbackErrorMessage,
  feedbackHotkeyLabel,
  feedbackImageError,
  type FeedbackRequestType,
  MAX_FEEDBACK_UPLOADS,
  pauseGameForFeedback,
  resumeGameAfterFeedback,
  submitFeedback,
} from '../../lib/feedback';
import { useFeedbackStore } from '../../zustandStores/feedbackStore';
import {
  Button,
  CloseButton,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  Field,
  FieldLabel,
  FormError,
  Textarea,
} from '../ui';
import { ScreenshotAnnotator, type ScreenshotAnnotatorHandle } from './ScreenshotAnnotator';

type FeedbackUpload = {
  id: string;
  file: File;
  url: string;
};

export function FeedbackOverlay({ screenshot }: { screenshot: HTMLCanvasElement }) {
  const annotatorRef = useRef<ScreenshotAnnotatorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<FeedbackUpload[]>([]);
  const [requestType, setRequestType] = useState<FeedbackRequestType>('issue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [uploads, setUploads] = useState<FeedbackUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  uploadsRef.current = uploads;

  useEffect(() => {
    return () => {
      for (const upload of uploadsRef.current) {
        URL.revokeObjectURL(upload.url);
      }
    };
  }, []);

  const removeUpload = (id: string) => {
    setUploads((current) => {
      const removed = current.find((upload) => upload.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((upload) => upload.id !== id);
    });
    setError((current) => (current === 'You can attach up to 3 images.' ? null : current));
  };

  const addUploads = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next = [...uploads];
    let message: string | null = null;
    for (const file of fileList) {
      if (next.length >= MAX_FEEDBACK_UPLOADS) {
        message = 'You can attach up to 3 images.';
        break;
      }
      const fileError = feedbackImageError(file);
      if (fileError) {
        message = fileError;
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setUploads(next);
    setError(message);
  };

  const send = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error('Please add a title.');
      }
      const trimmedDescription = description.trim();
      if (!trimmedDescription) {
        throw new Error('Please add a description.');
      }
      let image: Blob | null = null;
      if (includeScreenshot) {
        const canvas = annotatorRef.current?.getCanvas();
        if (!canvas) {
          throw new Error('Screenshot is not ready.');
        }
        image = await canvasToJpegBlob(canvas);
      }
      return submitFeedback({
        requestType,
        title: trimmedTitle,
        description: trimmedDescription,
        screen: currentGameScreenLabel(),
        screenshot: image,
        images: uploads.map((upload) => upload.file),
      });
    },
    onSuccess: () => {
      setError(null);
      setSent(true);
    },
    onError: (sendError) => {
      setError(feedbackErrorMessage(sendError, 'Could not send feedback.'));
    },
  });

  useEffect(() => {
    if (!sent) return;
    const timeout = window.setTimeout(() => {
      void closeFeedback();
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [sent]);

  const busy = send.isPending || sent;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !send.isPending) void closeFeedback();
      }}
    >
      <DialogPopup
        className={
          sent
            ? 'min-h-0 max-w-lg items-center justify-center gap-3 px-8 pt-14 pb-10'
            : 'max-w-3xl justify-start overflow-hidden'
        }
      >
        <CloseButton className="absolute top-4 left-4" disabled={send.isPending} />

        {sent ? (
          <>
            <DialogTitle>Sent. Thank you!</DialogTitle>
            <DialogDescription>You can keep playing.</DialogDescription>
          </>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1.5 pt-1 pb-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) send.mutate();
            }}
          >
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>{feedbackHotkeyLabel()} opens this from anywhere.</DialogDescription>

            <div className="flex flex-col gap-2">
              <div className={includeScreenshot ? undefined : 'hidden'}>
                <ScreenshotAnnotator ref={annotatorRef} screenshot={screenshot} />
              </div>
              {includeScreenshot ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    disabled={busy}
                    className="self-end"
                    onClick={() => setIncludeScreenshot(false)}
                  >
                    Don't include screenshot
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-dashed border-ink/30 px-4 py-3">
                  <p className="font-body text-sm text-muted">Screenshot left out</p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    className="mx-0 w-auto px-3 py-1 text-sm"
                    onClick={() => setIncludeScreenshot(true)}
                  >
                    Include screenshot
                  </Button>
                </div>
              )}
            </div>

            <Field>
              <FieldLabel>
                Additional Images{' '}
                <span className="font-normal text-muted">(optional, up to 3)</span>
              </FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                {uploads.map((upload, index) => (
                  <div key={upload.id} className="relative">
                    <img
                      src={upload.url}
                      alt=""
                      className="size-20 rounded-xl border-[3px] border-ink object-cover"
                    />
                    <Button
                      type="button"
                      variant="icon"
                      disabled={busy}
                      aria-label={`Remove image ${index + 1}`}
                      className="absolute -top-2 -right-2 size-7 border-[3px] border-ink bg-cream text-lg leading-none"
                      onClick={() => removeUpload(upload.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {uploads.length < MAX_FEEDBACK_UPLOADS ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    className="mx-0 size-20 w-20 rounded-xl px-2 py-2 text-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Add
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="Add images"
                tabIndex={-1}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  addUploads(event.target.files);
                  event.target.value = '';
                }}
              />
            </Field>

            <Field>
              <FieldLabel>Type of request</FieldLabel>
              <div role="radiogroup" aria-label="Type of request" className="flex flex-wrap gap-2">
                {FEEDBACK_REQUEST_TYPES.map((type) => {
                  const selected = requestType === type;
                  return (
                    <Button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? 'primary' : 'secondary'}
                      disabled={busy}
                      className="mx-0 w-auto px-4 py-2 text-base"
                      onClick={() => setRequestType(type)}
                    >
                      {FEEDBACK_REQUEST_TYPE_LABELS[type]}
                    </Button>
                  );
                })}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="feedback-title">Title</FieldLabel>
              <Textarea
                id="feedback-title"
                name="title"
                required
                maxLength={255}
                disabled={busy}
                rows={1}
                placeholder="Short summary"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="feedback-description">Description</FieldLabel>
              <Textarea
                id="feedback-description"
                name="description"
                required
                disabled={busy}
                rows={4}
                placeholder="What should we look at?"
                value={description}
                className="min-h-28 resize-y"
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    if (!busy) send.mutate();
                  }
                }}
              />
            </Field>

            {error !== null ? <FormError>{error}</FormError> : null}

            <Button type="submit" disabled={busy}>
              {send.isPending ? 'Sending…' : 'Send'}
            </Button>
            <DialogClose
              disabled={send.isPending}
              render={<Button type="button" variant="secondary" />}
            >
              Cancel
            </DialogClose>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}

export async function openFeedback(): Promise<void> {
  if (useFeedbackStore.getState().isOpen) return;
  const app = engine();
  if (!app?.renderer) return;

  const screenshot = captureGameScreenshot();
  try {
    await pauseGameForFeedback();
    useFeedbackStore.getState().open(screenshot);
    void app.audio.sfx.play('preload-audio/sfx/popup.mp3');
  } catch (error) {
    await resumeGameAfterFeedback();
    console.warn('[feedback] Could not open the feedback overlay', error);
  }
}

export async function closeFeedback(): Promise<void> {
  if (!useFeedbackStore.getState().isOpen) return;
  useFeedbackStore.getState().close();
  await resumeGameAfterFeedback();
}
