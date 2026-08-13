import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useRef, useState, type RefObject } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { Button } from '~/components/ui/button';
import { ColorInput } from '~/components/ui/color-input';
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
import { Switch } from '~/components/ui/switch';
import { UnitLevelsSection } from '~/components/unit-levels-section';
import { api } from '~/lib/api';
import { LAYERS, LAYER_TITLES, type Layer, type Unit } from '~/lib/game';

const unitFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  layer: z.enum(LAYERS, { error: 'Select a layer.' }),
  title_font_size: z.number().int().positive('Font size must be positive.'),
  title_font_color: z.number().int(),
  title_is_curved: z.boolean(),
  subtitle_text: z.string().max(255),
  subtitle_font_size: z.number().int().positive().nullable(),
  subtitle_font_color: z.number().int().nullable(),
  background_asset_path: z.string().min(1, 'Background asset path is required.').max(255),
  is_published: z.boolean(),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;

type UnitWritePayload = Omit<UnitFormValues, 'subtitle_text'> & {
  subtitle_text: string | null;
};

function parseNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseNullableNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unitPayload(values: UnitFormValues): UnitWritePayload {
  const subtitleText = values.subtitle_text.trim();
  return {
    ...values,
    subtitle_text: subtitleText === '' ? null : subtitleText,
  };
}

function defaultValuesForCreate(layer: Layer): UnitFormValues {
  return {
    title: '',
    layer,
    title_font_size: 48,
    title_font_color: 0xffffff,
    title_is_curved: false,
    subtitle_text: '',
    subtitle_font_size: null,
    subtitle_font_color: null,
    background_asset_path: '',
    is_published: false,
  };
}

function defaultValuesForEdit(unit: Unit): UnitFormValues {
  return {
    title: unit.title,
    layer: unit.layer,
    title_font_size: unit.title_font_size,
    title_font_color: unit.title_font_color,
    title_is_curved: unit.title_is_curved,
    subtitle_text: unit.subtitle_text ?? '',
    subtitle_font_size: unit.subtitle_font_size,
    subtitle_font_color: unit.subtitle_font_color,
    background_asset_path: unit.background_asset_path,
    is_published: unit.is_published,
  };
}

type UnitFormProps = { unit: Unit } | { unit?: undefined; defaultLayer: Layer };

