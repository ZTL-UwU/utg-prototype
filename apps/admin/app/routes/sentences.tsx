import { move } from '@dnd-kit/helpers';
import {
  DragDropProvider,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  GripVertical,
  Pencil,
  PlusIcon,
  SearchIcon,
  Trash2,
  Volume2,
} from 'lucide-react';
import { FetchError } from 'ofetch';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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

const UNASSIGNED_GROUP = 'unassigned';
const SENTENCE_TYPE = 'sentence';

type SentenceGroups = Record<string, Sentence[]>;

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

function storyGroupKey(storyId: number): string {
  return String(storyId);
}

function storyIdFromGroup(group: string): number | null {
  return group === UNASSIGNED_GROUP ? null : Number(group);
}

function buildSentenceGroups(stories: Story[], sentences: Sentence[]): SentenceGroups {
  const groups: SentenceGroups = { [UNASSIGNED_GROUP]: [] };

  for (const story of stories) {
    groups[storyGroupKey(story.id)] = story.sentences.map((sentence) => ({ ...sentence }));
  }

  const unassigned = sentences
    .filter((sentence) => sentence.story_id == null)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

  groups[UNASSIGNED_GROUP] = unassigned.map((sentence) => ({ ...sentence }));
  return groups;
}

function applyGroupsToStories(stories: Story[], groups: SentenceGroups): Story[] {
  return stories.map((story) => {
    const key = storyGroupKey(story.id);
    const nextSentences = (groups[key] ?? []).map((sentence, index) => ({
      ...sentence,
      story_id: story.id,
      sort_order: index + 1,
    }));
    return { ...story, sentences: nextSentences };
  });
}

function unassignedFromGroups(groups: SentenceGroups): Sentence[] {
  return (groups[UNASSIGNED_GROUP] ?? []).map((sentence, index) => ({
    ...sentence,
    story_id: null,
    sort_order: index + 1,
  }));
}

function sameSentenceIds(a: Sentence[], b: Sentence[]): boolean {
  return a.length === b.length && a.every((sentence, index) => sentence.id === b[index]?.id);
}

function sameGroups(a: SentenceGroups, b: SentenceGroups): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!(key in b) || !sameSentenceIds(a[key] ?? [], b[key] ?? [])) return false;
  }
  return true;
}

function changedGroupUpdates(
  before: SentenceGroups,
  after: SentenceGroups,
): Array<{ storyId: number | null; sentenceIds: number[] }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const updates: Array<{ storyId: number | null; sentenceIds: number[] }> = [];

  for (const key of keys) {
    const previous = before[key] ?? [];
    const next = after[key] ?? [];
    if (sameSentenceIds(previous, next)) continue;
    updates.push({
      storyId: storyIdFromGroup(key),
      sentenceIds: next.map((sentence) => sentence.id),
    });
  }

  return updates;
}

