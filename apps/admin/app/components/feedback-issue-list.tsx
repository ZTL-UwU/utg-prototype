import { formatDistanceToNow } from 'date-fns';
import { ArrowUpDown, ChevronDown, CircleCheck, CircleDot, SearchIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Skeleton } from '~/components/ui/skeleton';
import {
  FEEDBACK_REQUEST_TYPES,
  FEEDBACK_REQUEST_TYPE_LABELS,
  FEEDBACK_TYPE_LABEL_CLASS,
  type FeedbackReport,
  type FeedbackRequestType,
  feedbackAuthor,
  feedbackHeadline,
  feedbackSearchText,
} from '~/lib/feedback';
import { cn, mediaUrl } from '~/lib/utils';

type StatusFilter = 'open' | 'closed';
type SortOrder = 'newest' | 'oldest';

export function FeedbackTypeLabel({ type }: { type: FeedbackRequestType }) {
  return (
    <Badge className={FEEDBACK_TYPE_LABEL_CLASS[type]}>{FEEDBACK_REQUEST_TYPE_LABELS[type]}</Badge>
  );
}

export function FeedbackIssueList({
  reports,
  onSelect,
}: {
  reports: FeedbackReport[];
  onSelect: (report: FeedbackReport) => void;
}) {
  const [status, setStatus] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');
  const [authorId, setAuthorId] = useState('all');
  const [types, setTypes] = useState<FeedbackRequestType[]>([]);
  const [screen, setScreen] = useState('all');
  const [sort, setSort] = useState<SortOrder>('newest');

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    for (const report of reports) {
      const id = report.user ? String(report.user.id) : 'guest';
      if (!map.has(id)) map.set(id, feedbackAuthor(report));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [reports]);

  const screens = useMemo(() => {
    return [...new Set(reports.map((report) => report.screen).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [reports]);

  const matching = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (authorId !== 'all') {
        const id = report.user ? String(report.user.id) : 'guest';
        if (id !== authorId) return false;
      }
      if (types.length > 0 && !types.includes(report.request_type)) return false;
      if (screen !== 'all' && report.screen !== screen) return false;
      if (query && !feedbackSearchText(report).toLowerCase().includes(query)) return false;
      return true;
    });
  }, [reports, search, authorId, types, screen]);

  const openCount = matching.filter((report) => !report.is_resolved).length;
  const closedCount = matching.length - openCount;

  const visible = useMemo(() => {
    const rows = matching.filter((report) =>
      status === 'open' ? !report.is_resolved : report.is_resolved,
    );
    rows.sort((a, b) => {
      const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === 'newest' ? -delta : delta;
    });
    return rows;
  }, [matching, status, sort]);

  const filtersActive =
    authorId !== 'all' || types.length > 0 || screen !== 'all' || Boolean(search.trim());
  const authorLabel = authors.find((author) => author.id === authorId)?.label;
  const onlyType = types.length === 1 ? types[0] : undefined;
  const labelButton = onlyType
    ? FEEDBACK_REQUEST_TYPE_LABELS[onlyType]
    : types.length > 1
      ? `Labels (${types.length})`
      : 'Labels';

  function toggleType(type: FeedbackRequestType, checked: boolean) {
    setTypes((current) => (checked ? [...current, type] : current.filter((item) => item !== type)));
  }

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="w-full max-w-sm">
        <InputGroupInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search feedback"
          aria-label="Search feedback"
        />
        <InputGroupAddon align="inline-end">
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1">
            <StatusTab
              active={status === 'open'}
              count={openCount}
              label="Open"
              onClick={() => setStatus('open')}
            />
            <StatusTab
              active={status === 'closed'}
              count={closedCount}
              label="Closed"
              onClick={() => setStatus('closed')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            <FilterMenu label={authorLabel ?? 'Author'} active={authorId !== 'all'}>
              <DropdownMenuRadioGroup value={authorId} onValueChange={setAuthorId}>
                <DropdownMenuGroup>
                  <DropdownMenuRadioItem value="all">All authors</DropdownMenuRadioItem>
                  {authors.map((author) => (
                    <DropdownMenuRadioItem key={author.id} value={author.id}>
                      <span className="truncate">{author.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuRadioGroup>
            </FilterMenu>
            <FilterMenu label={labelButton} active={types.length > 0}>
              <DropdownMenuGroup>
                {FEEDBACK_REQUEST_TYPES.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={types.includes(type)}
                    onCheckedChange={(checked) => toggleType(type, checked)}
                  >
                    {FEEDBACK_REQUEST_TYPE_LABELS[type]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </FilterMenu>
            {screens.length > 0 ? (
              <FilterMenu label={screen === 'all' ? 'Screen' : screen} active={screen !== 'all'}>
                <DropdownMenuRadioGroup value={screen} onValueChange={setScreen}>
                  <DropdownMenuGroup>
                    <DropdownMenuRadioItem value="all">All screens</DropdownMenuRadioItem>
                    {screens.map((name) => (
                      <DropdownMenuRadioItem key={name} value={name}>
                        <span className="truncate">{name}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuRadioGroup>
              </FilterMenu>
            ) : null}
            <FilterMenu
              label={sort === 'newest' ? 'Newest' : 'Oldest'}
              icon={<ArrowUpDown data-icon="inline-start" />}
            >
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortOrder)}
              >
                <DropdownMenuGroup>
                  <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                </DropdownMenuGroup>
              </DropdownMenuRadioGroup>
            </FilterMenu>
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {filtersActive
              ? 'No matching feedback.'
              : status === 'open'
                ? 'No open feedback.'
                : 'No closed feedback.'}
          </p>
        ) : (
          <ul>
            {visible.map((report) => (
              <li key={report.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(report)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  {report.is_resolved ? (
                    <CircleCheck className="mt-1 size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <CircleDot className="mt-1 size-4 shrink-0 text-green-600 dark:text-green-500" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-semibold leading-snug break-words">
                      {feedbackHeadline(report)}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>#{report.id}</span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="max-w-40 truncate font-medium text-foreground">
                          {feedbackAuthor(report)}
                        </span>
                      </span>
                      <span>
                        opened{' '}
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <FeedbackTypeLabel type={report.request_type} />
                      {report.screen ? (
                        <Badge variant="outline" className="max-w-48">
                          <span className="truncate">{report.screen}</span>
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <img
                    src={mediaUrl(report.image.url)}
                    alt=""
                    className="h-17 w-20 shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted',
        active ? 'font-semibold text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      <Badge variant="secondary" className="tabular-nums">
        {count}
      </Badge>
    </button>
  );
}

function FilterMenu({
  label,
  active = false,
  icon,
  children,
}: {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'max-w-40 font-normal text-muted-foreground',
              active && 'font-medium text-foreground',
            )}
          />
        }
      >
        {icon}
        <span className="truncate">{label}</span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FeedbackIssueListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="overflow-hidden rounded-lg border">
        <div className="flex h-12 items-center justify-between gap-3 border-b bg-muted/50 px-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="mt-1 size-4 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3 max-w-sm" />
              <Skeleton className="h-3 w-1/2 max-w-xs" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-14 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
