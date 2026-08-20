import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, Users } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { DataTable } from '~/components/data-table';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { getUserColumns } from '~/components/users-columns';
import { api } from '~/lib/api';
import { pageTitle } from '~/lib/page-title';
import { type AdminUser, type AdminUserFlag, userLabel, usersQueryOptions } from '~/lib/users';
import { useAuthStore } from '~/stores/auth';

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

function flagToast(user: AdminUser, field: AdminUserFlag, enabled: boolean): string {
  const label = userLabel(user);
  switch (field) {
    case 'is_cheat':
      return enabled ? `Cheat enabled for ${label}` : `Cheat disabled for ${label}`;
    case 'is_staff':
      return enabled ? `Staff access granted to ${label}` : `Staff access removed from ${label}`;
    case 'is_active':
      return enabled ? `Activated ${label}` : `Deactivated ${label}`;
  }
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: users, isPending, isError, error } = useQuery(usersQueryOptions);

  const updateUser = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: AdminUserFlag; value: boolean }) =>
      api<AdminUser>(`/users/${id}`, {
        method: 'PATCH',
        body: { [field]: value },
      }),
    onSuccess: async (updated, { field, value }) => {
      toast.success(flagToast(updated, field, value));
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey });
    },
    onError: (updateError) => {
      toast.error('Failed to update user', {
        description: getErrorDescription(updateError),
      });
    },
  });

  const pending = updateUser.isPending
    ? { id: updateUser.variables.id, field: updateUser.variables.field }
    : undefined;
  const columns = useMemo(
    () =>
      getUserColumns({
        currentUserId,
        pending,
        onFlagChange: (id, field, value) => updateUser.mutate({ id, field, value }),
      }),
    [currentUserId, pending, updateUser],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4">
      <title>{pageTitle('Users')}</title>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage players and staff accounts. Search, sort, and toggle staff, active, and cheat
            from the table.
          </p>
        </div>
      </header>

      {isPending ? (
        <UsersTableSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Failed to load users</AlertTitle>
          <AlertDescription>
            {getErrorDescription(error) ?? 'Failed to load users.'}
          </AlertDescription>
        </Alert>
      ) : users.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No users yet</EmptyTitle>
            <EmptyDescription>Players appear here after they register.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          getRowId={(user) => String(user.id)}
          searchColumn="user"
          searchPlaceholder="Search (name or email)"
          emptyMessage="No matching users found."
        />
      )}
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="overflow-hidden rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="w-36">Joined</TableHead>
              <TableHead className="w-24 text-right">Staff</TableHead>
              <TableHead className="w-24 text-right">Active</TableHead>
              <TableHead className="w-24 text-right">Cheat Mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }, (_, index) => (
              <TableRow key={index}>
                <TableCell className="min-w-0">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-8 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-8 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-8 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
