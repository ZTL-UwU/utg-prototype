import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  defaultLevelProps,
  isLevelTypeId,
  LEVEL_TYPE_IDS,
  LEVEL_TYPES,
  levelTypeLabel,
  type LevelTypeId,
} from '@utg/level-types';
import { GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { FetchError } from 'ofetch';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  LevelPropsFields,
} from '~/components/level-type-forms';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { ColorInput } from '~/components/ui/color-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import { Switch } from '~/components/ui/switch';
import { api } from '~/lib/api';
import { mascotsQueryOptions, type Level, type Mascot, type Unit } from '~/lib/game';
import { cn } from '~/lib/utils';

const NO_MASCOT_VALUE = '__no_mascot__';

const levelFormSchema = z.object({
  title: z.string().max(255, 'Title must be 255 characters or less.'),
  level_type: z.enum(LEVEL_TYPE_IDS, { error: 'Select a level type.' }),

  mascot_id: z.number().int().positive().nullable(),
  splash_button_color: z.number().int().nullable(),
  splash_button_text_color: z.number().int().nullable(),
  splash_level_font_color: z.number().int().nullable(),
  splash_level_title_color: z.number().int().nullable(),
  show_mascot_on_splash: z.boolean(),
  backdrop_color: z.number().int(),
  is_published: z.boolean(),
});

type LevelFormValues = z.infer<typeof levelFormSchema>;

type LevelWritePayload = Omit<LevelFormValues, 'title'> & {
  title: string | null;
  level_props: unknown;
};

type LevelFormApi = any;

type LevelEditorState = { mode: 'create'; level: null } | { mode: 'edit'; level: Level };

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}

async function invalidateLevelQueries(queryClient: QueryClient, unit: Unit) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['units', unit.id] }),
    queryClient.invalidateQueries({ queryKey: ['units', 'list'] }),
    queryClient.invalidateQueries({ queryKey: ['units', 'list-all'] }),
    queryClient.invalidateQueries({ queryKey: ['units', 'list-by-layer', unit.layer] }),
  ]);
}

function mascotLabel(mascot: Mascot): string {
  return mascot.name ?? `Mascot ${mascot.id}`;
}

function withDenseSortOrder(levels: Level[]): Level[] {
  return levels.map((level, index) => ({ ...level, sort_order: index + 1 }));
}

function hasSameLevelOrder(a: Level[], b: Level[]): boolean {
  return a.length === b.length && a.every((level, index) => level.id === b[index]?.id);
}

function levelPayload(values: LevelFormValues, levelProps: unknown): LevelWritePayload {
  const title = values.title.trim();
  return {
    ...values,
    title: title === '' ? null : title,
    level_props: levelProps,
  };
}

function defaultLevelType(level: Level | null): LevelTypeId {
  if (level && isLevelTypeId(level.level_type)) {
    return level.level_type;
  }
  return LEVEL_TYPE_IDS[0];
}

function defaultLevelValues(level: Level | null): LevelFormValues {
  return {
    title: level?.title ?? '',
    level_type: defaultLevelType(level),
    mascot_id: level?.mascot?.id ?? null,
    splash_button_color: level?.splash_button_color ?? null,
    splash_button_text_color: level?.splash_button_text_color ?? null,
    splash_level_font_color: level?.splash_level_font_color ?? null,
    splash_level_title_color: level?.splash_level_title_color ?? null,
    show_mascot_on_splash: level?.show_mascot_on_splash ?? false,
    backdrop_color: level?.backdrop_color ?? 0,
    is_published: level?.is_published ?? true,
  };
}

function mergeCurrentMascot(mascots: Mascot[], level: Level | null): Mascot[] {
  if (!level?.mascot || mascots.some((mascot) => mascot.id === level.mascot?.id)) {
    return mascots;
  }
  return [level.mascot, ...mascots];
}

