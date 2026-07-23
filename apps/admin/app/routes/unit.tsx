import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { UnitForm } from '~/components/unit-form';
import { api } from '~/lib/api';
import type { Unit } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

import type { Route } from './+types/unit';

export default function UnitPage({ params }: Route.ComponentProps) {
  const id = Number(params.unitId);

  const {
    data: unit,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['units', id],
    queryFn: () => api<Unit>(`/units/${id}`),
  });

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <title>{pageTitle('Edit Unit')}</title>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError || !unit) {
    return (
      <div className="mx-auto w-full max-w-2xl text-sm text-destructive">
        <title>{pageTitle('Unit not found')}</title>
        {error instanceof Error ? error.message : 'Unit not found.'}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <title>{pageTitle(unit.title)}</title>
      <header className="flex items-center gap-2">
        <Link to={`/${unit.layer}`}>
          <ArrowLeftIcon className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Unit</h1>
      </header>
      <UnitForm key={unit.id} unit={unit} />
      <Separator />
      <Card className="bg-muted/50">
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Created at</div>
            <span>{new Date(unit.created_at).toLocaleString()}</span>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Updated at</div>
            <span>{new Date(unit.updated_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
