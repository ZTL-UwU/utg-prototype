import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Skeleton } from '~/components/ui/skeleton';
import { storiesQueryOptions } from '~/lib/game';
import { cn } from '~/lib/utils';

type StoryIdSelectorProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

export function StoryIdSelector({ value, onChange }: StoryIdSelectorProps) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const { data: stories = [], isPending, isError } = useQuery(storiesQueryOptions);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectable = stories.filter((story) => {
    if (!normalizedQuery) return true;
    return story.name.toLocaleLowerCase().includes(normalizedQuery);
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load stories.</p>;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            dir="auto"
            id={searchId}
            type="search"
            placeholder="Search stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search stories"
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </CardHeader>
      <CardContent className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        <Button
          type="button"
          variant={value === null ? 'default' : 'secondary'}
          className="h-auto flex-col items-stretch gap-0.5 px-3 py-2 text-start"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          <span className="text-sm font-medium">No story</span>
          <span
            className={cn(
              'text-xs text-muted-foreground',
              value === null && 'text-primary-foreground',
            )}
          >
            Level will have no sentences from a story.
          </span>
        </Button>
        {selectable.map((story) => {
          const selected = value === story.id;
          const count = story.sentences.length;
          return (
            <Button
              key={story.id}
              type="button"
              variant={selected ? 'default' : 'secondary'}
              className="h-auto flex-col items-stretch gap-0.5 px-3 py-2 text-start"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : story.id)}
            >
              <span className="text-sm font-medium whitespace-normal" dir="auto">
                {story.name}
              </span>
              <span
                className={cn(
                  'text-xs text-muted-foreground',
                  selected && 'text-primary-foreground',
                )}
              >
                {count === 1 ? '1 sentence' : `${count} sentences`}
                {!story.is_published ? ' · Unpublished' : null}
              </span>
            </Button>
          );
        })}
        {selectable.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching stories found.</p>
        )}
      </CardContent>
    </Card>
  );
}
