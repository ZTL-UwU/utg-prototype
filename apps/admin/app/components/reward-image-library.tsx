import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Images, Pencil, PlusIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { RewardImageFormDialog } from '~/components/reward-image-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/lib/api';
import { getErrorDescription, type RewardImage, rewardImagesQueryOptions } from '~/lib/rewards';
import { mediaUrl } from '~/lib/utils';

export function RewardImageLibrary({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: images, isPending, isError, error } = useQuery(rewardImagesQueryOptions);
  const [formOpen, setFormOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<RewardImage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<RewardImage | null>(null);

  function openCreate() {
    setImageToEdit(null);
    setFormOpen(true);
  }

  function openEdit(image: RewardImage) {
    setImageToEdit(image);
    setFormOpen(true);
  }

  function handleFormOpenChange(nextOpen: boolean) {
    setFormOpen(nextOpen);
    if (!nextOpen) setImageToEdit(null);
  }

  const deleteImage = useMutation({
    mutationFn: (image: RewardImage) =>
      api<void>(`/reward-images/${image.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Reward image deleted');
      setImageToDelete(null);
      await queryClient.invalidateQueries({ queryKey: rewardImagesQueryOptions.queryKey });
    },
    onError: (deleteError) => {
      toast.error('Failed to delete reward image', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Reward images</SheetTitle>
            <SheetDescription>
              Upload once and reuse across badges, or add a unique image for a single reward.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="flex justify-end">
              <Button type="button" onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                Upload image
              </Button>
            </div>

            {isPending ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, index) => (
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
                    <Images />
                  </EmptyMedia>
                  <EmptyTitle>No reward images yet</EmptyTitle>
                  <EmptyDescription>Upload an image to start assigning badges.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image) => (
                  <Card key={image.id} className="h-full pt-0" size="sm">
                    <div className="group relative">
                      {image.image ? (
                        <img
                          src={mediaUrl(image.image.url)}
                          alt=""
                          className="aspect-square w-full bg-muted/40 object-contain p-4 select-none"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground">
                          <Image aria-hidden />
                        </div>
                      )}
                      <div className="absolute end-2 top-2 flex gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${image.name}`}
                          onClick={() => openEdit(image)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          aria-label={`Delete ${image.name}`}
                          disabled={image.reward_count > 0}
                          title={
                            image.reward_count > 0
                              ? 'This image is still used by rewards'
                              : undefined
                          }
                          onClick={() => setImageToDelete(image)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="truncate">{image.name}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-1">
                        <Badge variant="secondary">
                          {image.reward_count === 1 ? '1 reward' : `${image.reward_count} rewards`}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <RewardImageFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        image={imageToEdit}
      />

      <AlertDialog
        open={imageToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setImageToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reward image?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {imageToDelete?.name ?? 'this image'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteImage.isPending}
              onClick={() => {
                if (imageToDelete) deleteImage.mutate(imageToDelete);
              }}
            >
              {deleteImage.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
