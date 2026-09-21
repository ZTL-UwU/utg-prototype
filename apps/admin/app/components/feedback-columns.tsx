import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';

import { DataTableColumnHeader } from '~/components/data-table';
import { Badge } from '~/components/ui/badge';
import { type DataTableFeatures } from '~/lib/data-table-features';
import {
  FEEDBACK_REQUEST_TYPE_LABELS,
  type FeedbackReport,
  feedbackAuthor,
  feedbackHeadline,
  feedbackSearchText,
  feedbackTypeBadgeVariant,
} from '~/lib/feedback';
import { mediaUrl } from '~/lib/utils';

const columnHelper = createColumnHelper<DataTableFeatures, FeedbackReport>();

export function getFeedbackColumns() {
  return columnHelper.columns([
    columnHelper.accessor(feedbackSearchText, {
      id: 'report',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Report" />,
      cell: ({ row }) => {
        const feedback = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={mediaUrl(feedback.image.url)}
              alt=""
              className="size-10 shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
            />
            <span className="truncate font-medium">{feedbackHeadline(feedback)}</span>
          </div>
        );
      },
      filterFn: 'includesString',
      sortFn: 'text',
    }),
    columnHelper.accessor((feedback) => FEEDBACK_REQUEST_TYPE_LABELS[feedback.request_type], {
      id: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant={feedbackTypeBadgeVariant(row.original.request_type)}>
          {FEEDBACK_REQUEST_TYPE_LABELS[row.original.request_type]}
        </Badge>
      ),
      sortFn: 'text',
      meta: {
        headerClassName: 'w-36',
        cellClassName: 'w-36',
      },
    }),
    columnHelper.accessor(feedbackAuthor, {
      id: 'user',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const user = row.original.user;
        if (!user) {
          return <span className="text-muted-foreground">Guest</span>;
        }
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate">{feedbackAuthor(row.original)}</span>
            {user.name?.trim() ? (
              <span className="truncate text-muted-foreground">{user.email}</span>
            ) : null}
          </div>
        );
      },
      sortFn: 'text',
    }),
    columnHelper.accessor('screen', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Screen" />,
      cell: ({ getValue }) => {
        const screen = getValue();
        return (
          <span className="truncate text-muted-foreground" title={screen || undefined}>
            {screen || '—'}
          </span>
        );
      },
      sortFn: 'text',
      meta: {
        headerClassName: 'w-40 max-w-40',
        cellClassName: 'w-40 max-w-40',
      },
    }),
    columnHelper.accessor('created_at', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(getValue()), { addSuffix: true })}
        </span>
      ),
      sortFn: 'alphanumeric',
      meta: {
        headerClassName: 'w-40',
        cellClassName: 'w-40',
      },
    }),
    columnHelper.accessor('is_resolved', {
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="secondary">Resolved</Badge>
        ) : (
          <Badge variant="default">Open</Badge>
        ),
      sortFn: 'basic',
      meta: {
        headerClassName: 'w-28',
        cellClassName: 'w-28',
      },
    }),
  ]);
}
