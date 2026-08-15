import { Image, Pencil, Trash2 } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { mascotLabel, type Mascot } from '~/lib/game';
import { mediaUrl } from '~/lib/utils';

const POSE_IMAGES = [
  { key: 'sad_image', label: 'Sad' },
  { key: 'zero_star_image', label: '0 stars' },
  { key: 'one_star_image', label: '1 star' },
  { key: 'two_star_image', label: '2 stars' },
  { key: 'three_star_image', label: '3 stars' },
] as const;

export function MascotCard({
  mascot,
  onEdit,
  onDelete,
}: {
  mascot: Mascot;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const name = mascotLabel(mascot);

  return (
    <Card className="h-full pt-0" size="sm">
      <div className="group relative">
        {mascot.idle_image ? (
          <img
            src={mediaUrl(mascot.idle_image.url)}
            alt=""
            className="aspect-square w-full bg-muted object-contain select-none"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground">
            <Image className="size-10" aria-hidden />
          </div>
        )}
        <div className="absolute end-2 top-2 flex gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Edit ${name}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={`Delete ${name}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="truncate text-lg! font-semibold">{name}</CardTitle>
        <div className="grid grid-cols-5 gap-1 pt-1">
          {POSE_IMAGES.map(({ key, label }) => {
            const image = mascot[key];
            return (
              <img
                key={key}
                src={mediaUrl(image.url)}
                alt={label}
                title={label}
                className="aspect-square w-full rounded-md bg-muted object-contain"
              />
            );
          })}
        </div>
      </CardHeader>
    </Card>
  );
}

export function MascotCardSkeleton() {
  return (
    <Card className="h-full pt-0" size="sm" aria-hidden>
      <Skeleton className="aspect-square w-full rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <div className="grid grid-cols-5 gap-1 pt-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      </CardHeader>
    </Card>
  );
}
