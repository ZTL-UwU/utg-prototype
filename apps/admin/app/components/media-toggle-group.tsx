import type { LucideIcon } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

/** Tri-state has/missing filter: `[]` means no filter. */
export type MediaFilter = 'with' | 'without';

/**
 * A has/missing filter pair for one media field.
 *
 * The underlying ToggleGroup is multi-select, but only the first value is ever read —
 * selecting one clears the other, giving three effective states.
 */
export function MediaToggleGroup({
  label,
  value,
  onChange,
  withIcon: WithIcon,
  withoutIcon: WithoutIcon,
  withLabel,
  withoutLabel,
}: {
  label: string;
  value: MediaFilter[];
  onChange: (value: MediaFilter[]) => void;
  withIcon: LucideIcon;
  withoutIcon: LucideIcon;
  withLabel: string;
  withoutLabel: string;
}) {
  return (
    <ToggleGroup
      variant="outline"
      value={value}
      onValueChange={(next) => onChange(next as MediaFilter[])}
      aria-label={label}
    >
      <ToggleGroupItem value="with" aria-label={withLabel}>
        <WithIcon data-icon="inline-start" />
        {withLabel}
      </ToggleGroupItem>
      <ToggleGroupItem value="without" aria-label={withoutLabel}>
        <WithoutIcon data-icon="inline-start" />
        {withoutLabel}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
