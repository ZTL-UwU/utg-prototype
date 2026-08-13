import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Images, Trophy } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RewardImageLibrary } from '~/components/reward-image-library';
import { RewardImagePicker } from '~/components/reward-image-picker';
import { RewardThumbButton } from '~/components/reward-thumb-button';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/lib/api';
import { LAYERS, LAYER_TITLES, isLayer, type Layer } from '~/lib/game';
import { pageTitle } from '~/lib/page-title';
import {
  LAYER_REWARD_TYPE,
  LEVEL_REWARD_TYPES,
  REWARD_TYPE_LABELS,
  getErrorDescription,
  type LevelRewardType,
  type Reward,
  type RewardBulkResult,
  type RewardImage,
  type RewardUnitLevel,
  type RewardWrite,
  rewardImagesQueryOptions,
  rewardUnitsQueryOptions,
  rewardsQueryOptions,
} from '~/lib/rewards';
import { cn, mediaUrl } from '~/lib/utils';

type PickerTarget =
  | { kind: 'trophy' }
  | { kind: 'default'; type: LevelRewardType }
  | { kind: 'cell'; type: LevelRewardType; levelId: number; levelName: string };

type ApplyMode = 'fill_missing' | 'overwrite';

const EMPTY_DEFAULTS: Record<LevelRewardType, number | null> = {
  level_completion_badge: null,
  level_three_stars_badge: null,
  level_perfect_badge: null,
};

/** Shared column template so the coverage header and its rows stay aligned. */
const COVERAGE_ROW = 'grid grid-cols-[minmax(0,1fr)_repeat(3,3rem)] items-center gap-4 px-4';

function rewardKey(type: string, levelId: number) {
  return `${type}:${levelId}`;
}

function levelName(level: RewardUnitLevel) {
  return level.title?.trim() || `Game ${level.id}`;
}

function isLevelRewardTypeEnabled(layer: Layer, type: LevelRewardType) {
  if (layer === 'education' && type === 'level_perfect_badge') return false;
  if (layer === 'typing' && type === 'level_completion_badge') return false;
  return true;
}

