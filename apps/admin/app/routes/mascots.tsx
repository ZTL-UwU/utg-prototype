import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { MascotCard, MascotCardSkeleton } from '~/components/mascot-card';
import { MascotFormDialog } from '~/components/mascot-form-dialog';
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
import { mascotLabel, mascotsQueryOptions, type Mascot } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

export default function MascotsPage() {
  const searchId = useId();
  const queryClient = useQueryClient();
  const { data: mascots, isPending, isError, error } = useQuery(mascotsQueryOptions);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [mascotToEdit, setMascotToEdit] = useState<Mascot | null>(null);
  const [mascotToDelete, setMascotToDelete] = useState<Mascot | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredMascots =
    mascots?.filter((mascot) => {
      if (!normalizedQuery) return true;
      return mascotLabel(mascot).toLocaleLowerCase().includes(normalizedQuery);
    }) ?? [];

  function openCreate() {
    setMascotToEdit(null);
    setFormOpen(true);
  }

  function openEdit(mascot: Mascot) {
    setMascotToEdit(mascot);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setMascotToEdit(null);
  }

  const deleteMascot = useMutation({
    mutationFn: (mascot: Mascot) =>
      api<void>(`/mascots/${mascot.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.success('Mascot deleted');
      setMascotToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mascotsQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['units'] }),
      ]);
    },
    onError: (deleteError) => {
      toast.error('Failed to delete mascot', {
        description: getErrorDescription(deleteError),
      });
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <title>{pageTitle('Mascots')}</title>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Mascots</h1>
          <p className="text-muted-foreground">
            Characters shown on level splashes and end-of-level results.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:shrink-0">
          <Button type="button" size="lg" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Add mascot
          </Button>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            id={searchId}
            type="search"
            placeholder="Search mascots"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search mascots"
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <MascotCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load mascots.'}
        </p>
      ) : mascots.length === 0 ? (
        <p className="text-muted-foreground">No mascots yet.</p>
      ) : filteredMascots.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {filteredMascots.map((mascot) => (
            <MascotCard
              key={mascot.id}
              mascot={mascot}
              onEdit={() => openEdit(mascot)}
              onDelete={() => setMascotToDelete(mascot)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No matching mascots found.</p>
      )}

      <MascotFormDialog open={formOpen} onOpenChange={handleFormOpenChange} mascot={mascotToEdit} />

      <AlertDialog
        open={mascotToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMascotToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mascot?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              {mascotToDelete ? mascotLabel(mascotToDelete) : 'this mascot'}. Levels using it will
              have no mascot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMascot.isPending}
              onClick={() => {
                if (mascotToDelete) deleteMascot.mutate(mascotToDelete);
              }}
            >
              {deleteMascot.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
