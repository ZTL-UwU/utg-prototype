import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Textarea } from '~/components/ui/textarea';
import { api } from '~/lib/api';
import { type Sentence, sentencesQueryOptions } from '~/lib/game';

type SentenceFormValues = {
  sentence: string;
  translation: string;
};

function createSentenceFormSchema() {
  return z.object({
    sentence: z.string().trim().min(1, 'Sentence is required.'),
    translation: z.string(),
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function sentencePayload(values: SentenceFormValues) {
  const translation = values.translation.trim();
  return {
    sentence: values.sentence.trim(),
    translation: translation || null,
  };
}

function sentenceToFormValues(sentence: Sentence): SentenceFormValues {
  return {
    sentence: sentence.sentence,
    translation: sentence.translation ?? '',
  };
}

const defaultSentenceFormValues: SentenceFormValues = {
  sentence: '',
  translation: '',
};

export function SentenceFormDialog({
  open,
  onOpenChange,
  sentence = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentence?: Sentence | null;
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
          key={`${sessionRef.current}-${sentence?.id ?? 'new'}`}
          sentence={sentence}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SentenceFormDialogBody({
  sentence,
  onOpenChange,
}: {
  sentence: Sentence | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = sentence !== null;
  const sentenceFormSchema = createSentenceFormSchema();

  const saveSentence = useMutation({
    mutationFn: (values: SentenceFormValues) => {
      const body = sentencePayload(values);
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
    defaultValues: isEditing ? sentenceToFormValues(sentence) : defaultSentenceFormValues,
    validators: {
      onSubmit: sentenceFormSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = sentenceFormSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        await saveSentence.mutateAsync(parsed.data);
        toast.success(isEditing ? 'Sentence updated' : 'Sentence created');
        await queryClient.invalidateQueries({ queryKey: sentencesQueryOptions.queryKey });
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
