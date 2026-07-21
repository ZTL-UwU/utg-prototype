import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, XIcon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useEffect, useId, useRef, useState } from 'react';
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
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { api } from '~/lib/api';
import { EDUCATION_LETTERS } from '~/lib/education-letters';
import { type Word, wordsQueryOptions } from '~/lib/game';
import { cn, mediaUrl } from '~/lib/utils';

const NO_TARGET_LETTER = '__none__';

type WordFormValues = {
  word: string;
  target_letter: string;
  translation: string;
  is_tutorial_word: boolean;
  image: File | null;
};

function createWordFormSchema(requireImage: boolean) {
  const imageSchema = requireImage
    ? z
        .custom<File | null>((value) => value instanceof File || value === null)
        .refine((value): value is File => value instanceof File, {
          message: 'Image is required.',
        })
    : z.custom<File | null>((value) => value instanceof File || value === null);

  return z.object({
    word: z.string().trim().min(1, 'Word is required.').max(255),
    target_letter: z.string().max(255),
    translation: z.string().max(255),
    is_tutorial_word: z.boolean(),
    image: imageSchema,
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function buildWordFormData(values: WordFormValues): FormData {
  const formData = new FormData();
  formData.append('word', values.word.trim());
  formData.append('target_letter', values.target_letter);
  const translation = values.translation.trim();
  if (translation) {
    formData.append('translation', translation);
  }
  formData.append('is_tutorial_word', String(values.is_tutorial_word));
  if (values.image) {
    formData.append('image', values.image);
  }
  return formData;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function wordToFormValues(word: Word): WordFormValues {
  return {
    word: word.word,
    target_letter: word.target_letter ?? '',
    translation: word.translation ?? '',
    is_tutorial_word: word.is_tutorial_word,
    image: null,
  };
}

const defaultWordFormValues: WordFormValues = {
  word: '',
  target_letter: '',
  translation: '',
  is_tutorial_word: false,
  image: null,
};

export function WordFormDialog({
  open,
  onOpenChange,
  word = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word?: Word | null;
}) {
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);

  if (open && !wasOpenRef.current) {
    sessionRef.current += 1;
  }
  wasOpenRef.current = open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <WordFormDialogBody
          key={`${sessionRef.current}-${word?.id ?? 'new'}`}
          word={word}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function WordFormDialogBody({
  word,
  onOpenChange,
}: {
  word: Word | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const imageInputId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dismissedExistingImage, setDismissedExistingImage] = useState(false);
  const isEditing = word !== null;
  const wordFormSchema = createWordFormSchema(!isEditing);
  const existingImageUrl = word ? mediaUrl(word.image.url) : null;

  const saveWord = useMutation({
    mutationFn: (values: WordFormValues) => {
      const body = buildWordFormData(values);
      if (isEditing) {
        return api<Word>(`/words/${word.id}`, {
          method: 'PATCH',
          body,
        });
      }
      return api<Word>('/words', {
        method: 'POST',
        body,
      });
    },
  });

  const form = useForm({
    defaultValues: isEditing ? wordToFormValues(word) : defaultWordFormValues,
    validators: {
      onSubmit: wordFormSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = wordFormSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        await saveWord.mutateAsync(parsed.data);
        toast.success(isEditing ? 'Word updated' : 'Word created');
        await queryClient.invalidateQueries({ queryKey: wordsQueryOptions.queryKey });
        onOpenChange(false);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update word' : 'Failed to create word', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function updateImagePreview(file: File | null) {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });

    if (!file && imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit word' : 'Add word'}</DialogTitle>
      </DialogHeader>

      <form
        id="word-form"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="word"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Word</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    dir="auto"
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="target_letter"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const selectValue = field.state.value || NO_TARGET_LETTER;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Target letter</FieldLabel>
                  <FieldDescription>
                    Letter highlighted in the word for education levels.
                  </FieldDescription>
                  <Select
                    value={selectValue}
                    onValueChange={(value) => {
                      if (typeof value !== 'string') return;
                      field.handleChange(value === NO_TARGET_LETTER ? '' : value);
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      onBlur={field.handleBlur}
                      className="w-full"
                    >
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={NO_TARGET_LETTER}>None</SelectItem>
                        {EDUCATION_LETTERS.map((letter) => (
                          <SelectItem key={letter} value={letter}>
                            <span dir="rtl">{letter}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="is_tutorial_word"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Tutorial word</FieldLabel>
                  <FieldDescription>
                    Whether the word should be used in the educational layer tutorial.
                  </FieldDescription>
                  <Switch
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
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
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    dir="auto"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="image"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const selectedFile = field.state.value;
              const previewSrc =
                imagePreviewUrl ??
                (!dismissedExistingImage && !selectedFile ? existingImageUrl : null);
              const showingExistingImage = Boolean(previewSrc && !selectedFile);

              function setImageFile(file: File | null) {
                if (file && !isImageFile(file)) {
                  toast.error('Please choose an image file');
                  return;
                }

                if (!file) setDismissedExistingImage(true);
                field.handleChange(file);
                field.handleBlur();
                updateImagePreview(file);
              }

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={imageInputId}>Image</FieldLabel>
                  <input
                    ref={imageInputRef}
                    id={imageInputId}
                    name={field.name}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      setImageFile(event.target.files?.[0] ?? null);
                    }}
                    aria-invalid={isInvalid}
                  />

                  {previewSrc ? (
                    <Attachment className="w-full">
                      <AttachmentMedia variant="image">
                        <img src={previewSrc} alt="" />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>
                          {selectedFile?.name ??
                            word?.image.filename ??
                            (isEditing ? 'Current image' : 'Image')}
                        </AttachmentTitle>
                        {selectedFile ? (
                          <AttachmentDescription>
                            {formatFileSize(selectedFile.size)}
                          </AttachmentDescription>
                        ) : showingExistingImage ? (
                          <AttachmentDescription>
                            {formatFileSize(word?.image.size ?? 0)}
                          </AttachmentDescription>
                        ) : null}
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          type="button"
                          aria-label={selectedFile ? `Remove ${selectedFile.name}` : 'Remove image'}
                          onClick={() => setImageFile(null)}
                        >
                          <XIcon />
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  ) : (
                    <Empty
                      className={cn(
                        'border border-dashed',
                        isDraggingImage && 'border-primary bg-muted/40',
                        isInvalid && 'border-destructive',
                      )}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setIsDraggingImage(false);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingImage(false);
                        setImageFile(event.dataTransfer.files?.[0] ?? null);
                      }}
                    >
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Image />
                        </EmptyMedia>
                        <EmptyTitle>Upload image</EmptyTitle>
                        <EmptyDescription>PNG, JPG, 500x500px</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => imageInputRef.current?.click()}
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
          disabled={saveWord.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" form="word-form" disabled={saveWord.isPending}>
          {saveWord.isPending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save changes'
              : 'Create word'}
        </Button>
      </DialogFooter>
    </>
  );
}