export function UnitLevelsSection({ unit }: { unit: Unit }) {
  const queryClient = useQueryClient();
  const [levels, setLevels] = useState(() => withDenseSortOrder(unit.levels));
  const [editorState, setEditorState] = useState<LevelEditorState | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  const { data: mascots = [] } = useQuery(mascotsQueryOptions);

  useEffect(() => {
    setLevels(withDenseSortOrder(unit.levels));
  }, [unit.id, unit.levels]);

  const reorderLevels = useMutation({
    mutationFn: (levelIds: number[]) =>
      api<Unit>(`/units/${unit.id}/levels/order`, {
        method: 'PUT',
        body: { level_ids: levelIds },
      }),
    onSuccess: async (updatedUnit) => {
      setLevels(withDenseSortOrder(updatedUnit.levels));
      await invalidateLevelQueries(queryClient, updatedUnit);
    },
    onError: (error) => {
      setLevels(withDenseSortOrder(unit.levels));
      toast.error('Failed to reorder levels', {
        description: getErrorDescription(error),
      });
    },
  });

  const deleteLevel = useMutation({
    mutationFn: (level: Level) =>
      api<void>(`/levels/${level.id}`, {
        method: 'DELETE',
      }),
    onSuccess: async (_, deletedLevel) => {
      toast.success('Level deleted');
      setLevelToDelete(null);
      setLevels((currentLevels) =>
        withDenseSortOrder(currentLevels.filter((level) => level.id !== deletedLevel.id)),
      );
      await invalidateLevelQueries(queryClient, unit);
    },
    onError: (error) => {
      toast.error('Failed to delete level', {
        description: getErrorDescription(error),
      });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const nextLevels = withDenseSortOrder(move(levels, event) as Level[]);
    if (hasSameLevelOrder(levels, nextLevels)) return;
    setLevels(nextLevels);
    reorderLevels.mutate(nextLevels.map((level) => level.id));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-medium tracking-tight">Games</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditorState({ mode: 'create', level: null })}
        >
          <PlusIcon data-icon="inline-start" />
          Add game
        </Button>
      </div>

      {levels.length > 0 ? (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div aria-label="Unit level order" className="flex flex-col gap-3">
            {levels.map((level, index) => (
              <SortableLevelCard
                key={level.id}
                index={index}
                level={level}
                onEdit={() => setEditorState({ mode: 'edit', level })}
                onDelete={() => setLevelToDelete(level)}
                isReordering={reorderLevels.isPending}
              />
            ))}
          </div>
        </DragDropProvider>
      ) : (
        <Card className="bg-muted/40" size="sm">
          <CardHeader>
            <CardTitle>No games yet</CardTitle>
            <CardDescription>
              Add the first game, then drag cards to set play order.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <LevelEditorDialog
        unit={unit}
        level={editorState?.level ?? null}
        mascots={mascots}
        open={editorState !== null}
        onOpenChange={(open) => {
          if (!open) setEditorState(null);
        }}
      />

      <AlertDialog
        open={levelToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setLevelToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete level?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {levelToDelete?.title ?? 'this level'} from the unit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLevel.isPending}
              onClick={() => {
                if (levelToDelete) deleteLevel.mutate(levelToDelete);
              }}
            >
              {deleteLevel.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SortableLevelCard({
  index,
  level,
  onEdit,
  onDelete,
  isReordering,
}: {
  index: number;
  level: Level;
  onEdit: () => void;
  onDelete: () => void;
  isReordering: boolean;
}) {
  const { handleRef, isDragging, ref } = useSortable({ id: level.id, index });

  return (
    <Card ref={ref} size="sm" className={cn(isDragging && 'opacity-50')}>
      <CardHeader className="items-center">
        <div className="row-span-2 flex items-center gap-2">
          <Button
            ref={handleRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Reorder ${level.title ?? 'level'}`}
            disabled={isReordering}
          >
            <GripVerticalIcon />
          </Button>
          <CardTitle className="truncate">{level.title ?? 'Untitled level'}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{levelTypeLabel(level.level_type)}</span>
            <Badge variant={level.is_published ? 'secondary' : 'outline'}>
              {level.is_published ? 'Published' : 'Draft'}
            </Badge>
          </CardDescription>
        </div>
        <CardAction className="flex self-center items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onEdit}>
            <PencilIcon />
            <span className="sr-only">Edit {level.title ?? 'level'}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete}>
            <Trash2Icon />
            <span className="sr-only">Delete {level.title ?? 'level'}</span>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function LevelEditorDialog({
  unit,
  level,
  mascots,
  open,
  onOpenChange,
}: {
  unit: Unit;
  level: Level | null;
  mascots: Mascot[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Keep the Dialog mounted across open/close so Base UI can run enter/exit
  // transitions. Remount only the form body when a new editing session starts.
  const wasOpenRef = useRef(false);
  const sessionRef = useRef(0);
  const cachedLevelRef = useRef(level);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  if (open) {
    cachedLevelRef.current = level;
    if (!wasOpenRef.current) {
      sessionRef.current += 1;
    }
  }
  wasOpenRef.current = open;

  useEffect(() => {
    if (!open) {
      setIsDirty(false);
      setShowDiscardConfirm(false);
    }
  }, [open]);

  const displayLevel = cachedLevelRef.current;
  const formKey = `${displayLevel?.id ?? 'create'}-${sessionRef.current}`;

  function closeDialog() {
    setShowDiscardConfirm(false);
    setIsDirty(false);
    onOpenChange(false);
  }

  function requestClose() {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeDialog();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onOpenChange(true);
            return;
          }
          requestClose();
        }}
      >
        <DialogContent
          className="flex max-h-[min(90vh,56rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-3xl"
          showCloseButton={false}
        >
          <LevelEditorDialogForm
            key={formKey}
            unit={unit}
            level={displayLevel}
            mascots={mascots}
            onDirtyChange={setIsDirty}
            onRequestClose={requestClose}
            onOpenChange={onOpenChange}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard level changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved level changes. If you close now, your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={closeDialog}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LevelEditorDialogForm({
  unit,
  level,
  mascots,
  onDirtyChange,
  onRequestClose,
  onOpenChange,
}: {
  unit: Unit;
  level: Level | null;
  mascots: Mascot[];
  onDirtyChange: (dirty: boolean) => void;
  onRequestClose: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [isLevelFormDirty, setIsLevelFormDirty] = useState(false);
  const [isPropsFormDirty, setIsPropsFormDirty] = useState(false);
  const initialLevelType = defaultLevelType(level);
  const levelPropsRef = useRef<unknown>(
    level && level.level_type === initialLevelType
      ? level.level_props
      : defaultLevelProps(initialLevelType),
  );
  const availableMascots = mergeCurrentMascot(mascots, level);
  const isCreate = level === null;
  const isDirty = isLevelFormDirty || isPropsFormDirty;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const createLevel = useMutation({
    mutationFn: (payload: LevelWritePayload) =>
      api<Level>(`/units/${unit.id}/levels`, {
        method: 'POST',
        body: payload,
      }),
  });

  const updateLevel = useMutation({
    mutationFn: (payload: LevelWritePayload) => {
      if (!level) throw new Error('Level is required for update.');
      return api<Level>(`/levels/${level.id}`, {
        method: 'PATCH',
        body: payload,
      });
    },
  });

  const isSaving = createLevel.isPending || updateLevel.isPending;

  const form = useForm({
    defaultValues: defaultLevelValues(level),
    validators: {
      onSubmit: levelFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const payload = levelPayload(value, levelPropsRef.current);
      try {
        if (isCreate) {
          await createLevel.mutateAsync(payload);
          toast.success('Level created');
        } else {
          await updateLevel.mutateAsync(payload);
          toast.success('Level saved');
        }
        formApi.reset(value);
        setIsPropsFormDirty(false);
        await invalidateLevelQueries(queryClient, unit);
        onOpenChange(false);
      } catch (error) {
        toast.error(isCreate ? 'Failed to create level' : 'Failed to save level', {
          description: getErrorDescription(error),
        });
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isCreate ? 'Add game' : 'Edit game'}</DialogTitle>
      </DialogHeader>

      <form.Subscribe
        selector={(state) => !state.isDefaultValue}
        children={(dirty) => <DirtyStateBridge dirty={dirty} onDirtyChange={setIsLevelFormDirty} />}
      />
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-1">
        <LevelStaticFields form={form} mascots={availableMascots} />
        <Separator />
        <h3 className="text-lg font-medium">Game Parameters</h3>
        <form.Subscribe
          selector={(state) => state.values.level_type}
          children={(selectedLevelType) => (
            <LevelPropsFields
              key={`${level?.id ?? 'new'}-${selectedLevelType}`}
              level={level}
              levelType={selectedLevelType}
              onDirtyChange={setIsPropsFormDirty}
              onSubmit={(levelProps) => {
                levelPropsRef.current = levelProps;
                void form.handleSubmit();
              }}
            />
          )}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onRequestClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" form={LEVEL_PROPS_FORM_ID} disabled={isSaving}>
          {isSaving ? 'Saving...' : level ? 'Save level' : 'Create level'}
        </Button>
      </DialogFooter>
    </>
  );
}

function LevelStaticFields({ form, mascots }: { form: LevelFormApi; mascots: Mascot[] }) {
  return (
    <FieldGroup>
      <form.Field
        name="title"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Title</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="level_type"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Level type</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as LevelTypeId)}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  onBlur={field.handleBlur}
                  className="w-full"
                >
                  <SelectValue placeholder="Select a level type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {LEVEL_TYPE_IDS.map((levelTypeId) => (
                      <SelectItem key={levelTypeId} value={levelTypeId}>
                        {LEVEL_TYPES[levelTypeId].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="mascot_id"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Mascot</FieldLabel>
              <Select
                value={field.state.value === null ? NO_MASCOT_VALUE : String(field.state.value)}
                onValueChange={(value) =>
                  field.handleChange(value === NO_MASCOT_VALUE ? null : Number(value))
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  onBlur={field.handleBlur}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_MASCOT_VALUE}>No mascot</SelectItem>
                    {mascots.map((mascot) => (
                      <SelectItem key={mascot.id} value={String(mascot.id)}>
                        {mascotLabel(mascot)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NullableColorField form={form} name="splash_button_color" label="Button color" />
        <NullableColorField form={form} name="splash_button_text_color" label="Button text color" />
        <NullableColorField form={form} name="splash_level_font_color" label="Level font color" />
        <NullableColorField form={form} name="splash_level_title_color" label="Level title color" />
      </div>

      <form.Field
        name="backdrop_color"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Backdrop color</FieldLabel>
              <ColorInput
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(value) => field.handleChange(value ?? Number.NaN)}
                aria-invalid={isInvalid}
                required
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="show_mascot_on_splash"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Show mascot on splash</FieldLabel>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
                onBlur={field.handleBlur}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="is_published"
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Published</FieldLabel>
              <FieldDescription>Only published levels appear in the game.</FieldDescription>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
                onBlur={field.handleBlur}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />
    </FieldGroup>
  );
}

function NullableColorField({
  form,
  name,
  label,
}: {
  form: LevelFormApi;
  name:
    | 'splash_button_color'
    | 'splash_button_text_color'
    | 'splash_level_font_color'
    | 'splash_level_title_color';
  label: string;
}) {
  return (
    <form.Field
      name={name}
      children={(field: any) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <ColorInput
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              aria-invalid={isInvalid}
              nullable
            />
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    />
  );
}
