import { queryOptions } from '@tanstack/react-query';

import { api } from '~/lib/api';

// Types mirroring the backend /units/list response (apps/game/schemas.py).

export const LAYERS = ['education', 'typing', 'game'] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_TITLES: Record<Layer, string> = {
  education: 'Educational',
  typing: 'Typing',
  game: 'Game',
};

export function isLayer(value: string | undefined): value is Layer {
  return LAYERS.includes(value as Layer);
}

export interface Mascot {
  id: number;
  name: string | null;
  idle_asset_path: string;
  zero_star_asset_path: string;
  one_star_asset_path: string;
  two_star_asset_path: string;
  three_star_asset_path: string;
}

export interface Level {
  id: number;
  sort_order: number;
  layer: Layer;
  title: string | null;
  level_type: string;
  level_props: unknown;
  mascot: Mascot | null;
  splash_background_asset_path: string;
  splash_button_color: number | null;
  splash_button_text_color: number | null;
  splash_level_font_color: number | null;
  splash_level_title_color: number | null;
  show_mascot_on_splash: boolean;
  backdrop_color: number;
  is_published: boolean;
}

export interface Unit {
  id: number;
  sort_order: number;
  layer: Layer;
  title: string;
  title_font_size: number;
  title_font_color: number;
  title_is_curved: boolean;
  subtitle_text: string | null;
  subtitle_font_size: number | null;
  subtitle_font_color: number | null;
  background_asset_path: string;
  levels: Level[];
  updated_at: string;
  created_at: string;
  is_published: boolean;
}

/** Minimal unit fields from GET /units/sidebar for admin nav. */
export interface SidebarUnit {
  id: number;
  layer: Layer;
  title: string;
}

// Course structure only changes through admin edits, so never refetch
// automatically; invalidate the key after mutations instead.
export const unitsQueryOptions = queryOptions({
  queryKey: ['units', 'list'],
  queryFn: () => api<Unit[]>('/units/list'),
  staleTime: Infinity,
});

export const sidebarUnitsQueryOptions = queryOptions({
  queryKey: ['units', 'sidebar'],
  queryFn: () => api<SidebarUnit[]>('/units/sidebar'),
  staleTime: Infinity,
});

export const mascotsQueryOptions = queryOptions({
  queryKey: ['mascots', 'list'],
  queryFn: () => api<Mascot[]>('/mascots/list'),
  staleTime: Infinity,
});

/** Mirrors ImageOut from apps/game/schemas.py. */
export interface WordImage {
  name: string;
  url: string;
  filename: string;
  width: number;
  height: number;
}

/** Mirrors AudioOut from apps/game/schemas.py. */
export interface WordAudio {
  name: string;
  url: string;
  filename: string;
}

/** Mirrors WordOut from apps/game/schemas.py. */
export interface Word {
  id: number;
  word: string;
  target_letter: string | null;
  translation: string | null;
  is_tutorial_word: boolean;
  image: WordImage | null;
  audio: WordAudio | null;
}

export const wordsQueryOptions = queryOptions({
  queryKey: ['words', 'list'],
  queryFn: () => api<Word[]>('/words/list'),
  staleTime: Infinity,
});

/** Mirrors SentenceOut from apps/game/schemas.py. */
export interface Sentence {
  id: number;
  sentence: string;
  translation: string | null;
}

export const sentencesQueryOptions = queryOptions({
  queryKey: ['sentences', 'list'],
  queryFn: () => api<Sentence[]>('/sentences/list'),
  staleTime: Infinity,
});

export function unitsByLayer(units: SidebarUnit[]): Record<Layer, SidebarUnit[]> {
  const grouped: Record<Layer, SidebarUnit[]> = { education: [], typing: [], game: [] };
  for (const unit of units) {
    grouped[unit.layer]?.push(unit);
  }
  return grouped;
}
