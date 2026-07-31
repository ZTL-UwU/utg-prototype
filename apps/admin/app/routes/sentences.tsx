import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { SentenceCard, SentenceCardSkeleton } from '~/components/sentence-card';
import { SentenceFormDialog } from '~/components/sentence-form-dialog';
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
import { api } from '~/lib/api';
import { type Sentence, sentencesQueryOptions } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

export default function SentencesPage() {
  const searchId = useId();
  const queryClient = useQueryClient();
  const { data: sentences, isPending, isError, error } = useQuery(sentencesQueryOptions);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [sentenceToEdit, setSentenceToEdit] = useState<Sentence | null>(null);
  const [sentenceToDelete, setSentenceToDelete] = useState<Sentence | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredSentences =
    sentences?.filter((sentence) => {
      if (!normalizedQuery) return true;
      const haystack = [sentence.sentence, sentence.translation]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    }) ?? [];

  function openCreate() {
    setSentenceToEdit(null);
    setFormOpen(true);
  }

  function openEdit(sentence: Sentence) {
    setSentenceToEdit(sentence);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setSentenceToEdit(null);
  }

  const deleteSentence = useMutation({
    mutationFn: (sentence: Sentence) =>
      api<void>(`/sentences/${sentence.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Sentence deleted');
      setSentenceToDelete(null);
      await queryClient.invalidateQueries({ queryKey: sentencesQueryOptions.queryKey });
    },
    onError: (deleteError) => {
      toast.error('Failed to delete sentence', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <title>{pageTitle('Sentences')}</title>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sentences</h1>
          <p className="text-muted-foreground">
            Sentences used across education and typing levels.
          </p>
        </div>
        <Button type="button" size="lg" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          Add sentence
        </Button>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            dir="auto"
            id={searchId}
            type="search"
            placeholder="Search (sentence or translation)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search sentences"
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SentenceCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load sentences.'}
        </p>
      ) : sentences.length === 0 ? (
        <p className="text-muted-foreground">No sentences yet.</p>
      ) : filteredSentences.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredSentences.map((sentence) => (
            <SentenceCard
              key={sentence.id}
              sentence={sentence}
              onEdit={() => openEdit(sentence)}
              onDelete={() => setSentenceToDelete(sentence)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No matching sentences found.</p>
      )}

      <SentenceFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        sentence={sentenceToEdit}
      />

      <AlertDialog
        open={sentenceToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSentenceToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sentence?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              {sentenceToDelete?.sentence
                ? `"${sentenceToDelete.sentence.slice(0, 80)}${sentenceToDelete.sentence.length > 80 ? '…' : ''}"`
                : 'this sentence'}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteSentence.isPending}
              onClick={() => {
                if (sentenceToDelete) deleteSentence.mutate(sentenceToDelete);
              }}
            >
              {deleteSentence.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
