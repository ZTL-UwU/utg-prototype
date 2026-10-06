import { ChevronDown, type LucideIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

/** `null` means no filter. */
export type MediaFilter = 'with' | 'without';

/**
 * A quiet has/missing filter for one media field.
 * The closed control shows only the field name until a filter is applied.
 */
export function MediaFilterMenu({
  label,
  value,
  onChange,
  icon: Icon,
  anyIcon: AnyIcon,
  withIcon: WithIcon,
  withoutIcon: WithoutIcon,
}: {
  label: string;
  value: MediaFilter | null;
  onChange: (value: MediaFilter | null) => void;
  icon: LucideIcon;
  anyIcon: LucideIcon;
  withIcon: LucideIcon;
  withoutIcon: LucideIcon;
}) {
  const TriggerIcon = value === 'with' ? WithIcon : value === 'without' ? WithoutIcon : Icon;
  const triggerLabel =
    value === 'with'
      ? `Has ${label.toLowerCase()}`
      : value === 'without'
        ? `Missing ${label.toLowerCase()}`
        : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Filter by ${label.toLowerCase()}`}
            className={cn(
              'max-w-52 font-normal text-muted-foreground',
              value && 'font-medium text-foreground',
            )}
          />
        }
      >
        <TriggerIcon data-icon="inline-start" />
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max">
        <DropdownMenuRadioGroup
          value={value ?? 'any'}
          onValueChange={(next) => onChange(next === 'any' ? null : (next as MediaFilter))}
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem className="whitespace-nowrap" closeOnClick value="any">
              <AnyIcon />
              All
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className="whitespace-nowrap" closeOnClick value="with">
              <WithIcon />
              Has {label.toLowerCase()}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className="whitespace-nowrap" closeOnClick value="without">
              <WithoutIcon />
              Missing {label.toLowerCase()}
            </DropdownMenuRadioItem>
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
