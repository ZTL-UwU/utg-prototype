import { queryOptions } from '@tanstack/react-query';

import { api } from '~/lib/api';
import type { MediaImage } from '~/lib/game';

export const FEEDBACK_REQUEST_TYPES = ['issue', 'new_feature', 'content', 'other'] as const;
export type FeedbackRequestType = (typeof FEEDBACK_REQUEST_TYPES)[number];

export const FEEDBACK_REQUEST_TYPE_LABELS: Record<FeedbackRequestType, string> = {
  issue: 'Issue',
  new_feature: 'New feature',
  content: 'Content',
  other: 'Other',
};

export interface FeedbackUser {
  id: number;
  name: string | null;
  email: string;
}

/** Mirrors FeedbackOut from the backend apps/game/schemas.py. */
export interface FeedbackReport {
  id: number;
  request_type: FeedbackRequestType;
  title: string;
  description: string;
  image: MediaImage;
  screen: string;
  user: FeedbackUser | null;
  created_at: string;
  is_resolved: boolean;
}

export function feedbackAuthor(feedback: FeedbackReport): string {
  if (!feedback.user) return 'Guest';
  return feedback.user.name?.trim() || feedback.user.email;
}

export function feedbackHeadline(feedback: FeedbackReport): string {
  return feedback.title.trim() || 'Untitled';
}

export function formatFeedbackDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function feedbackTypeBadgeVariant(
  type: FeedbackRequestType,
): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'issue':
      return 'destructive';
    case 'new_feature':
      return 'default';
    case 'content':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function feedbackSearchText(feedback: FeedbackReport): string {
  return [
    feedbackHeadline(feedback),
    feedback.description,
    feedbackAuthor(feedback),
    feedback.user?.email,
    FEEDBACK_REQUEST_TYPE_LABELS[feedback.request_type],
    feedback.screen,
    feedback.is_resolved ? 'resolved' : 'open',
  ]
    .filter(Boolean)
    .join(' ');
}

export const feedbackListQueryOptions = queryOptions({
  queryKey: ['feedback', 'list'],
  queryFn: () => api<FeedbackReport[]>('/feedback/list'),
});
