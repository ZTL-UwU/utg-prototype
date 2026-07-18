import { useQuery } from '@tanstack/react-query';

import { UnitCard, UnitCardSkeleton } from '~/components/unit-card';
import { api } from '~/lib/api';
import { LAYER_TITLES, type Layer, type Unit } from '~/lib/game';

import type { Route } from './+types/layer';

export default function LayerPage({ params }: Route.ComponentProps) {
  const { layer } = params;

  const { data: units, isPending } = useQuery({
    queryFn: () => api<Unit[]>(`/units/list-by-layer/${layer}`),
    queryKey: ['units', 'list-by-layer', layer],
  });

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-4 md:gap-8">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{LAYER_TITLES[layer as Layer]}</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8 md:grid-cols-2">
        {isPending
          ? Array.from({ length: 6 }, (_, index) => <UnitCardSkeleton key={index} />)
          : units?.map((unit) => <UnitCard key={unit.id} unit={unit} />)}
      </div>
    </div>
  );
}