function disabledRewardTypeReason(layer: Layer, type: LevelRewardType) {
  return `${REWARD_TYPE_LABELS[type]} badges are not used in the ${LAYER_TITLES[layer].toLocaleLowerCase()} layer`;
}

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const [layer, setLayer] = useState<Layer>('education');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [defaultImageIds, setDefaultImageIds] =
    useState<Record<LevelRewardType, number | null>>(EMPTY_DEFAULTS);
  const [applying, setApplying] = useState<string | null>(null);

  const rewardsQuery = useQuery(rewardsQueryOptions);
  const imagesQuery = useQuery(rewardImagesQueryOptions);
  const unitsQuery = useQuery(rewardUnitsQueryOptions);

  const imagesById = useMemo(() => {
    const map = new Map<number, RewardImage>();
    for (const image of imagesQuery.data ?? []) {
      map.set(image.id, image);
    }
    return map;
  }, [imagesQuery.data]);

  const { byLevel, trophy } = useMemo(() => {
    const nextByLevel = new Map<string, Reward>();
    let nextTrophy: Reward | undefined;
    for (const reward of rewardsQuery.data ?? []) {
      if (reward.layer !== layer) continue;
      if (reward.level == null) {
        if (reward.type === LAYER_REWARD_TYPE) nextTrophy = reward;
        continue;
      }
      nextByLevel.set(rewardKey(reward.type, reward.level), reward);
    }
    return { byLevel: nextByLevel, trophy: nextTrophy };
  }, [rewardsQuery.data, layer]);

  const units = useMemo(
    () => (unitsQuery.data ?? []).filter((unit) => unit.layer === layer),
    [unitsQuery.data, layer],
  );
  const levels = useMemo(() => units.flatMap((unit) => unit.levels), [units]);
  const totalLevels = levels.length;

  async function invalidateRewardQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: rewardsQueryOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: rewardImagesQueryOptions.queryKey }),
    ]);
  }

  const saveReward = useMutation({
    mutationFn: ({ existing, payload }: { existing?: Reward; payload: RewardWrite }) => {
      if (existing) {
        return api<Reward>(`/rewards/${existing.id}`, {
          method: 'PATCH',
          body: payload,
        });
      }
      return api<Reward>('/rewards', {
        method: 'POST',
        body: payload,
      });
    },
  });

  const removeReward = useMutation({
    mutationFn: (reward: Reward) =>
      api<void>(`/rewards/${reward.id}`, {
        method: 'DELETE',
      }),
  });

  const bulkRewards = useMutation({
    mutationFn: (body: { items: RewardWrite[]; mode: ApplyMode }) =>
      api<RewardBulkResult>('/rewards/bulk', {
        method: 'POST',
        body,
      }),
  });

  async function assignReward(existing: Reward | undefined, payload: RewardWrite, success: string) {
    try {
      await saveReward.mutateAsync({ existing, payload });
      toast.success(success);
      await invalidateRewardQueries();
    } catch (error) {
      toast.error('Failed to save reward', {
        description: getErrorDescription(error),
      });
      throw error;
    }
  }

  async function clearReward(reward: Reward | undefined, success: string) {
    if (!reward) return;
    try {
      await removeReward.mutateAsync(reward);
      toast.success(success);
      await invalidateRewardQueries();
    } catch (error) {
      toast.error('Failed to clear reward', {
        description: getErrorDescription(error),
      });
      throw error;
    }
  }

  async function applyType(type: LevelRewardType, mode: ApplyMode) {
    if (!isLevelRewardTypeEnabled(layer, type)) return;
    const imageId = defaultImageIds[type];
    if (imageId == null) return;
    if (levels.length === 0) {
      toast.error('This layer has no levels to assign.');
      return;
    }

    const items: RewardWrite[] = levels.map((level) => ({
      type,
      layer,
      level: level.id,
      image_id: imageId,
      is_published: true,
    }));

    setApplying(`${type}:${mode}`);
    try {
      const result = await bulkRewards.mutateAsync({ items, mode });
      const parts = [
        result.created ? `created ${result.created}` : null,
        result.updated ? `updated ${result.updated}` : null,
        result.skipped ? `left ${result.skipped} unchanged` : null,
      ].filter(Boolean);
      toast.success(parts.join(', ') || 'No changes');
      await invalidateRewardQueries();
    } catch (error) {
      toast.error('Failed to apply images', {
        description: getErrorDescription(error),
      });
    } finally {
      setApplying(null);
    }
  }

  async function handlePick(image: RewardImage) {
    if (!pickerTarget) return;

    if (pickerTarget.kind === 'default') {
      if (!isLevelRewardTypeEnabled(layer, pickerTarget.type)) return;
      setDefaultImageIds((prev) => ({ ...prev, [pickerTarget.type]: image.id }));
      return;
    }

    if (pickerTarget.kind === 'trophy') {
      await assignReward(
        trophy,
        {
          type: LAYER_REWARD_TYPE,
          layer,
          level: null,
          image_id: image.id,
          is_published: trophy?.is_published ?? true,
        },
        trophy ? 'Trophy image updated' : 'Trophy assigned',
      );
      return;
    }

    const existing = byLevel.get(rewardKey(pickerTarget.type, pickerTarget.levelId));
    if (!isLevelRewardTypeEnabled(layer, pickerTarget.type)) return;
    await assignReward(
      existing,
      {
        type: pickerTarget.type,
        layer,
        level: pickerTarget.levelId,
        image_id: image.id,
        is_published: existing?.is_published ?? true,
      },
      existing ? 'Badge image updated' : 'Badge assigned',
    );
  }

  async function handleClear() {
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'trophy') {
      await clearReward(trophy, 'Trophy cleared');
      return;
    }
    if (pickerTarget.kind === 'cell') {
      await clearReward(
        byLevel.get(rewardKey(pickerTarget.type, pickerTarget.levelId)),
        'Badge cleared',
      );
    }
  }

  const pickerSelectedImageId = (() => {
    if (!pickerTarget) return null;
    if (pickerTarget.kind === 'default') return defaultImageIds[pickerTarget.type];
    if (pickerTarget.kind === 'trophy') return trophy?.image_id ?? null;
    return byLevel.get(rewardKey(pickerTarget.type, pickerTarget.levelId))?.image_id ?? null;
  })();

  const pickerAllowClear =
    pickerTarget?.kind === 'trophy'
      ? trophy != null
      : pickerTarget?.kind === 'cell'
        ? byLevel.has(rewardKey(pickerTarget.type, pickerTarget.levelId))
        : false;

  const pickerTitle = (() => {
    if (!pickerTarget) return 'Choose image';
    if (pickerTarget.kind === 'trophy') return 'Choose trophy image';
    const typeLabel = REWARD_TYPE_LABELS[pickerTarget.type].toLocaleLowerCase();
    if (pickerTarget.kind === 'cell') {
      return `Choose ${typeLabel} image for ${pickerTarget.levelName}`;
    }
    return `Choose ${typeLabel} image`;
  })();

  const isPending = rewardsQuery.isPending || unitsQuery.isPending;
  const isError = rewardsQuery.isError || unitsQuery.isError;
  const error = rewardsQuery.error ?? unitsQuery.error;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <title>{pageTitle('Rewards')}</title>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Rewards</h1>
          <p className="text-muted-foreground">
            Assign badge and trophy images for each level, or apply one image across a layer.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="lg" variant="outline" onClick={() => setBulkOpen(true)}>
            Bulk update
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => setLibraryOpen(true)}>
            <Images data-icon="inline-start" />
            Manage images
          </Button>
        </div>
      </header>

      <Tabs
        value={layer}
        onValueChange={(value) => {
          if (isLayer(value)) setLayer(value);
        }}
      >
        <div className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <TabsList variant="line" aria-label="Layer">
            {LAYERS.map((item) => (
              <TabsTrigger key={item} value={item}>
                {LAYER_TITLES[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={layer} className="flex flex-col">
          {isPending ? (
            <div className="flex flex-col gap-6">
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load rewards.'}
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              <Card className="gap-0 py-0 *:border-b *:last:border-b-0">
                <div className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-sm">
                    <Trophy className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{REWARD_TYPE_LABELS[LAYER_REWARD_TYPE]}</span>
                  </span>
                  <RewardThumbButton
                    size="sm"
                    assigned={trophy != null}
                    imageUrl={trophy ? mediaUrl(trophy.image.url) : undefined}
                    title={REWARD_TYPE_LABELS[LAYER_REWARD_TYPE]}
                    label="trophy"
                    onClick={() => setPickerTarget({ kind: 'trophy' })}
                  />
                </div>
              </Card>

              <Card className="gap-0 py-0 *:border-b *:last:border-b-0">
                <div
                  className={cn(
                    COVERAGE_ROW,
                    'bg-muted/50 py-2.5 text-xs font-medium text-muted-foreground',
                  )}
                >
                  <span>Level</span>
                  {LEVEL_REWARD_TYPES.map((type) => (
                    <span key={type} className="text-center leading-tight text-balance">
                      {REWARD_TYPE_LABELS[type]}
                    </span>
                  ))}
                </div>

                {units.length === 0 ? (
                  <Empty className="border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Images />
                      </EmptyMedia>
                      <EmptyTitle>No units in this layer yet</EmptyTitle>
                      <EmptyDescription>
                        Add a unit to {LAYER_TITLES[layer]} before assigning game badges.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  units.map((unit) => (
                    <Fragment key={unit.id}>
                      <div className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-2">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate font-medium">{unit.title}</span>
                        </div>
                      </div>

                      {unit.levels.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          No levels in this unit.
                        </p>
                      ) : (
                        unit.levels.map((level) => (
                          <div
                            key={level.id}
                            className={cn(COVERAGE_ROW, 'py-2 transition-colors hover:bg-muted/30')}
                          >
                            <span className="truncate text-sm">{levelName(level)}</span>
                            {LEVEL_REWARD_TYPES.map((type) => {
                              const reward = byLevel.get(rewardKey(type, level.id));
                              const typeEnabled = isLevelRewardTypeEnabled(layer, type);
                              return (
                                <RewardThumbButton
                                  key={type}
                                  size="sm"
                                  assigned={reward != null}
                                  disabled={!typeEnabled}
                                  imageUrl={reward ? mediaUrl(reward.image.url) : undefined}
                                  title={
                                    typeEnabled
                                      ? `${REWARD_TYPE_LABELS[type]} — ${levelName(level)}`
                                      : disabledRewardTypeReason(layer, type)
                                  }
                                  label={`${REWARD_TYPE_LABELS[type]} for ${levelName(level)}`}
                                  onClick={() =>
                                    setPickerTarget({
                                      kind: 'cell',
                                      type,
                                      levelId: level.id,
                                      levelName: levelName(level),
                                    })
                                  }
                                />
                              );
                            })}
                          </div>
                        ))
                      )}
                    </Fragment>
                  ))
                )}
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && pickerTarget !== null) return;
          setBulkOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Bulk update</DialogTitle>
            <DialogDescription>
              Pick an image once, then apply it to every level in {LAYER_TITLES[layer]}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {LEVEL_REWARD_TYPES.map((type) => {
              const imageId = defaultImageIds[type];
              const image = imageId != null ? imagesById.get(imageId) : undefined;
              const typeEnabled = isLevelRewardTypeEnabled(layer, type);
              const applyDisabled =
                !typeEnabled || imageId == null || totalLevels === 0 || bulkRewards.isPending;

              return (
                <Card key={type} className="gap-3">
                  <CardContent className="flex items-center gap-3">
                    <RewardThumbButton
                      assigned={image != null}
                      disabled={!typeEnabled}
                      imageUrl={image ? mediaUrl(image.image.url) : undefined}
                      label={REWARD_TYPE_LABELS[type]}
                      title={typeEnabled ? undefined : disabledRewardTypeReason(layer, type)}
                      onClick={() => setPickerTarget({ kind: 'default', type })}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium">{REWARD_TYPE_LABELS[type]}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {typeEnabled
                          ? image
                            ? image.name
                            : 'No image selected'
                          : 'Not used in this layer'}
                      </span>
                    </div>
                  </CardContent>
                  <CardContent className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={applyDisabled}
                      onClick={() => {
                        void applyType(type, 'fill_missing');
                      }}
                    >
                      {applying === `${type}:fill_missing` ? 'Applying...' : 'Apply to missing'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={applyDisabled}
                      onClick={() => {
                        void applyType(type, 'overwrite');
                      }}
                    >
                      {applying === `${type}:overwrite` ? 'Applying...' : 'Apply to all'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <RewardImageLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
      <RewardImagePicker
        open={pickerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPickerTarget(null);
        }}
        title={pickerTitle}
        selectedImageId={pickerSelectedImageId}
        allowClear={pickerAllowClear}
        onSelect={handlePick}
        onClear={pickerAllowClear ? handleClear : undefined}
      />
    </div>
  );
}
