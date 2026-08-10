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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import { api } from '~/lib/api';
import { type Story, storiesQueryOptions } from '~/lib/game';

type StoryFormValues = {
  name: string;
  is_published: boolean;
};

function createStoryFormSchema() {
  return z.object({
    name: z.string().trim().min(1, 'Name is required.').max(255),
    is_published: z.boolean(),
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function storyToFormValues(story: Story): StoryFormValues {
  return {
    name: story.name,
    is_published: story.is_published,
  };
}

const defaultStoryFormValues: StoryFormValues = {
  name: '',
  is_published: true,
};

export function StoryFormDialog({
  open,
  onOpenChange,
  story = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story?: Story | null;
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
        <StoryFormDialogBody
          key={`${sessionRef.current}-${story?.id ?? 'new'}`}
          story={story}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function StoryFormDialogBody({
  story,
  onOpenChange,
}: {
  story: Story | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = story !== null;
  const storyFormSchema = createStoryFormSchema();

  const saveStory = useMutation({
    mutationFn: (values: StoryFormValues) => {
      const body = {
        name: values.name.trim(),
        is_published: values.is_published,
      };
      if (isEditing) {
        return api<Story>(`/stories/${story.id}`, {
          method: 'PATCH',
          body,
        });
      }
      return api<Story>('/stories', {
        method: 'POST',
        body,
      });
    },
  });

  const form = useForm({
    defaultValues: isEditing ? storyToFormValues(story) : defaultStoryFormValues,
    validators: {
      onSubmit: storyFormSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = storyFormSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        await saveStory.mutateAsync(parsed.data);
        toast.success(isEditing ? 'Story updated' : 'Story created');
        await queryClient.invalidateQueries({ queryKey: storiesQueryOptions.queryKey });
        onOpenChange(false);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update story' : 'Failed to create story', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit story' : 'Add story'}</DialogTitle>
      </DialogHeader>

      <form
        id="story-form"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
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
            name="is_published"
            children={(field) => (
              <Field orientation="horizontal">
                <div className="flex flex-1 flex-col gap-1">
                  <FieldLabel htmlFor={field.name}>Published</FieldLabel>
                  <FieldDescription>
                    Unpublished stories stay hidden from the game.
                  </FieldDescription>
                </div>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              </Field>
            )}
          />
        </FieldGroup>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saveStory.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" form="story-form" disabled={saveStory.isPending}>
          {saveStory.isPending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save changes'
              : 'Create story'}
        </Button>
      </DialogFooter>
    </>
  );
}
