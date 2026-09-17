import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AudioLines,
  ImageIcon,
  ImageOff,
  PlusIcon,
  SearchIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FetchError } from 'ofetch';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { type MediaFilter, MediaToggleGroup } from '~/components/media-toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { WordCard, WordCardSkeleton } from '~/components/word-card';
import { WordFormDialog } from '~/components/word-form-dialog';
import { api } from '~/lib/api';
import { type Word, wordsQueryOptions } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

export default function WordsPage() {
  const searchId = useId();
  const queryClient = useQueryClient();
  const { data: words, isPending, isError, error } = useQuery(wordsQueryOptions);
  const [query, setQuery] = useState('');
  const [imageFilter, setImageFilter] = useState<MediaFilter[]>([]);
  const [educationAudioFilter, setEducationAudioFilter] = useState<MediaFilter[]>([]);
  const [standardAudioFilter, setStandardAudioFilter] = useState<MediaFilter[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [wordToEdit, setWordToEdit] = useState<Word | null>(null);
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);

  const imageMode = imageFilter[0];
  const educationAudioMode = educationAudioFilter[0];
  const standardAudioMode = standardAudioFilter[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredWords =
    words?.filter((word) => {
      if (imageMode === 'with' && !word.image) return false;
      if (imageMode === 'without' && word.image) return false;
      if (educationAudioMode === 'with' && !word.education_audio) return false;
      if (educationAudioMode === 'without' && word.education_audio) return false;
      if (standardAudioMode === 'with' && !word.standard_audio) return false;
      if (standardAudioMode === 'without' && word.standard_audio) return false;
      if (normalizedQuery) {
        const haystack = [word.word, word.translation, word.target_letter]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    }) ?? [];

  function openCreate() {
    setWordToEdit(null);
    setFormOpen(true);
  }

  function openEdit(word: Word) {
    setWordToEdit(word);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setWordToEdit(null);
  }

  const deleteWord = useMutation({
    mutationFn: (word: Word) =>
      api<void>(`/words/${word.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Word deleted');
      setWordToDelete(null);
      await queryClient.invalidateQueries({ queryKey: wordsQueryOptions.queryKey });
    },
    onError: (deleteError) => {
      toast.error('Failed to delete word', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <title>{pageTitle('Words')}</title>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Words</h1>
          <p className="text-muted-foreground">
            Vocabulary used across education and typing levels.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0">
          <Button type="button" size="lg" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Add word
          </Button>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <MediaToggleGroup
            label="Filter by image"
            value={imageFilter}
            onChange={setImageFilter}
            withIcon={ImageIcon}
            withoutIcon={ImageOff}
            withLabel="Has image"
            withoutLabel="Missing image"
          />
          <MediaToggleGroup
            label="Filter by education audio"
            value={educationAudioFilter}
            onChange={setEducationAudioFilter}
            withIcon={Volume2}
            withoutIcon={VolumeX}
            withLabel="Has education audio"
            withoutLabel="Missing education audio"
          />
          <MediaToggleGroup
            label="Filter by standard audio"
            value={standardAudioFilter}
            onChange={setStandardAudioFilter}
            withIcon={AudioLines}
            withoutIcon={VolumeX}
            withLabel="Has standard audio"
            withoutLabel="Missing standard audio"
          />
        </div>
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            dir="auto"
            id={searchId}
            type="search"
            placeholder="Search (word or translation)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search words"
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, index) => (
            <WordCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load words.'}
        </p>
      ) : words.length === 0 ? (
        <p className="text-muted-foreground">No words yet.</p>
      ) : filteredWords.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {filteredWords.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onEdit={() => openEdit(word)}
              onDelete={() => setWordToDelete(word)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No matching words found.</p>
      )}

      <WordFormDialog open={formOpen} onOpenChange={handleFormOpenChange} word={wordToEdit} />

      <AlertDialog
        open={wordToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setWordToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete word?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {wordToDelete?.word ?? 'this word'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteWord.isPending}
              onClick={() => {
                if (wordToDelete) deleteWord.mutate(wordToDelete);
              }}
            >
              {deleteWord.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
