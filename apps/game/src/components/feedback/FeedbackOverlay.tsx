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
  type FeedbackRequestType,
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

export function FeedbackOverlay({ screenshot }: { screenshot: HTMLCanvasElement }) {
  const annotatorRef = useRef<ScreenshotAnnotatorHandle>(null);
  const [requestType, setRequestType] = useState<FeedbackRequestType>('issue');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      const trimmedDescription = description.trim();
      if (!trimmedDescription) {
        throw new Error('Please add a description.');
      }
      const canvas = annotatorRef.current?.getCanvas();
      if (!canvas) {
        throw new Error('Screenshot is not ready.');
      }
      const image = await canvasToJpegBlob(canvas);
      return submitFeedback({
        requestType,
        title: title.trim(),
        description: trimmedDescription,
        screen: currentGameScreenLabel(),
        image,
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

            <ScreenshotAnnotator ref={annotatorRef} screenshot={screenshot} />

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
              <FieldLabel htmlFor="feedback-title">
                Title <span className="font-normal text-muted">(optional)</span>
              </FieldLabel>
              <Textarea
                id="feedback-title"
                name="title"
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
