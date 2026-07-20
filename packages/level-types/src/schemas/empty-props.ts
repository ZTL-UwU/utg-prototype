import { z } from 'zod';

/** Shared empty props for typing/game levels with no configurable fields. */
export const emptyPropsSchema = z.object({});

export type EmptyProps = z.infer<typeof emptyPropsSchema>;

export function defaultEmptyProps(): EmptyProps {
  return {};
}
