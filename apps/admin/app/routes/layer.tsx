import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { UnitCard, UnitCardSkeleton } from '~/components/unit-card';
import { api } from '~/lib/api';
import { LAYER_TITLES, isLayer, type Unit } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

import type { Route } from './+types/layer';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function withDenseSortOrder(units: Unit[]): Unit[] {
  return units.map((unit, index) => ({ ...unit, sort_order: index + 1 }));
}

function hasSameUnitOrder(a: Unit[], b: Unit[]): boolean {
  return a.length === b.length && a.every((unit, index) => unit.id === b[index]?.id);
}

export default function LayerPage({ params }: Route.ComponentProps) {
  const { layer } = params;
  const layerTitle = isLayer(layer) ? LAYER_TITLES[layer] : layer;
  const queryClient = useQueryClient();

  const { data: unitsFromServer, isPending } = useQuery({
    queryFn: () => api<Unit[]>(`/units/list-by-layer/${layer}`),
    queryKey: ['units', 'list-by-layer', layer],
  });

  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (unitsFromServer) {
      setUnits(withDenseSortOrder(unitsFromServer));
    }
  }, [unitsFromServer]);

  const reorderUnits = useMutation({
    mutationFn: (unitIds: number[]) =>
      api<Unit[]>(`/units/list-by-layer/${layer}/order`, {
        method: 'PUT',
        body: { unit_ids: unitIds },
      }),
    onSuccess: async (updatedUnits) => {
      setUnits(withDenseSortOrder(updatedUnits));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['units', 'list-by-layer', layer] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'sidebar'] }),
      ]);
    },
    onError: (error) => {
      if (unitsFromServer) {
        setUnits(withDenseSortOrder(unitsFromServer));
      }
      toast.error('Failed to reorder units', {
        description: getErrorDescription(error),
      });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const nextUnits = withDenseSortOrder(move(units, event) as Unit[]);
    if (hasSameUnitOrder(units, nextUnits)) return;
    setUnits(nextUnits);
    reorderUnits.mutate(nextUnits.map((unit) => unit.id));
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-4 md:gap-8">
      <title>{pageTitle(layerTitle)}</title>
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{layerTitle}</h1>
      </header>

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <UnitCardSkeleton key={index} />
          ))}
        </div>
      ) : units.length > 0 ? (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div
            aria-label="Unit order"
            className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8 md:grid-cols-2"
          >
            {units.map((unit, index) => (
              <SortableUnitCard
                key={unit.id}
                index={index}
                unit={unit}
                isReordering={reorderUnits.isPending}
              />
            ))}
          </div>
        </DragDropProvider>
      ) : (
        <p className="text-muted-foreground">No units in this layer yet.</p>
      )}
    </div>
  );
}

function SortableUnitCard({
  index,
  unit,
  isReordering,
}: {
  index: number;
  unit: Unit;
  isReordering: boolean;
}) {
  const { handleRef, isDragging, ref } = useSortable({ id: unit.id, index });

  return (
    <UnitCard
      unit={unit}
      cardRef={ref}
      handleRef={handleRef}
      isDragging={isDragging}
      isReordering={isReordering}
    />
  );
}
