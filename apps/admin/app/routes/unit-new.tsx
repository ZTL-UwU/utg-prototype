import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';

import { UnitForm } from '~/components/unit-form';
import { LAYER_TITLES, isLayer } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

import type { Route } from './+types/unit-new';

export default function UnitNewPage({ params }: Route.ComponentProps) {
  const { layer } = params;

  if (!isLayer(layer)) {
    return (
      <div className="mx-auto w-full max-w-2xl text-sm text-destructive">
        <title>{pageTitle('Invalid layer')}</title>
        Unknown layer.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <title>{pageTitle(`New ${LAYER_TITLES[layer]} unit`)}</title>
      <header className="flex items-center gap-2">
        <Link to={`/${layer}`}>
          <ArrowLeftIcon className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create Level</h1>
      </header>
      <UnitForm defaultLayer={layer} />
    </div>
  );
}
