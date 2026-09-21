import { useTable, type Column, type ColumnDef, type RowData } from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from 'lucide-react';
import { useId } from 'react';

import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
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

const PAGE_WINDOW = 5;

function visiblePageIndexes(pageIndex: number, pageCount: number): number[] {
  if (pageCount <= PAGE_WINDOW) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }
  const start = Math.min(Math.max(pageIndex - 2, 0), pageCount - PAGE_WINDOW);
  return Array.from({ length: PAGE_WINDOW }, (_, index) => start + index);
}

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  emptyMessage?: string;
  getRowId?: (originalRow: TData) => string;
  onRowClick?: (row: TData) => void;
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
  onRowClick,
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
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={
                    onRowClick
                      ? (event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest('a, button, input, select, textarea')) return;
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          const target = event.target as HTMLElement;
                          if (target !== event.currentTarget) return;
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                >
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

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          {visiblePageIndexes(pageIndex, pageCount).map((index) => {
            const current = index === pageIndex;
            return (
              <Button
                key={index}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Page ${index + 1}`}
                aria-current={current ? 'page' : undefined}
                className={cn('font-normal tabular-nums', current && 'border-border')}
                onClick={() => table.setPageIndex(index)}
              >
                {index + 1}
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
