import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil, PlusIcon, SearchIcon, Trash2, Volume2 } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SentenceFormDialog } from '~/components/sentence-form-dialog';
import { StoryFormDialog } from '~/components/story-form-dialog';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/lib/api';
import { type Sentence, type Story, sentencesQueryOptions, storiesQueryOptions } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';
import { cn, mediaUrl } from '~/lib/utils';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function matchesQuery(query: string, parts: Array<string | null | undefined>): boolean {
  if (!query) return true;
  return parts.filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
}

export default function SentencesPage() {
  const searchId = useId();
  const queryClient = useQueryClient();
  const {
    data: stories,
    isPending: storiesPending,
    isError: storiesError,
    error: storiesErrorValue,
  } = useQuery(storiesQueryOptions);
  const {
    data: sentences,
    isPending: sentencesPending,
    isError: sentencesError,
    error: sentencesErrorValue,
  } = useQuery(sentencesQueryOptions);

  const [query, setQuery] = useState('');
  const [storyFormOpen, setStoryFormOpen] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [sentenceFormOpen, setSentenceFormOpen] = useState(false);
  const [sentenceToEdit, setSentenceToEdit] = useState<Sentence | null>(null);
  const [defaultStoryId, setDefaultStoryId] = useState<number | null>(null);
  const [sentenceToDelete, setSentenceToDelete] = useState<Sentence | null>(null);

  const isPending = storiesPending || sentencesPending;
  const isError = storiesError || sentencesError;
  const error = storiesErrorValue ?? sentencesErrorValue;
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const { filteredStories, unassignedSentences } = useMemo(() => {
    const allStories = stories ?? [];
    const allSentences = sentences ?? [];
    const unassigned = allSentences.filter((sentence) => sentence.story_id == null);

    const nextStories = allStories
      .map((story) => {
        const storyMatches = matchesQuery(normalizedQuery, [story.name]);
        const matchingSentences = story.sentences.filter((sentence) =>
          matchesQuery(normalizedQuery, [sentence.sentence, sentence.translation]),
        );
        if (!normalizedQuery) return story;
        if (storyMatches) return story;
        if (matchingSentences.length === 0) return null;
        return { ...story, sentences: matchingSentences };
      })
      .filter((story): story is Story => story !== null);

    const nextUnassigned = unassigned.filter((sentence) =>
      matchesQuery(normalizedQuery, [sentence.sentence, sentence.translation]),
    );

    return { filteredStories: nextStories, unassignedSentences: nextUnassigned };
  }, [stories, sentences, normalizedQuery]);

  function openCreateStory() {
    setStoryToEdit(null);
    setStoryFormOpen(true);
  }

  function openEditStory(story: Story) {
    setStoryToEdit(story);
    setStoryFormOpen(true);
  }

  function handleStoryFormOpenChange(open: boolean) {
    setStoryFormOpen(open);
    if (!open) setStoryToEdit(null);
  }

  function openCreateSentence(storyId: number | null = null) {
    setSentenceToEdit(null);
    setDefaultStoryId(storyId);
    setSentenceFormOpen(true);
  }

  function openEditSentence(sentence: Sentence) {
    setSentenceToEdit(sentence);
    setDefaultStoryId(sentence.story_id);
    setSentenceFormOpen(true);
  }

  function handleSentenceFormOpenChange(open: boolean) {
    setSentenceFormOpen(open);
    if (!open) {
      setSentenceToEdit(null);
      setDefaultStoryId(null);
    }
  }

  const deleteStory = useMutation({
    mutationFn: (story: Story) =>
      api<void>(`/stories/${story.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Story deleted');
      setStoryToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storiesQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: sentencesQueryOptions.queryKey }),
      ]);
    },
    onError: (deleteError) => {
      toast.error('Failed to delete story', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  const deleteSentence = useMutation({
    mutationFn: (sentence: Sentence) =>
      api<void>(`/sentences/${sentence.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Sentence deleted');
      setSentenceToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sentencesQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: storiesQueryOptions.queryKey }),
      ]);
    },
    onError: (deleteError) => {
      toast.error('Failed to delete sentence', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  const isEmpty =
    !isPending && !isError && (stories?.length ?? 0) === 0 && (sentences?.length ?? 0) === 0;

  const hasVisibleResults = filteredStories.length > 0 || unassignedSentences.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <title>{pageTitle('Sentences')}</title>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sentences</h1>
          <p className="text-muted-foreground">Stories and the sentences that belong to them.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="lg" variant="outline" onClick={openCreateStory}>
            <PlusIcon data-icon="inline-start" />
            Add story
          </Button>
          <Button type="button" size="lg" onClick={() => openCreateSentence()}>
            <PlusIcon data-icon="inline-start" />
            Add sentence
          </Button>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            dir="auto"
            id={searchId}
            type="search"
            placeholder="Search stories or sentences"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search stories or sentences"
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border p-4">
              <Skeleton className="mb-3 h-5 w-1/3" />
              <div className="ms-4 flex flex-col gap-2 border-s ps-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load stories and sentences.'}
        </p>
      ) : isEmpty ? (
        <p className="text-muted-foreground">No stories or sentences yet.</p>
      ) : hasVisibleResults ? (
        <div className="flex flex-col gap-3">
          {filteredStories.map((story) => (
            <StoryTreeNode
              key={story.id}
              story={story}
              defaultOpen={!normalizedQuery || story.sentences.length > 0}
              onAddSentence={() => openCreateSentence(story.id)}
              onEditStory={() => openEditStory(story)}
              onDeleteStory={() => setStoryToDelete(story)}
              onEditSentence={openEditSentence}
              onDeleteSentence={setSentenceToDelete}
            />
          ))}

          {unassignedSentences.length > 0 ? (
            <UnassignedTreeNode
              sentences={unassignedSentences}
              defaultOpen
              onEditSentence={openEditSentence}
              onDeleteSentence={setSentenceToDelete}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground">No matching stories or sentences found.</p>
      )}

      <StoryFormDialog
        open={storyFormOpen}
        onOpenChange={handleStoryFormOpenChange}
        story={storyToEdit}
      />

      <SentenceFormDialog
        open={sentenceFormOpen}
        onOpenChange={handleSentenceFormOpenChange}
        sentence={sentenceToEdit}
        defaultStoryId={defaultStoryId}
      />

      <AlertDialog
        open={storyToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setStoryToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete story?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              {storyToDelete?.name ? `"${storyToDelete.name}"` : 'this story'}. Its sentences become
              unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteStory.isPending}
              onClick={() => {
                if (storyToDelete) deleteStory.mutate(storyToDelete);
              }}
            >
              {deleteStory.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function StoryTreeNode({
  story,
  defaultOpen,
  onAddSentence,
  onEditStory,
  onDeleteStory,
  onEditSentence,
  onDeleteSentence,
}: {
  story: Story;
  defaultOpen: boolean;
  onAddSentence: () => void;
  onEditStory: () => void;
  onDeleteStory: () => void;
  onEditSentence: (sentence: Sentence) => void;
  onDeleteSentence: (sentence: Sentence) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = story.sentences.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/story rounded-xl border">
      <div className="flex items-center gap-1 px-2 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted/60">
          <ChevronRight
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium" dir="auto">
              {story.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {count === 1 ? '1 sentence' : `${count} sentences`}
              {!story.is_published ? ' · Unpublished' : null}
            </div>
          </div>
        </CollapsibleTrigger>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Add sentence to ${story.name}`}
            onClick={onAddSentence}
          >
            <PlusIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${story.name}`}
            onClick={onEditStory}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${story.name}`}
            onClick={onDeleteStory}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="border-t">
        {story.sentences.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground ms-6">
            No sentences in this story.
          </p>
        ) : (
          <ul className="ms-6 flex flex-col border-s py-1">
            {story.sentences.map((sentence) => (
              <li key={sentence.id}>
                <SentenceTreeRow
                  sentence={sentence}
                  onEdit={() => onEditSentence(sentence)}
                  onDelete={() => onDeleteSentence(sentence)}
                />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function UnassignedTreeNode({
  sentences,
  defaultOpen,
  onEditSentence,
  onDeleteSentence,
}: {
  sentences: Sentence[];
  defaultOpen: boolean;
  onEditSentence: (sentence: Sentence) => void;
  onDeleteSentence: (sentence: Sentence) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-dashed">
      <div className="flex items-center gap-1 px-2 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted/60">
          <ChevronRight
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">Unassigned</div>
            <div className="text-xs text-muted-foreground">
              {sentences.length === 1 ? '1 sentence' : `${sentences.length} sentences`}
            </div>
          </div>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="border-t">
        <ul className="ms-6 flex flex-col border-s py-1">
          {sentences.map((sentence) => (
            <li key={sentence.id}>
              <SentenceTreeRow
                sentence={sentence}
                onEdit={() => onEditSentence(sentence)}
                onDelete={() => onDeleteSentence(sentence)}
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SentenceTreeRow({
  sentence,
  onEdit,
  onDelete,
}: {
  sentence: Sentence;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/40">
      <div className="min-w-0 flex-1" dir="rtl">
        <p className="text-sm font-medium whitespace-normal">{sentence.sentence}</p>
        {sentence.translation ? (
          <p className="text-xs text-muted-foreground whitespace-normal">{sentence.translation}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {sentence.audio ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Play sentence audio"
            onClick={() => {
              const audio = new Audio(mediaUrl(sentence.audio!.url));
              void audio.play();
            }}
          >
            <Volume2 />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit sentence"
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete sentence"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
