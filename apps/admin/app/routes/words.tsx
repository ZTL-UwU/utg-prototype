import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { WordCard, WordCardSkeleton } from '~/components/word-card';
import { api } from '~/lib/api';
import { type Word, wordsQueryOptions } from '~/lib/game';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

export default function WordsPage() {
  const queryClient = useQueryClient();
  const { data: words, isPending, isError, error } = useQuery(wordsQueryOptions);
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-8">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Words</h1>
        <p className="text-muted-foreground">Vocabulary used across education and typing levels.</p>
      </header>

      {isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <WordCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load words.'}
        </p>
      ) : words.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {words.map((word) => (
            <WordCard key={word.id} word={word} onDelete={() => setWordToDelete(word)} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No words yet.</p>
      )}

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
