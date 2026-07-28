import { formatDistanceToNow } from 'date-fns';
import { Edit2, GripVerticalIcon, PlusIcon } from 'lucide-react';
import type { Ref } from 'react';
import { useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { Unit } from '~/lib/game';
import { cn } from '~/lib/utils';

export function UnitCard({
  unit,
  cardRef,
  handleRef,
  isDragging = false,
  isReordering = false,
}: {
  unit: Unit;
  cardRef?: Ref<HTMLDivElement>;
  handleRef?: Ref<HTMLButtonElement>;
  isDragging?: boolean;
  isReordering?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Card ref={cardRef} className={cn('h-full', isDragging && 'opacity-50')}>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-1">
          {handleRef ? (
            <Button
              ref={handleRef}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-grab touch-none"
              aria-label={`Reorder ${unit.title}`}
              disabled={isReordering}
            >
              <GripVerticalIcon />
            </Button>
          ) : null}
          <CardTitle className="truncate">{unit.title}</CardTitle>
        </div>
        <CardAction>
          <Badge variant={unit.is_published ? 'default' : 'secondary'}>
            {unit.is_published ? 'Published' : 'Draft'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-2">
          {unit.levels.map((level, index) => (
            <div key={level.id}>
              <h4>{level.title?.trim() || `Game ${index + 1}`}</h4>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <span className="flex flex-col gap-2 text-sm text-muted-foreground">
          Edited {formatDistanceToNow(new Date(unit.updated_at), { addSuffix: true })}
        </span>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(`/${unit.layer}/${unit.id}`);
          }}
          size="sm"
          className="ml-auto"
        >
          <Edit2 />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}

export function NewUnitCard({ layer }: { layer: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/${layer}/new`)}
      className="group h-full text-left outline-none"
      aria-label="Add level"
    >
      <Card className="h-full min-h-40 border-0 bg-transparent hover:ring-foreground/20 hover:bg-muted/40 transition-colors">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground">
          <PlusIcon className="size-6" />
          <span className="font-heading text-base font-bold">Add level</span>
        </CardContent>
      </Card>
    </button>
  );
}

export function UnitCardSkeleton() {
  return (
    <Card className="h-full" aria-hidden>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <CardAction>
          <Skeleton className="h-5 w-20" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-8 w-16" />
      </CardFooter>
    </Card>
  );
}
