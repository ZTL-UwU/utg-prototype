import { useTable, type Column, type ColumnDef, type RowData } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { useId } from 'react';

import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { dataTableFeatures, type DataTableFeatures } from '~/lib/data-table-features';
import { cn } from '~/lib/utils';

const PAGE_SIZE_ITEMS = [
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '50', value: '50' },
] as const;

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  emptyMessage?: string;
  getRowId?: (originalRow: TData) => string;
  searchColumn?: string;
  searchPlaceholder?: string;
}

export function DataTableColumnHeader<TData extends RowData, TValue>({
  className,
  column,
  title,
}: {
  className?: string;
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
}) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();
  const SortIcon =
    sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ChevronsUpDownIcon;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-2', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      <SortIcon data-icon="inline-end" />
    </Button>
  );
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = 'No results.',
  getRowId,
  searchColumn,
  searchPlaceholder = 'Search',
}: DataTableProps<TData>) {
  const searchId = useId();
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const search = searchColumn ? table.getColumn(searchColumn) : undefined;
  const pageCount = Math.max(table.getPageCount(), 1);
  const pageIndex = table.state.pagination.pageIndex;
  const pageSize = table.state.pagination.pageSize;

  return (
    <div className="flex flex-col gap-4">
      {search ? (
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            id={searchId}
            type="search"
            placeholder={searchPlaceholder}
            value={(search.getFilterValue() as string) ?? ''}
            onChange={(event) => search.setFilterValue(event.target.value)}
            aria-label={searchPlaceholder}
          />
          <InputGroupAddon align="inline-end">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        {/* Controls such as Switch and Checkbox extend an invisible 12px hit area past their
            box, which overflows the default cell padding and makes the table scroll sideways. */}
        <Table className="[&_tr>*:last-child]:pr-3">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {table.getRowCount()} {table.getRowCount() === 1 ? 'row' : 'rows'}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              items={PAGE_SIZE_ITEMS}
              value={String(pageSize)}
              onValueChange={(value) => {
                if (typeof value === 'string') table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="end">
                <SelectGroup>
                  {PAGE_SIZE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
