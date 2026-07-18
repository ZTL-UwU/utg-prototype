import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { GripVerticalIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';

type Level = {
  id: string;
  title: string;
  description: string;
};

const initialLevels: Level[] = [
  {
    id: 'level-1',
    title: 'Level 1',
    description: 'Description 1',
  },
  {
    id: 'level-2',
    title: 'Level 2',
    description: 'Description 2',
  },
  {
    id: 'level-3',
    title: 'Level 3',
    description: 'Description 3',
  },
  {
    id: 'level-4',
    title: 'Level 4',
    description: 'Description 4',
  },
  {
    id: 'level-5',
    title: 'Level 5',
    description: 'Description 5',
  },
  {
    id: 'level-6',
    title: 'Level 6',
    description: 'Description 6',
  },
];

function SortableLevelCard({ index, level }: { index: number; level: Level }) {
  const { handleRef, isDragging, ref } = useSortable({ id: level.id, index });

  return (
    <Card ref={ref} className={cn(isDragging && 'opacity-50')}>
      <CardHeader>
        <CardTitle>{level.title}</CardTitle>
        <CardDescription>{level.description}</CardDescription>
        <CardAction>
          <Button
            ref={handleRef}
            variant="ghost"
            size="icon-sm"
            className="cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Reorder ${level.title}`}
          >
            <GripVerticalIcon />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export default function SortableDemo() {
  const [levels, setLevels] = useState(initialLevels);

  function handleDragEnd(event: DragEndEvent) {
    setLevels((currentLevels) => move(currentLevels, event));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">DnD Sortable Demo</h1>
      </header>

      <DragDropProvider onDragEnd={handleDragEnd}>
        <section aria-label="Project priority order" className="flex flex-col gap-4">
          {levels.map((level, index) => (
            <SortableLevelCard key={level.id} index={index} level={level} />
          ))}
        </section>
      </DragDropProvider>
    </div>
  );
}
