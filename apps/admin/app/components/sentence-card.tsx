import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { Sentence } from '~/lib/game';

export function SentenceCard({
  sentence,
  onEdit,
  onDelete,
}: {
  sentence: Sentence;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card size="sm" className="group" dir="rtl">
      <CardHeader>
        <CardTitle className="text-base! font-semibold whitespace-normal">
          {sentence.sentence}
        </CardTitle>
        {sentence.translation ? (
          <CardDescription className="whitespace-normal">{sentence.translation}</CardDescription>
        ) : null}
        <CardAction className="flex gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Edit sentence"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Delete sentence"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function SentenceCardSkeleton() {
  return (
    <Card size="sm" aria-hidden dir="rtl">
      <CardHeader className="flex flex-col gap-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
    </Card>
  );
}
