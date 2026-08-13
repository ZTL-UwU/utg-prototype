import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, XIcon } from 'lucide-react';
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui/field';
import { api } from '~/lib/api';
import {
  getErrorDescription,
  type RewardImage,
  rewardImagesQueryOptions,
  rewardsQueryOptions,
} from '~/lib/rewards';
import { cn, mediaUrl } from '~/lib/utils';

type RewardImageFormValues = {
  image: File | null;
};

function createRewardImageFormSchema(requireImage: boolean) {
  return z.object({
    image: z
      .custom<File | null>((value) => value instanceof File || value === null)
      .refine((value) => !requireImage || value instanceof File, 'Image file is required.'),
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function buildRewardImageFormData(values: RewardImageFormValues): FormData {
  const formData = new FormData();
  if (values.image) {
    formData.append('image', values.image);
  }
  return formData;
}

export function RewardImageFormDialog({
  open,
  onOpenChange,
  image = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image?: RewardImage | null;
  onSaved?: (saved: RewardImage) => void;
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
        <RewardImageForm
          key={`${sessionRef.current}-${image?.id ?? 'new'}`}
          image={image}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onSaved?.(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function RewardImageForm({
  image = null,
  embedded = false,
  disabled = false,
  id,
  onCancel,
  onSaved,
  onFileChange,
  onPendingChange,
}: {
  image?: RewardImage | null;
  embedded?: boolean;
  disabled?: boolean;
  id?: string;
  onCancel?: () => void;
  onSaved?: (saved: RewardImage) => void;
  onFileChange?: (file: File | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const generatedId = useId();
  const formId = id ?? generatedId;
  const imageInputId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const isEditing = image !== null;
  const formSchema = createRewardImageFormSchema(!isEditing);
  const existingImageUrl = image ? mediaUrl(image.image.url) : null;
  const defaultValues: RewardImageFormValues = {
    image: null,
  };

  const saveImage = useMutation({
    mutationFn: (values: RewardImageFormValues) => {
      const body = buildRewardImageFormData(values);
      if (isEditing) {
        return api<RewardImage>(`/reward-images/${image.id}`, {
          method: 'PATCH',
          body,
        });
      }
      return api<RewardImage>('/reward-images', {
        method: 'POST',
        body,
      });
    },
  });
  const isDisabled = disabled || saveImage.isPending;

  useEffect(() => {
    onPendingChange?.(saveImage.isPending);
  }, [onPendingChange, saveImage.isPending]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = formSchema.safeParse(value);
      if (!parsed.success) return;

      try {
        const saved = await saveImage.mutateAsync(parsed.data);
        toast.success(isEditing ? 'Reward image updated' : 'Reward image uploaded');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: rewardImagesQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: rewardsQueryOptions.queryKey }),
        ]);
        onSaved?.(saved);
      } catch (error) {
        toast.error(isEditing ? 'Failed to update reward image' : 'Failed to upload reward image', {
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

  const submitLabel = saveImage.isPending
    ? isEditing
      ? 'Saving...'
      : 'Uploading...'
    : isEditing
      ? 'Save changes'
      : 'Upload image';

  const fields = (
    <FieldGroup>
      <form.Field
        name="image"
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          const selectedFile = field.state.value;
          const previewSrc = imagePreviewUrl ?? (!selectedFile ? existingImageUrl : null);

          function setImageFile(file: File | null) {
            if (isDisabled) return;
            if (file && !isImageFile(file)) {
              toast.error('Please choose an image file');
              return;
            }

            field.handleChange(file);
            field.handleBlur();
            updateImagePreview(file);
            onFileChange?.(file);
          }

          return (
            <Field data-invalid={isInvalid} data-disabled={isDisabled || undefined}>
              <FieldLabel htmlFor={imageInputId}>Image</FieldLabel>
              {isEditing ? (
                <FieldDescription>Leave empty to keep the current file.</FieldDescription>
              ) : null}
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
                disabled={isDisabled}
              />

              {previewSrc ? (
                <Attachment className="w-full">
                  <AttachmentMedia variant="image">
                    <img src={previewSrc} alt="" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {selectedFile?.name ??
                        image?.image.filename ??
                        (isEditing ? 'Current image' : 'Image')}
                    </AttachmentTitle>
                    {selectedFile ? (
                      <AttachmentDescription>
                        {formatFileSize(selectedFile.size)}
                      </AttachmentDescription>
                    ) : null}
                  </AttachmentContent>
                  {selectedFile ? (
                    <AttachmentActions>
                      <AttachmentAction
                        type="button"
                        aria-label={`Remove ${selectedFile.name}`}
                        disabled={isDisabled}
                        onClick={() => setImageFile(null)}
                      >
                        <XIcon />
                      </AttachmentAction>
                    </AttachmentActions>
                  ) : null}
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
                    if (!isDisabled) setIsDraggingImage(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!isDisabled) setIsDraggingImage(true);
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
                    <EmptyDescription>PNG, JPG, or similar</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isDisabled}
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
  );

  return (
    <>
      {embedded ? null : (
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit reward image' : 'Upload reward image'}</DialogTitle>
        </DialogHeader>
      )}

      <form
        id={formId}
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isDisabled) void form.handleSubmit();
        }}
      >
        {embedded ? (
          <FieldSet>
            <FieldLegend>Upload new</FieldLegend>
            {fields}
          </FieldSet>
        ) : (
          fields
        )}
      </form>

      {embedded ? null : (
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isDisabled}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isDisabled}>
            {submitLabel}
          </Button>
        </DialogFooter>
      )}
    </>
  );
}
