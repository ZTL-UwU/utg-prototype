import { useForm, type AnyFieldApi } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlusIcon, XIcon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { api } from '~/lib/api';
import { mascotsQueryOptions, type Mascot, type MediaImage } from '~/lib/game';
import { cn, mediaUrl } from '~/lib/utils';

const IDLE_FIELD = { key: 'idle_image', label: 'Idle' } as const;
const SAD_FIELD = { key: 'sad_image', label: 'Sad' } as const;

const STAR_FIELDS = [
  { key: 'zero_star_image', label: '0 stars' },
  { key: 'one_star_image', label: '1 star' },
  { key: 'two_star_image', label: '2 stars' },
  { key: 'three_star_image', label: '3 stars' },
] as const;

const MASCOT_IMAGE_FIELDS = [IDLE_FIELD, SAD_FIELD, ...STAR_FIELDS] as const;

type MascotImageKey = (typeof MASCOT_IMAGE_FIELDS)[number]['key'];

type MascotFormValues = {
  name: string;
} & Record<MascotImageKey, File | null>;

function imageFileSchema(required: boolean) {
  return z
    .custom<File | null>((value) => value instanceof File || value === null)
    .refine((value) => !required || value instanceof File, 'Required.');
}

function createMascotFormSchema(requireImages: boolean) {
  const image = imageFileSchema(requireImages);
  return z.object({
    name: z.string().max(255),
    idle_image: image,
    sad_image: image,
    zero_star_image: image,
    one_star_image: image,
    two_star_image: image,
    three_star_image: image,
  });
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function emptyMascotFormValues(): MascotFormValues {
  return {
    name: '',
    idle_image: null,
    sad_image: null,
    zero_star_image: null,
    one_star_image: null,
    two_star_image: null,
    three_star_image: null,
  };
}

function mascotToFormValues(mascot: Mascot): MascotFormValues {
  return {
    ...emptyMascotFormValues(),
    name: mascot.name ?? '',
  };
}

function buildMascotFormData(values: MascotFormValues): FormData {
  const formData = new FormData();
  formData.append('name', values.name.trim());
  for (const { key } of MASCOT_IMAGE_FIELDS) {
    const file = values[key];
    if (file) formData.append(key, file);
  }
  return formData;
}

export function MascotFormDialog({
  open,
  onOpenChange,
  mascot = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mascot?: Mascot | null;
}) {
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);

  if (open && !wasOpenRef.current) {
    sessionRef.current += 1;
  }
  wasOpenRef.current = open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <MascotFormDialogBody
          key={`${sessionRef.current}-${mascot?.id ?? 'new'}`}
          mascot={mascot}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function MascotFormDialogBody({
  mascot,
  onOpenChange,
}: {
  mascot: Mascot | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = mascot !== null;
  const formSchema = createMascotFormSchema(!isEditing);

  const saveMascot = useMutation({
    mutationFn: (values: MascotFormValues) => {
      const body = buildMascotFormData(values);
      if (isEditing) {
        return api<Mascot>(`/mascots/${mascot.id}`, {
          method: 'PATCH',
          body,
        });
      }
      return api<Mascot>('/mascots', {
        method: 'POST',
        body,
      });
    },
  });

  const form = useForm({
    defaultValues: isEditing ? mascotToFormValues(mascot) : emptyMascotFormValues(),
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = formSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        await saveMascot.mutateAsync(parsed.data);
        toast.success(isEditing ? 'Mascot updated' : 'Mascot created');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: mascotsQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: ['units'] }),
        ]);
        onOpenChange(false);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update mascot' : 'Failed to create mascot', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit mascot' : 'Add mascot'}</DialogTitle>
      </DialogHeader>

      <form
        id="mascot-form"
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
                    placeholder="Sheep"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <FieldSet>
            <FieldLegend variant="label">Images</FieldLegend>

            <div className="grid grid-cols-4 gap-3">
              <form.Field
                name={IDLE_FIELD.key}
                children={(field) => (
                  <MascotImageTile
                    field={field}
                    label={IDLE_FIELD.label}
                    existing={mascot?.[IDLE_FIELD.key] ?? null}
                  />
                )}
              />
              <form.Field
                name={SAD_FIELD.key}
                children={(field) => (
                  <MascotImageTile
                    field={field}
                    label={SAD_FIELD.label}
                    existing={mascot?.[SAD_FIELD.key] ?? null}
                  />
                )}
              />
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">End-screen poses</FieldLegend>
            <FieldDescription>One pose per star result on the end-screen popup.</FieldDescription>
            <div className="grid grid-cols-4 gap-3">
              {STAR_FIELDS.map((item) => (
                <form.Field
                  key={item.key}
                  name={item.key}
                  children={(field) => (
                    <MascotImageTile
                      field={field}
                      label={item.label}
                      existing={mascot?.[item.key] ?? null}
                    />
                  )}
                />
              ))}
            </div>
          </FieldSet>
        </FieldGroup>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saveMascot.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" form="mascot-form" disabled={saveMascot.isPending}>
          {saveMascot.isPending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save changes'
              : 'Create mascot'}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Square image slot: the whole tile is the file picker and the drop target, so an
 * already uploaded image can be replaced without clearing it first.
 */
function MascotImageTile({
  field,
  label,
  existing,
}: {
  field: AnyFieldApi;
  label: string;
  existing: MediaImage | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const selectedFile = field.state.value as File | null;
  const existingUrl = existing ? mediaUrl(existing.url) : null;
  const previewSrc = previewUrl ?? existingUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function setImageFile(file: File | null) {
    if (file && !isImageFile(file)) {
      toast.error('Please choose an image file');
      return;
    }

    field.handleChange(file);
    field.handleBlur();
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (!file && inputRef.current) inputRef.current.value = '';
  }

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={inputId} className="text-xs">
        {label}
      </FieldLabel>

      <div
        title={selectedFile?.name ?? existing?.filename}
        className={cn(
          'group relative aspect-square overflow-hidden rounded-lg bg-muted/40 ring-1 ring-foreground/10',
          !previewSrc && 'border border-dashed border-input ring-0',
          isDragging && 'ring-2 ring-primary',
          selectedFile && 'ring-2 ring-primary',
          isInvalid && 'border-destructive ring-destructive',
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          setImageFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
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
          <img src={previewSrc} alt="" className="size-full object-contain p-1.5" />
        ) : null}

        <button
          type="button"
          aria-label={previewSrc ? `Replace ${label} image` : `Upload ${label} image`}
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {previewSrc ? (
            <span className="rounded-md bg-foreground/75 px-1.5 py-1 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Replace
            </span>
          ) : (
            <>
              <ImagePlusIcon className="size-5" />
              <span className="text-xs font-medium">Upload</span>
            </>
          )}
        </button>

        {selectedFile ? (
          <>
            <Badge className="absolute inset-s-1 top-1">New</Badge>
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={`Discard selected ${label} image`}
              onClick={() => setImageFile(null)}
              className="absolute inset-e-1 top-1"
            >
              <XIcon />
            </Button>
          </>
        ) : null}
      </div>

      {isInvalid && <FieldError errors={field.state.meta.errors} className="text-xs" />}
    </Field>
  );
}
