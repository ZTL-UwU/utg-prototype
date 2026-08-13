import { useQuery } from '@tanstack/react-query';
import { Image } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { RewardImageForm } from '~/components/reward-image-form-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { type RewardImage, rewardImagesQueryOptions } from '~/lib/rewards';
import { cn, mediaUrl } from '~/lib/utils';

function sortByMostUsed(images: RewardImage[]) {
  return [...images].sort((a, b) => {
    if (b.reward_count !== a.reward_count) return b.reward_count - a.reward_count;
    return a.name.localeCompare(b.name);
  });
}

export function RewardImagePicker({
  open,
  onOpenChange,
  title = 'Choose image',
  selectedImageId = null,
  allowClear = false,
  onSelect,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  selectedImageId?: number | null;
  allowClear?: boolean;
  onSelect: (image: RewardImage) => void | Promise<void>;
  onClear?: () => void | Promise<void>;
}) {
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);
  const {
    data: images,
    isPending,
    isError,
    error,
  } = useQuery({
    ...rewardImagesQueryOptions,
    enabled: open,
  });
  const uploadFormId = useId();
  const [pendingId, setPendingId] = useState<number | 'clear' | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(selectedImageId);
  const [hasUploadFile, setHasUploadFile] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);

  if (open && !wasOpenRef.current) {
    sessionRef.current += 1;
  }
  wasOpenRef.current = open;

  useEffect(() => {
    if (open) {
      setHighlightedId(selectedImageId);
      setHasUploadFile(false);
      setUploadPending(false);
    }
  }, [open, selectedImageId]);

  const sortedImages = useMemo(() => sortByMostUsed(images ?? []), [images]);
  const highlightedImage = sortedImages.find((image) => image.id === highlightedId) ?? null;
  const isBusy = pendingId !== null || uploadPending;
  const canUseUpload = hasUploadFile;
  const canUseSelected = highlightedImage !== null;

  async function confirm(image: RewardImage) {
    setPendingId(image.id);
    try {
      await onSelect(image);
      onOpenChange(false);
    } finally {
      setPendingId(null);
    }
  }

  async function clear() {
    if (!onClear) return;
    setPendingId('clear');
    try {
      await onClear();
      onOpenChange(false);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isBusy) return;
        onOpenChange(nextOpen);
        if (nextOpen) {
          setHighlightedId(selectedImageId);
        }
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Reuse an existing image, or upload a new one for this reward only.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 max-h-80 overflow-y-auto">
          {isPending ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load reward images.'}
            </p>
          ) : !images || images.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Image />
                </EmptyMedia>
                <EmptyTitle>No images in the library</EmptyTitle>
                <EmptyDescription>
                  Upload an image below to assign it to this reward.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 p-1">
              {sortedImages.map((image) => {
                const isSelected = highlightedId === image.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    disabled={isBusy}
                    aria-label={image.name}
                    aria-pressed={isSelected}
                    onClick={() => setHighlightedId(image.id)}
                    className={cn(
                      'overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-primary/40',
                      isSelected && 'ring-2 ring-primary',
                    )}
                  >
                    <img
                      src={mediaUrl(image.image.url)}
                      alt=""
                      className="aspect-square w-full bg-muted/40 object-contain p-3"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="shrink-0" />

        <div className="shrink-0">
          <RewardImageForm
            key={sessionRef.current}
            id={uploadFormId}
            embedded
            disabled={isBusy}
            onFileChange={(file) => setHasUploadFile(file != null)}
            onPendingChange={setUploadPending}
            onSaved={(saved) => {
              setHighlightedId(saved.id);
              setHasUploadFile(false);
              void confirm(saved);
            }}
          />
        </div>

        <DialogFooter>
          {allowClear ? (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              disabled={isBusy}
              onClick={() => {
                void clear();
              }}
            >
              {pendingId === 'clear' ? 'Clearing...' : 'Clear assignment'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          {canUseUpload ? (
            <Button type="submit" form={uploadFormId} disabled={isBusy}>
              {uploadPending ? 'Uploading...' : 'Use image'}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isBusy || !canUseSelected}
              onClick={() => {
                if (highlightedImage) void confirm(highlightedImage);
              }}
            >
              {pendingId !== null && pendingId !== 'clear' ? 'Saving...' : 'Use image'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
