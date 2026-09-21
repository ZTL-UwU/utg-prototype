import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CircleAlertIcon,
  ExternalLink,
  MessageSquareWarning,
  RotateCcw,
} from 'lucide-react';
import { FetchError } from 'ofetch';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  FeedbackIssueList,
  FeedbackIssueListSkeleton,
  FeedbackTypeLabel,
} from '~/components/feedback-issue-list';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { api } from '~/lib/api';
import {
  type FeedbackReport,
  feedbackAuthor,
  feedbackHeadline,
  feedbackListQueryOptions,
  formatFeedbackDate,
} from '~/lib/feedback';
import { pageTitle } from '~/lib/page-title';
import { mediaUrl } from '~/lib/utils';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery(feedbackListQueryOptions);
  const [selected, setSelected] = useState<FeedbackReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateResolved = useMutation({
    mutationFn: ({ feedback, isResolved }: { feedback: FeedbackReport; isResolved: boolean }) =>
      api<FeedbackReport>(`/feedback/${feedback.id}`, {
        method: 'PATCH',
        body: { is_resolved: isResolved },
      }),
    onSuccess: async (updated) => {
      toast.success(updated.is_resolved ? 'Marked as resolved' : 'Reopened report');
      setSelected(updated);
      await queryClient.invalidateQueries({ queryKey: feedbackListQueryOptions.queryKey });
    },
    onError: (updateError) => {
      toast.error('Failed to update feedback', {
        description: getErrorDescription(updateError),
      });
    },
  });

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4">
      <title>{pageTitle('Feedback')}</title>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            Reports sent from the game. Open a report to see the screenshot and notes.
          </p>
        </div>
      </header>

      {isPending ? (
        <FeedbackIssueListSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Failed to load feedback</AlertTitle>
          <AlertDescription>
            {getErrorDescription(error) ?? 'Failed to load feedback.'}
          </AlertDescription>
        </Alert>
      ) : data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareWarning />
            </EmptyMedia>
            <EmptyTitle>No feedback yet</EmptyTitle>
            <EmptyDescription>
              When players send feedback from the game, it will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FeedbackIssueList
          reports={data}
          onSelect={(feedback) => {
            setSelected(feedback);
            setDialogOpen(true);
          }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selected ? (
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <FeedbackTypeLabel type={selected.request_type} />
                {selected.is_resolved ? <Badge variant="secondary">Resolved</Badge> : null}
                <span className="text-xs text-muted-foreground">
                  #{selected.id} · {formatFeedbackDate(selected.created_at)}
                </span>
              </div>
              <DialogTitle className="text-xl leading-snug break-words">
                {feedbackHeadline(selected)}
              </DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto py-1">
              <figure className="flex flex-col gap-2">
                <figcaption className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Screenshot</span>
                  <a
                    href={mediaUrl(selected.image.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Open full size
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </figcaption>
                <a
                  href={mediaUrl(selected.image.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-lg border bg-muted"
                >
                  <img
                    src={mediaUrl(selected.image.url)}
                    alt={`Annotated screenshot for ${feedbackHeadline(selected)}`}
                    loading="lazy"
                    className="max-h-[38vh] w-full object-contain transition group-hover:opacity-95"
                  />
                </a>
              </figure>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">Description</p>
                {selected.description.trim() ? (
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {selected.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <dt className="text-sm font-medium">Reporter</dt>
                  <dd className="truncate text-sm leading-relaxed" title={feedbackAuthor(selected)}>
                    {feedbackAuthor(selected)}
                  </dd>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <dt className="text-sm font-medium">Screen</dt>
                  <dd
                    className="truncate text-sm leading-relaxed"
                    title={selected.screen || undefined}
                  >
                    {selected.screen || '—'}
                  </dd>
                </div>
              </dl>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant={selected.is_resolved ? 'outline' : 'default'}
                disabled={updateResolved.isPending}
                onClick={() =>
                  updateResolved.mutate({
                    feedback: selected,
                    isResolved: !selected.is_resolved,
                  })
                }
              >
                {selected.is_resolved ? (
                  <RotateCcw data-icon="inline-start" />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                {updateResolved.isPending
                  ? 'Saving...'
                  : selected.is_resolved
                    ? 'Reopen report'
                    : 'Mark as resolved'}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