function sentencesFromGroups(groups: SentenceGroups): Sentence[] {
  return Object.entries(groups).flatMap(([key, groupSentences]) => {
    const storyId = storyIdFromGroup(key);
    return groupSentences.map((sentence, index) => ({
      ...sentence,
      story_id: storyId,
      sort_order: index + 1,
    }));
  });
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

  const [localStories, setLocalStories] = useState<Story[]>([]);
  const [groups, setGroups] = useState<SentenceGroups>({ [UNASSIGNED_GROUP]: [] });
  const groupsRef = useRef(groups);
  const groupsSnapshotRef = useRef<SentenceGroups>({ [UNASSIGNED_GROUP]: [] });
  // Skip server→local sync while dragging or saving so refetch can't flicker/break dnd.
  const dragSessionRef = useRef(false);
  groupsRef.current = groups;

  const isPending = storiesPending || sentencesPending;
  const isError = storiesError || sentencesError;
  const error = storiesErrorValue ?? sentencesErrorValue;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const canReorder = !normalizedQuery;

  useEffect(() => {
    if (!stories || !sentences) return;
    if (dragSessionRef.current) return;

    const nextGroups = buildSentenceGroups(stories, sentences);
    setLocalStories(stories.map((story) => ({ ...story, sentences: [...story.sentences] })));
    setGroups((current) => (sameGroups(current, nextGroups) ? current : nextGroups));
    groupsSnapshotRef.current = nextGroups;
  }, [stories, sentences]);

  const displayStories = useMemo(
    () => applyGroupsToStories(localStories, groups),
    [localStories, groups],
  );
  const displayUnassigned = useMemo(() => unassignedFromGroups(groups), [groups]);

  const { filteredStories, unassignedSentences } = useMemo(() => {
    const nextStories = displayStories
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

    const nextUnassigned = displayUnassigned.filter((sentence) =>
      matchesQuery(normalizedQuery, [sentence.sentence, sentence.translation]),
    );

    return { filteredStories: nextStories, unassignedSentences: nextUnassigned };
  }, [displayStories, displayUnassigned, normalizedQuery]);

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

  const reorderSentences = useMutation({
    mutationFn: (updates: Array<{ storyId: number | null; sentenceIds: number[] }>) =>
      Promise.all(
        updates.map((update) =>
          api<Sentence[]>('/sentences/order', {
            method: 'PUT',
            body: {
              story_id: update.storyId,
              sentence_ids: update.sentenceIds,
            },
          }),
        ),
      ),
    onSuccess: () => {
      const nextGroups = groupsRef.current;
      const previousStories =
        queryClient.getQueryData<Story[]>(storiesQueryOptions.queryKey) ?? localStories;
      const nextStories = applyGroupsToStories(previousStories, nextGroups);
      const nextSentences = sentencesFromGroups(nextGroups);

      queryClient.setQueryData(storiesQueryOptions.queryKey, nextStories);
      queryClient.setQueryData(sentencesQueryOptions.queryKey, nextSentences);
      setLocalStories(nextStories);
      groupsSnapshotRef.current = nextGroups;
    },
    onError: (reorderError) => {
      const snapshot = groupsSnapshotRef.current;
      setGroups(snapshot);
      toast.error('Failed to reorder sentences', {
        description: getErrorDescription(reorderError),
      });
    },
    onSettled: () => {
      dragSessionRef.current = false;
    },
  });

  function handleDragStart() {
    if (!canReorder) return;
    dragSessionRef.current = true;
    groupsSnapshotRef.current = groupsRef.current;
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canReorder) return;
    const { source } = event.operation;
    if (source?.type !== SENTENCE_TYPE) return;
    setGroups((current) => {
      const next = move(current, event) as SentenceGroups;
      return sameGroups(current, next) ? current : next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;

    if (event.canceled) {
      setGroups(groupsSnapshotRef.current);
      dragSessionRef.current = false;
      return;
    }

    const { source } = event.operation;
    if (source?.type !== SENTENCE_TYPE) {
      dragSessionRef.current = false;
      return;
    }

    // Order is already updated in onDragOver; persist only what changed.
    const updates = changedGroupUpdates(groupsSnapshotRef.current, groupsRef.current);
    if (updates.length === 0) {
      dragSessionRef.current = false;
      return;
    }
    reorderSentences.mutate(updates);
  }

  const isEmpty =
    !isPending && !isError && (stories?.length ?? 0) === 0 && (sentences?.length ?? 0) === 0;

  const showUnassigned = canReorder || unassignedSentences.length > 0;
  const hasVisibleResults = filteredStories.length > 0 || showUnassigned;

  const tree = (
    <div className="flex flex-col gap-4">
      {filteredStories.map((story) => (
        <StoryTreeNode
          key={story.id}
          story={story}
          group={storyGroupKey(story.id)}
          defaultOpen={!normalizedQuery || story.sentences.length > 0}
          canReorder={canReorder}
          onAddSentence={() => openCreateSentence(story.id)}
          onEditStory={() => openEditStory(story)}
          onDeleteStory={() => setStoryToDelete(story)}
          onEditSentence={openEditSentence}
          onDeleteSentence={setSentenceToDelete}
        />
      ))}

      {showUnassigned ? (
        <UnassignedTreeNode
          sentences={unassignedSentences}
          defaultOpen
          canReorder={canReorder}
          onEditSentence={openEditSentence}
          onDeleteSentence={setSentenceToDelete}
        />
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <title>{pageTitle('Sentences')}</title>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sentences</h1>
          <p className="text-muted-foreground">
            Stories and the sentences that belong to them. Drag sentences to reorder or move them
            between stories.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0">
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
        {normalizedQuery ? (
          <p className="text-xs text-muted-foreground">Clear search to reorder sentences.</p>
        ) : null}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border p-4" dir="rtl">
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
        <DragDropProvider
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {tree}
        </DragDropProvider>
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
  group,
  defaultOpen,
  canReorder,
  onAddSentence,
  onEditStory,
  onDeleteStory,
  onEditSentence,
  onDeleteSentence,
}: {
  story: Story;
  group: string;
  defaultOpen: boolean;
  canReorder: boolean;
  onAddSentence: () => void;
  onEditStory: () => void;
  onDeleteStory: () => void;
  onEditSentence: (sentence: Sentence) => void;
  onDeleteSentence: (sentence: Sentence) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { isDropTarget, ref } = useDroppable({
    id: group,
    accept: SENTENCE_TYPE,
    disabled: !canReorder,
    // Prefer sentence-row collisions over the story container.
    collisionPriority: 1,
  });
  const count = story.sentences.length;

  useEffect(() => {
    if (isDropTarget) setOpen(true);
  }, [isDropTarget]);

  return (
    <div
      ref={ref}
      dir="rtl"
      className={cn(
        'group/story rounded-xl border',
        isDropTarget && 'border-primary/50 bg-primary/5',
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1 px-2 py-2">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted/60">
            <ChevronRight
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-90',
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{story.name}</div>
              <div className="text-end text-xs text-muted-foreground" dir="ltr">
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
            <p className="ms-6 px-4 py-3 text-sm text-muted-foreground">
              {canReorder ? 'Drop sentences here, or add one.' : 'No sentences in this story.'}
            </p>
          ) : (
            <ul className="ms-6 flex flex-col border-s py-1">
              {story.sentences.map((sentence, index) => (
                <li key={sentence.id}>
                  {canReorder ? (
                    <SortableSentenceTreeRow
                      sentence={sentence}
                      index={index}
                      group={group}
                      onEdit={() => onEditSentence(sentence)}
                      onDelete={() => onDeleteSentence(sentence)}
                    />
                  ) : (
                    <SentenceTreeRow
                      sentence={sentence}
                      onEdit={() => onEditSentence(sentence)}
                      onDelete={() => onDeleteSentence(sentence)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function UnassignedTreeNode({
  sentences,
  defaultOpen,
  canReorder,
  onEditSentence,
  onDeleteSentence,
}: {
  sentences: Sentence[];
  defaultOpen: boolean;
  canReorder: boolean;
  onEditSentence: (sentence: Sentence) => void;
  onDeleteSentence: (sentence: Sentence) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { isDropTarget, ref } = useDroppable({
    id: UNASSIGNED_GROUP,
    accept: SENTENCE_TYPE,
    disabled: !canReorder,
    collisionPriority: 1,
  });

  useEffect(() => {
    if (isDropTarget) setOpen(true);
  }, [isDropTarget]);

  return (
    <div
      ref={ref}
      dir="rtl"
      className={cn(
        'rounded-xl border border-dashed',
        isDropTarget && 'border-primary/50 bg-primary/5',
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
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
              <div className="text-end text-xs text-muted-foreground" dir="ltr">
                {sentences.length === 1 ? '1 sentence' : `${sentences.length} sentences`}
              </div>
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="border-t">
          {sentences.length === 0 ? (
            <p className="ms-6 px-4 py-3 text-sm text-muted-foreground">
              Drop sentences here to unassign them from a story.
            </p>
          ) : (
            <ul className="ms-6 flex flex-col border-s py-1">
              {sentences.map((sentence, index) => (
                <li key={sentence.id}>
                  {canReorder ? (
                    <SortableSentenceTreeRow
                      sentence={sentence}
                      index={index}
                      group={UNASSIGNED_GROUP}
                      onEdit={() => onEditSentence(sentence)}
                      onDelete={() => onDeleteSentence(sentence)}
                    />
                  ) : (
                    <SentenceTreeRow
                      sentence={sentence}
                      onEdit={() => onEditSentence(sentence)}
                      onDelete={() => onDeleteSentence(sentence)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SortableSentenceTreeRow({
  sentence,
  index,
  group,
  onEdit,
  onDelete,
}: {
  sentence: Sentence;
  index: number;
  group: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { handleRef, isDragging, ref } = useSortable({
    id: sentence.id,
    index,
    group,
    type: SENTENCE_TYPE,
    accept: SENTENCE_TYPE,
  });

  return (
    <SentenceTreeRow
      sentence={sentence}
      rowRef={ref}
      handleRef={handleRef}
      isDragging={isDragging}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function SentenceTreeRow({
  sentence,
  rowRef,
  handleRef,
  isDragging = false,
  onEdit,
  onDelete,
}: {
  sentence: Sentence;
  rowRef?: (element: Element | null) => void;
  handleRef?: (element: Element | null) => void;
  isDragging?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={rowRef}
      dir="ltr"
      className={cn(
        'group flex items-start gap-1 px-2 py-2 hover:bg-muted/40',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
          aria-label="Delete sentence"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit sentence"
          onClick={onEdit}
        >
          <Pencil />
        </Button>
      </div>
      <div className="min-w-0 flex-1" dir="rtl">
        <p className="text-sm font-medium whitespace-normal">{sentence.sentence}</p>
        {sentence.translation ? (
          <p className="text-xs text-muted-foreground whitespace-normal">{sentence.translation}</p>
        ) : null}
      </div>
      {handleRef ? (
        <Button
          ref={handleRef}
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 size-8 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder sentence"
        >
          <GripVertical />
        </Button>
      ) : null}
    </div>
  );
}
