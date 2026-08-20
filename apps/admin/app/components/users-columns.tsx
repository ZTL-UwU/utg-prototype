import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { CircleHelpIcon } from 'lucide-react';

import { DataTableColumnHeader } from '~/components/data-table';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { type DataTableFeatures } from '~/lib/data-table-features';
import { type AdminUser, type AdminUserFlag, userLabel } from '~/lib/users';

const columnHelper = createColumnHelper<DataTableFeatures, AdminUser>();

export function getUserColumns({
  currentUserId,
  onFlagChange,
  pending,
}: {
  currentUserId?: number;
  onFlagChange: (id: number, field: AdminUserFlag, value: boolean) => void;
  pending?: { id: number; field: AdminUserFlag };
}) {
  return columnHelper.columns([
    columnHelper.accessor((user) => [user.name, user.email].filter(Boolean).join(' '), {
      id: 'user',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{userLabel(user)}</span>
            {user.name?.trim() ? <span className="text-muted-foreground">{user.email}</span> : null}
          </div>
        );
      },
      filterFn: 'includesString',
      sortFn: 'text',
    }),
    columnHelper.accessor('date_joined', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(getValue()), { addSuffix: true })}
        </span>
      ),
      sortFn: 'alphanumeric',
    }),
    flagColumn({
      accessor: 'is_staff',
      title: 'Staff',
      help: 'Staff accounts can access the admin portal and be granted permissions.',
      ariaLabel: (user) => `Staff access for ${user.email}`,
      currentUserId,
      disableSelf: true,
      selfDisabledReason: 'You cannot remove your own staff access.',
      onFlagChange,
      pending,
    }),
    flagColumn({
      accessor: 'is_active',
      title: 'Active',
      help: 'Inactive accounts cannot sign in.',
      ariaLabel: (user) => `Active account for ${user.email}`,
      currentUserId,
      disableSelf: true,
      selfDisabledReason: 'You cannot deactivate your own account.',
      onFlagChange,
      pending,
    }),
    flagColumn({
      accessor: 'is_cheat',
      title: 'Cheat Mode',
      help: 'Unlocks every published level for this user, skipping normal progression.',
      ariaLabel: (user) => `Unlock all levels for ${user.email}`,
      currentUserId,
      onFlagChange,
      pending,
    }),
  ]);
}

function flagColumn({
  accessor,
  ariaLabel,
  currentUserId,
  disableSelf = false,
  help,
  onFlagChange,
  pending,
  selfDisabledReason,
  title,
}: {
  accessor: AdminUserFlag;
  ariaLabel: (user: AdminUser) => string;
  currentUserId?: number;
  disableSelf?: boolean;
  help: string;
  onFlagChange: (id: number, field: AdminUserFlag, value: boolean) => void;
  pending?: { id: number; field: AdminUserFlag };
  selfDisabledReason?: string;
  title: string;
}) {
  return columnHelper.accessor(accessor, {
    header: ({ column }) => (
      <div className="ml-auto flex items-center justify-end">
        <DataTableColumnHeader column={column} title={title} />
        <HeaderHelp label={title} text={help} />
      </div>
    ),
    cell: ({ row }) => {
      const user = row.original;
      const isSelf = disableSelf && user.id === currentUserId;
      const isPending = pending?.id === user.id && pending.field === accessor;
      return (
        <Switch
          id={`${accessor}-${user.id}`}
          className="ml-auto"
          checked={user[accessor]}
          disabled={isSelf || isPending}
          title={isSelf ? selfDisabledReason : undefined}
          onCheckedChange={(checked) => onFlagChange(user.id, accessor, checked)}
          aria-label={ariaLabel(user)}
        />
      );
    },
    enableSorting: false,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  });
}

function HeaderHelp({ label, text }: { label: string; text: string }) {
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label={`About ${label}`}
        >
          <CircleHelpIcon />
        </TooltipTrigger>
        <TooltipContent className="text-left">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
