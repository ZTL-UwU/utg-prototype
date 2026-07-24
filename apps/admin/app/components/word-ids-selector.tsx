import { useQuery } from '@tanstack/react-query';
import { ImageIcon, ImageOff, SearchIcon, Volume2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Card, CardAction, CardContent, CardHeader } from '~/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Skeleton } from '~/components/ui/skeleton';
import { Toggle } from '~/components/ui/toggle';
import { highlightTargetLetter } from '~/components/word-card';
import { wordsQueryOptions } from '~/lib/game';
import { cn, mediaUrl } from '~/lib/utils';

type WordIdsSelectorProps = {
  value: number[];
  onChange: (value: number[]) => void;
  /** When true, only words with a target_letter are selectable. */
  requireTargetLetter?: boolean;
};

export function WordIdsSelector({
  value,
  onChange,
  requireTargetLetter = true,
}: WordIdsSelectorProps) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [onlyWithImage, setOnlyWithImage] = useState(true);
  const [onlyWithAudio, setOnlyWithAudio] = useState(true);
  const { data: words = [], isPending, isError } = useQuery(wordsQueryOptions);
  const selectedSet = new Set(value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectable = words.filter((word) => {
    if (requireTargetLetter && !word.target_letter) return false;
    if (onlyWithImage && !word.image) return false;
    if (onlyWithAudio && !word.audio) return false;
    if (normalizedQuery) {
      const haystack = [word.word, word.translation, word.target_letter]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((wordId) => wordId !== id));
      return;
    }
    onChange([...value, id]);
  };

  const allSelectableSelected =
    selectable.length > 0 && selectable.every((word) => selectedSet.has(word.id));

  const selectAll = () => {
    const selectableIds = selectable.map((word) => word.id);
    onChange([...new Set([...value, ...selectableIds])]);
  };

  const deselectAll = () => {
    const selectableIds = new Set(selectable.map((word) => word.id));
    onChange(value.filter((id) => !selectableIds.has(id)));
  };

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load words.</p>;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            variant="outline"
            pressed={onlyWithImage}
            onPressedChange={setOnlyWithImage}
            aria-label="Show only words with an image"
          >
            <ImageIcon data-icon="inline-start" />
            Has image
          </Toggle>
          <Toggle
            variant="outline"
            pressed={onlyWithAudio}
            onPressedChange={setOnlyWithAudio}
            aria-label="Show only words with audio"
          >
            <Volume2 data-icon="inline-start" />
            Has audio
          </Toggle>
          <InputGroup className="inline-flex w-fit">
            <InputGroupInput
              dir="auto"
              id={searchId}
              type="search"
              placeholder="Search words"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search words"
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
      <CardContent className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {selectable.map((word) => {
          const selected = selectedSet.has(word.id);
          return (
            <Button
              key={word.id}
              type="button"
              variant={selected ? 'default' : 'secondary'}
              className="h-auto flex-col gap-1 px-2 py-2"
              aria-pressed={selected}
              onClick={() => toggle(word.id)}
            >
              {word.image ? (
                <img
                  src={mediaUrl(word.image.url)}
                  alt=""
                  className="size-12 rounded object-cover"
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded text-xs">
                  <ImageOff className="size-4 text-muted-foreground" aria-hidden />
                </span>
              )}
              <span lang="ug" dir="rtl" className="line-clamp-1 text-sm">
                {highlightTargetLetter(word.word, word.target_letter)}
              </span>
              <span
                className={cn(
                  'text-xs text-muted-foreground max-w-full truncate',
                  selected && 'text-primary-foreground',
                )}
              >
                {word.translation}
              </span>
            </Button>
          );
        })}
        {selectable.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No matching words found.</p>
        )}
      </CardContent>
    </Card>
  );
}