export function UnitForm(props: UnitFormProps) {
  const unit = props.unit;
  const isCreate = unit === undefined;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const bypassBlockerRef = useRef(false);

  const { mutateAsync: saveUnit } = useMutation({
    mutationFn: (values: UnitFormValues) =>
      isCreate
        ? api<Unit>('/units', {
            method: 'POST',
            body: unitPayload(values),
          })
        : api<Unit>(`/units/${unit.id}`, {
            method: 'PATCH',
            body: unitPayload(values),
          }),
    onSuccess: async (saved) => {
      toast.success(isCreate ? 'Unit created' : 'Unit saved');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['units', saved.id] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list-all'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'sidebar'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list-by-layer', saved.layer] }),
        ...(!isCreate && unit.layer !== saved.layer
          ? [queryClient.invalidateQueries({ queryKey: ['units', 'list-by-layer', unit.layer] })]
          : []),
      ]);
    },
    onError: (error) => {
      toast.error(isCreate ? 'Failed to create unit' : 'Failed to save unit', {
        description: error instanceof FetchError ? error.data?.detail : error.message,
      });
    },
  });

  const deleteUnit = useMutation({
    mutationFn: () => {
      if (isCreate) throw new Error('Cannot delete a unit that has not been created.');
      return api<void>(`/units/${unit.id}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      if (isCreate) return;
      toast.success('Unit deleted');
      setDeleteOpen(false);
      queryClient.removeQueries({ queryKey: ['units', unit.id] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['units', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list-all'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'sidebar'] }),
        queryClient.invalidateQueries({ queryKey: ['units', 'list-by-layer', unit.layer] }),
      ]);
      bypassBlockerRef.current = true;
      void navigate(`/${unit.layer}`, { replace: true });
    },
    onError: (error) => {
      toast.error('Failed to delete unit', {
        description: error instanceof FetchError ? error.data?.detail : error.message,
      });
    },
  });

  const form = useForm({
    defaultValues: isCreate
      ? defaultValuesForCreate(props.defaultLayer)
      : defaultValuesForEdit(unit),
    validators: {
      onSubmit: unitFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const saved = await saveUnit(value);
      formApi.reset(value);
      if (isCreate || saved.layer !== unit.layer) {
        bypassBlockerRef.current = true;
        void navigate(`/${saved.layer}/${saved.id}`, { replace: true });
      }
    },
  });

  const cancelLayer = isCreate ? props.defaultLayer : unit.layer;

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe
          selector={(state) => !state.isDefaultValue}
          children={(hasUnsavedChanges) => (
            <UnsavedChangesBlocker when={hasUnsavedChanges} bypassRef={bypassBlockerRef} />
          )}
        />
        <FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto]">
            <form.Field
              name="title"
              children={(field) => {
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
                      required
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="layer"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid} className="sm:min-w-40">
                    <FieldLabel htmlFor={field.name}>Layer</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (
                          typeof value === 'string' &&
                          LAYERS.includes(value as (typeof LAYERS)[number])
                        ) {
                          field.handleChange(value as UnitFormValues['layer']);
                        }
                      }}
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
                          {LAYERS.map((layer) => (
                            <SelectItem key={layer} value={layer}>
                              {LAYER_TITLES[layer]}
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
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <form.Field
              name="title_font_size"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title font size</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={Number.isNaN(field.state.value) ? '' : field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(parseNumberInput(event.target.value))}
                      aria-invalid={isInvalid}
                      required
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="title_font_color"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title font color</FieldLabel>
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
          </div>

          <form.Field
            name="title_is_curved"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Curved title</FieldLabel>
                  <FieldDescription>
                    Render the unit title along a curve on the map
                  </FieldDescription>
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
            name="subtitle_text"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Subtitle</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    dir="auto"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <form.Field
              name="subtitle_font_size"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Subtitle font size</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(parseNullableNumber(event.target.value))
                      }
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="subtitle_font_color"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Subtitle font color</FieldLabel>
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
          </div>

          <form.Field
            name="background_asset_path"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Background asset path</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          {!isCreate && <UnitLevelsSection unit={unit} />}

          <form.Field
            name="is_published"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Published</FieldLabel>
                  <FieldDescription>Only published levels will appear in the game</FieldDescription>
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

          <Field>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <div className="flex flex-wrap items-center gap-2">
                  {!isCreate ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isSubmitting || deleteUnit.isPending}
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  ) : null}
                  <div className="ml-auto flex gap-2">
                    <Button type="submit" disabled={isSubmitting || deleteUnit.isPending}>
                      {isSubmitting
                        ? isCreate
                          ? 'Creating…'
                          : 'Saving…'
                        : isCreate
                          ? 'Create Unit'
                          : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate(`/${cancelLayer}`)}
                      variant="outline"
                      disabled={isSubmitting || deleteUnit.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            />
          </Field>
        </FieldGroup>
      </form>

      {!isCreate ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete unit?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes {unit.title} and all of its levels.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={deleteUnit.isPending}
                onClick={() => deleteUnit.mutate()}
              >
                {deleteUnit.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

function UnsavedChangesBlocker({
  when,
  bypassRef,
}: {
  when: boolean;
  bypassRef: RefObject<boolean>;
}) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypassRef.current && when && currentLocation.pathname !== nextLocation.pathname,
  );

  return (
    <AlertDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') {
          blocker.reset();
        }
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. If you leave now, your edits will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (blocker.state === 'blocked') {
                blocker.proceed();
              }
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
