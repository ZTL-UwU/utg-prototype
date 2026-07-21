import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { Word } from '~/lib/game';
import { mediaUrl } from '~/lib/utils';

function highlightTargetLetter(word: string, targetLetter: string | null): ReactNode {
  if (!targetLetter) return word;

  const index = word.indexOf(targetLetter);
  if (index === -1) return word;

  return (
    <>
      {word.slice(0, index)}
      <span className="text-blue-500">{word.slice(index, index + targetLetter.length)}</span>
      {word.slice(index + targetLetter.length)}
    </>
  );
}

export function WordCard({
  word,
  onEdit,
  onDelete,
}: {
  word: Word;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="h-full pt-0" size="sm">
      <div className="group relative">
        <img
          src={mediaUrl(word.image.url)}
          alt=""
          className="aspect-square w-full object-cover bg-muted select-none"
        />
        <div className="absolute end-2 top-2 flex gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Edit ${word.word}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={`Delete ${word.word}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="truncate text-lg! font-semibold" dir="rtl">
          {highlightTargetLetter(word.word, word.target_letter)}
        </CardTitle>
        {word.translation ? (
          <CardDescription className="truncate" dir="rtl">
            {word.translation}
          </CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function WordCardSkeleton() {
  return (
    <Card className="h-full pt-0" size="sm" aria-hidden>
      <Skeleton className="aspect-square w-full rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
    </Card>
  );
}
