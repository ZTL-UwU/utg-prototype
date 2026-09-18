import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EDUCATION_LETTERS } from '@utg/letters';
import { FetchError } from 'ofetch';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { MediaFileField } from '~/components/media-file-field';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
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
import { type Word, wordsQueryOptions } from '~/lib/game';

const NO_TARGET_LETTER = '__none__';

type WordFormValues = {
  word: string;
  target_letter: string;
  translation: string;
  is_tutorial_word: boolean;
  image: File | null;
  education_audio: File | null;
  standard_audio: File | null;
};

type ClearFlags = {
  clearImage: boolean;
  clearEducationAudio: boolean;
  clearStandardAudio: boolean;
};

function createWordFormSchema() {
  const file = z.custom<File | null>((value) => value instanceof File || value === null);
  return z.object({
    word: z.string().trim().min(1, 'Word is required.').max(255),
    target_letter: z.string().max(255),
    translation: z.string().max(255),
    is_tutorial_word: z.boolean(),
    image: file,
    education_audio: file,
    standard_audio: file,
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function buildWordFormData(values: WordFormValues, flags: ClearFlags): FormData {
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
  } else if (flags.clearImage) {
    formData.append('clear_image', 'true');
  }
  if (values.education_audio) {
    formData.append('education_audio', values.education_audio);
  } else if (flags.clearEducationAudio) {
    formData.append('clear_education_audio', 'true');
  }
  if (values.standard_audio) {
    formData.append('standard_audio', values.standard_audio);
  } else if (flags.clearStandardAudio) {
    formData.append('clear_standard_audio', 'true');
  }
  return formData;
}

function wordToFormValues(word: Word): WordFormValues {
  return {
    word: word.word,
    target_letter: word.target_letter ?? '',
    translation: word.translation ?? '',
    is_tutorial_word: word.is_tutorial_word,
    image: null,
    education_audio: null,
    standard_audio: null,
  };
}

const defaultWordFormValues: WordFormValues = {
  word: '',
  target_letter: '',
  translation: '',
  is_tutorial_word: false,
  image: null,
  education_audio: null,
  standard_audio: null,
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
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col" showCloseButton={false}>
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
  const [dismissedExistingImage, setDismissedExistingImage] = useState(false);
  const [dismissedExistingEducationAudio, setDismissedExistingEducationAudio] = useState(false);
  const [dismissedExistingStandardAudio, setDismissedExistingStandardAudio] = useState(false);
  const isEditing = word !== null;
  const wordFormSchema = createWordFormSchema();

  const saveWord = useMutation({
    mutationFn: ({ values, flags }: { values: WordFormValues; flags: ClearFlags }) => {
      const body = buildWordFormData(values, flags);
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
        await saveWord.mutateAsync({
          values: parsed.data,
          flags: {
            clearImage: isEditing && dismissedExistingImage && !parsed.data.image,
            clearEducationAudio:
              isEditing && dismissedExistingEducationAudio && !parsed.data.education_audio,
            clearStandardAudio:
              isEditing && dismissedExistingStandardAudio && !parsed.data.standard_audio,
          },
        });
        toast.success(isEditing ? 'Word updated' : 'Word created');
        await queryClient.invalidateQueries({
          queryKey: wordsQueryOptions.queryKey,
        });
        onOpenChange(false);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update word' : 'Failed to create word', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit word' : 'Add word'}</DialogTitle>
      </DialogHeader>

      <form
        id="word-form"
        className="flex-1 overflow-y-auto min-h-0 pr-1 my-2"
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
            children={(field) => (
              <MediaFileField
                field={field}
                label="Image"
                kind="image"
                existing={word?.image ?? null}
                dismissed={dismissedExistingImage}
                onDismiss={() => setDismissedExistingImage(true)}
              />
            )}
          />

          <form.Field
            name="education_audio"
            children={(field) => (
              <MediaFileField
                field={field}
                label="Education audio"
                description="Voice actor saying the target letter and then the word. Used by education levels."
                kind="audio"
                existing={word?.education_audio ?? null}
                dismissed={dismissedExistingEducationAudio}
                onDismiss={() => setDismissedExistingEducationAudio(true)}
              />
            )}
          />

          <form.Field
            name="standard_audio"
            children={(field) => (
              <MediaFileField
                field={field}
                label="Standard audio"
                description="Voice actor saying only the word. Used by typing and game levels."
                kind="audio"
                existing={word?.standard_audio ?? null}
                dismissed={dismissedExistingStandardAudio}
                onDismiss={() => setDismissedExistingStandardAudio(true)}
              />
            )}
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
