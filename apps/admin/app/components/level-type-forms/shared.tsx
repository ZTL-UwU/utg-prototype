import { useEffect } from 'react';

export const LEVEL_PROPS_FORM_ID = 'level-props-form';

export type LevelPropsFormProps<TProps> = {
  defaultValues: TProps;
  onSubmit: (levelProps: TProps) => void;
  onDirtyChange: (dirty: boolean) => void;
};

export function DirtyStateBridge({
  dirty,
  onDirtyChange,
}: {
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  return null;
}
