import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Music, XIcon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '~/components/ui/attachment';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { api } from '~/lib/api';
import { type Sentence, sentencesQueryOptions, storiesQueryOptions } from '~/lib/game';
import { cn, mediaUrl } from '~/lib/utils';

const NO_STORY = '__none__';

type SentenceFormValues = {
  sentence: string;
  translation: string;
  story_id: string;
  audio: File | null;
};

function createSentenceFormSchema() {
  return z.object({
    sentence: z.string().trim().min(1, 'Sentence is required.'),
    translation: z.string(),
    story_id: z.string(),
    audio: z.custom<File | null>((value) => value instanceof File || value === null),
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.opus',
  '.m4a',
  '.aac',
  '.flac',
  '.webm',
]);

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/') || file.type === 'application/ogg') {
    return true;
  }
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return false;
  return AUDIO_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

function buildSentenceFormData(
  values: SentenceFormValues,
  options?: { clearAudio?: boolean },
): FormData {
  const formData = new FormData();
  formData.append('sentence', values.sentence.trim());
  const translation = values.translation.trim();
  if (translation) {
    formData.append('translation', translation);
  }
  if (values.story_id && values.story_id !== NO_STORY) {
    formData.append('story_id', values.story_id);
  }
  if (values.audio) {
    formData.append('audio', values.audio);
  } else if (options?.clearAudio) {
    formData.append('clear_audio', 'true');
  }
  return formData;
}

function sentenceToFormValues(sentence: Sentence): SentenceFormValues {
  return {
    sentence: sentence.sentence,
    translation: sentence.translation ?? '',
    story_id: sentence.story_id != null ? String(sentence.story_id) : NO_STORY,
    audio: null,
  };
}

function defaultSentenceFormValues(defaultStoryId?: number | null): SentenceFormValues {
  return {
    sentence: '',
    translation: '',
    story_id: defaultStoryId != null ? String(defaultStoryId) : NO_STORY,
    audio: null,
  };
}

export function SentenceFormDialog({
  open,
  onOpenChange,
  sentence = null,
  defaultStoryId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentence?: Sentence | null;
  defaultStoryId?: number | null;
}) {
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);

  if (open && !wasOpenRef.current) {
    sessionRef.current += 1;
  }
  wasOpenRef.current = open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <SentenceFormDialogBody
          key={`${sessionRef.current}-${sentence?.id ?? 'new'}-${defaultStoryId ?? 'none'}`}
          sentence={sentence}
          defaultStoryId={defaultStoryId}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SentenceFormDialogBody({
  sentence,
  defaultStoryId,
  onOpenChange,
}: {
  sentence: Sentence | null;
  defaultStoryId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const audioInputId = useId();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [dismissedExistingAudio, setDismissedExistingAudio] = useState(false);
  const isEditing = sentence !== null;
  const sentenceFormSchema = createSentenceFormSchema();
  const existingAudio = sentence?.audio ?? null;
  const { data: stories = [] } = useQuery(storiesQueryOptions);

  const saveSentence = useMutation({
    mutationFn: ({ values, clearAudio }: { values: SentenceFormValues; clearAudio: boolean }) => {
      const body = buildSentenceFormData(values, { clearAudio });
      if (isEditing) {
        return api<Sentence>(`/sentences/${sentence.id}`, {
          method: 'PATCH',
          body,
        });
      }
      return api<Sentence>('/sentences', {
        method: 'POST',
        body,
      });
    },
  });

  const form = useForm({
    defaultValues: isEditing
      ? sentenceToFormValues(sentence)
      : defaultSentenceFormValues(defaultStoryId),
    validators: {
      onSubmit: sentenceFormSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = sentenceFormSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        await saveSentence.mutateAsync({
          values: parsed.data,
          clearAudio: isEditing && dismissedExistingAudio && !parsed.data.audio,
        });
        toast.success(isEditing ? 'Sentence updated' : 'Sentence created');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: sentencesQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: storiesQueryOptions.queryKey }),
        ]);
        onOpenChange(false);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update sentence' : 'Failed to create sentence', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit sentence' : 'Add sentence'}</DialogTitle>
      </DialogHeader>

      <form
        id="sentence-form"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="sentence"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Sentence</FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    dir="auto"
                    rows={3}
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="translation"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Translation</FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    dir="auto"
                    rows={2}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="story_id"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel>Story</FieldLabel>
                  <FieldDescription>Optional. Assign this sentence to a story.</FieldDescription>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (typeof value !== 'string') return;
                      field.handleChange(value);
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={isInvalid}
                      onBlur={field.handleBlur}
                    >
                      <SelectValue placeholder="No story" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_STORY}>No story</SelectItem>
                      {stories.map((story) => (
                        <SelectItem key={story.id} value={String(story.id)}>
                          {story.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="audio"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const selectedFile = field.state.value;
              const showExisting =
                !dismissedExistingAudio && !selectedFile && existingAudio !== null;

              function setAudioFile(file: File | null) {
                if (file && !isAudioFile(file)) {
                  toast.error('Please choose an audio file');
                  return;
                }

                if (!file) {
                  setDismissedExistingAudio(true);
                  if (audioInputRef.current) audioInputRef.current.value = '';
                }
                field.handleChange(file);
                field.handleBlur();
              }

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={audioInputId}>Audio</FieldLabel>
                  <FieldDescription>Optional audio for the sentence.</FieldDescription>
                  <input
                    ref={audioInputRef}
                    id={audioInputId}
                    name={field.name}
                    type="file"
                    accept="audio/*,.ogg,.oga,.opus,application/ogg"
                    className="sr-only"
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      setAudioFile(event.target.files?.[0] ?? null);
                    }}
                    aria-invalid={isInvalid}
                  />

                  {selectedFile || showExisting ? (
                    <Attachment className="w-full">
                      <AttachmentMedia variant="icon">
                        <Music />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>
                          {selectedFile?.name ??
                            existingAudio?.filename ??
                            (isEditing ? 'Current audio' : 'Audio')}
                        </AttachmentTitle>
                        {selectedFile ? (
                          <AttachmentDescription>
                            {formatFileSize(selectedFile.size)}
                          </AttachmentDescription>
                        ) : existingAudio ? (
                          <AttachmentDescription>
                            <a
                              href={mediaUrl(existingAudio.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              Preview
                            </a>
                          </AttachmentDescription>
                        ) : null}
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          type="button"
                          aria-label={selectedFile ? `Remove ${selectedFile.name}` : 'Remove audio'}
                          onClick={() => setAudioFile(null)}
                        >
                          <XIcon />
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  ) : (
                    <Empty
                      className={cn(
                        'border border-dashed',
                        isDraggingAudio && 'border-primary bg-muted/40',
                        isInvalid && 'border-destructive',
                      )}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDraggingAudio(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingAudio(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setIsDraggingAudio(false);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingAudio(false);
                        setAudioFile(event.dataTransfer.files?.[0] ?? null);
                      }}
                    >
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Music />
                        </EmptyMedia>
                        <EmptyTitle>Upload audio</EmptyTitle>
                        <EmptyDescription>MP3, WAV, OGG, or similar</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => audioInputRef.current?.click()}
                        >
                          Browse Files
                        </Button>
                      </EmptyContent>
                    </Empty>
                  )}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saveSentence.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" form="sentence-form" disabled={saveSentence.isPending}>
          {saveSentence.isPending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save changes'
              : 'Create sentence'}
        </Button>
      </DialogFooter>
    </>
  );
}
