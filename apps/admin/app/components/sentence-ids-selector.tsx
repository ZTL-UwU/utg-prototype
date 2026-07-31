import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardAction, CardContent, CardHeader } from '~/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Skeleton } from '~/components/ui/skeleton';
import { sentencesQueryOptions } from '~/lib/game';
import { cn } from '~/lib/utils';

type SentenceIdsSelectorProps = {
  value: number[];
  onChange: (value: number[]) => void;
};

export function SentenceIdsSelector({ value, onChange }: SentenceIdsSelectorProps) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const { data: sentences = [], isPending, isError } = useQuery(sentencesQueryOptions);
  const selectedSet = new Set(value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectable = sentences.filter((sentence) => {
    if (!normalizedQuery) return true;
    const haystack = [sentence.sentence, sentence.translation]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((sentenceId) => sentenceId !== id));
      return;
    }
    onChange([...value, id]);
  };

  const allSelectableSelected =
    selectable.length > 0 && selectable.every((sentence) => selectedSet.has(sentence.id));

  const selectAll = () => {
    const selectableIds = selectable.map((sentence) => sentence.id);
    onChange([...new Set([...value, ...selectableIds])]);
  };

  const deselectAll = () => {
    const selectableIds = new Set(selectable.map((sentence) => sentence.id));
    onChange(value.filter((id) => !selectableIds.has(id)));
  };

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load sentences.</p>;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="inline-flex w-fit">
            <InputGroupInput
              dir="auto"
              id={searchId}
              type="search"
              placeholder="Search sentences"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search sentences"
            />
            <InputGroupAddon align="inline-end">
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <CardAction className="self-center">
          <Button
            type="button"
            variant="ghost"
            disabled={selectable.length === 0}
            onClick={allSelectableSelected ? deselectAll : selectAll}
          >
            {allSelectableSelected ? 'Deselect all' : 'Select all'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col max-h-72 grid-cols-1 gap-2 overflow-y-auto">
        {selectable.map((sentence) => {
          const selected = selectedSet.has(sentence.id);
          return (
            <Button
              key={sentence.id}
              type="button"
              variant={selected ? 'default' : 'secondary'}
              className="h-auto flex-col items-stretch gap-1 px-3 py-2 text-start"
              aria-pressed={selected}
              onClick={() => toggle(sentence.id)}
              dir="rtl"
            >
              <span className="line-clamp-2 text-sm whitespace-normal">{sentence.sentence}</span>
              {sentence.translation ? (
                <span
                  className={cn(
                    'text-xs text-muted-foreground line-clamp-1 whitespace-normal',
                    selected && 'text-primary-foreground',
                  )}
                >
                  {sentence.translation}
                </span>
              ) : null}
            </Button>
          );
        })}
        {selectable.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No matching sentences found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
