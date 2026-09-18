import type { AnyFieldApi } from '@tanstack/react-form';
import { Image as ImageIcon, Music, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { cn, mediaUrl } from '~/lib/utils';

export type MediaKind = 'image' | 'audio';

/** A file already stored on the backend (ImageOut / AudioOut). */
export type ExistingMedia = { url: string; filename: string };

export const AUDIO_ACCEPT = 'audio/*,.ogg,.oga,.opus,application/ogg';

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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/') || file.type === 'application/ogg') {
    return true;
  }
  // Some systems report .ogg as empty or application/octet-stream — fall back to extension.
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return false;
  return AUDIO_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

const KIND_CONFIG = {
  image: {
    accept: 'image/*',
    icon: ImageIcon,
    emptyTitle: 'Upload image',
    emptyDescription: 'PNG, JPG, 500x500px',
    wrongTypeMessage: 'Please choose an image file',
    accepts: isImageFile,
  },
  audio: {
    accept: AUDIO_ACCEPT,
    icon: Music,
    emptyTitle: 'Upload audio',
    emptyDescription: 'MP3, WAV, OGG, or similar',
    wrongTypeMessage: 'Please choose an audio file',
    accepts: isAudioFile,
  },
} as const;

/**
 * One drag-and-drop media slot bound to a TanStack Form field holding `File | null`.
 *
 * `dismissed` and `onDismiss` stay in the parent because the submit handler needs them to
 * decide whether to send the backend clear_* flag.
 */
export function MediaFileField({
  field,
  label,
  description,
  kind,
  existing,
  dismissed,
  onDismiss,
}: {
  field: AnyFieldApi;
  label: string;
  description?: string;
  kind: MediaKind;
  existing: ExistingMedia | null;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const config = KIND_CONFIG[kind];
  const Icon = config.icon;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const selectedFile = field.state.value as File | null;
  const existingUrl = existing ? mediaUrl(existing.url) : null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function setFile(file: File | null) {
    if (file && !config.accepts(file)) {
      toast.error(config.wrongTypeMessage);
      return;
    }

    if (!file) {
      onDismiss();
      if (inputRef.current) inputRef.current.value = '';
    }

    field.handleChange(file);
    field.handleBlur();

    if (kind === 'image') {
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return file ? URL.createObjectURL(file) : null;
      });
    }
  }

  const showExisting = !dismissed && !selectedFile && existing !== null;
  const imagePreviewSrc =
    kind === 'image' ? (previewUrl ?? (showExisting ? existingUrl : null)) : null;
  const hasContent =
    kind === 'image' ? imagePreviewSrc !== null : selectedFile !== null || showExisting;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <input
        ref={inputRef}
        id={inputId}
        name={field.name}
        type="file"
        accept={config.accept}
        className="sr-only"
        onBlur={field.handleBlur}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
        }}
        aria-invalid={isInvalid}
      />

      {hasContent ? (
        <Attachment className="w-full">
          <AttachmentMedia variant={kind === 'image' ? 'image' : 'icon'}>
            {kind === 'image' && imagePreviewSrc ? <img src={imagePreviewSrc} alt="" /> : <Icon />}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{selectedFile?.name ?? existing?.filename ?? label}</AttachmentTitle>
            {selectedFile ? (
              <AttachmentDescription>{formatFileSize(selectedFile.size)}</AttachmentDescription>
            ) : showExisting && kind === 'audio' && existingUrl ? (
              <AttachmentDescription>
                <a
                  href={existingUrl}
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
              aria-label={selectedFile ? `Remove ${selectedFile.name}` : `Remove ${label}`}
              onClick={() => setFile(null)}
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Empty
          className={cn(
            'border border-dashed',
            isDragging && 'border-primary bg-muted/40',
            isInvalid && 'border-destructive',
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
            setFile(event.dataTransfer.files?.[0] ?? null);
          }}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <EmptyTitle>{config.emptyTitle}</EmptyTitle>
            <EmptyDescription>{config.emptyDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Browse Files
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
