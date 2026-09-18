export const FEEDBACK_REQUEST_TYPES = ['issue', 'new_feature', 'content', 'other'] as const;

export type FeedbackRequestType = (typeof FEEDBACK_REQUEST_TYPES)[number];

export const FEEDBACK_REQUEST_TYPE_LABELS: Record<FeedbackRequestType, string> = {
  issue: 'Issue',
  new_feature: 'New feature',
  content: 'Content',
  other: 'Other',
};

export type FeedbackPayload = {
  type: FeedbackRequestType;
  title: string;
  description: string;
  image: Blob;
};

export type FeedbackReceipt = {
  type: FeedbackRequestType;
  title: string;
  description: string;
  image: File;
  requestBytes: number;
};

function isFeedbackRequestType(value: string): value is FeedbackRequestType {
  return (FEEDBACK_REQUEST_TYPES as readonly string[]).includes(value);
}

export async function submitFeedbackDemo(payload: FeedbackPayload): Promise<FeedbackReceipt> {
  const title = payload.title.trim();
  const description = payload.description.trim();
  if (!description) throw new Error('Please describe your feedback.');
  if (!payload.image.size || payload.image.type !== 'image/png') {
    throw new Error('A PNG screenshot is required.');
  }

  const body = new FormData();
  body.set('type', payload.type);
  body.set('title', title);
  body.set('description', description);
  body.set('image', payload.image, 'feedback.png');
  const request = new Request(new URL('/feedback', window.location.origin), {
    method: 'POST',
    body,
  });
  const requestBytes = (await request.clone().arrayBuffer()).byteLength;
  const received = await request.formData();
  const receivedType = received.get('type');
  const receivedTitle = received.get('title');
  const receivedDescription = received.get('description');
  const receivedImage = received.get('image');
  if (
    typeof receivedType !== 'string' ||
    !isFeedbackRequestType(receivedType) ||
    typeof receivedTitle !== 'string' ||
    typeof receivedDescription !== 'string' ||
    !(receivedImage instanceof File)
  ) {
    throw new Error('Could not read the feedback upload.');
  }
  return {
    type: receivedType,
    title: receivedTitle,
    description: receivedDescription,
    image: receivedImage,
    requestBytes,
  };
}

export function encodeFeedbackImage(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the screenshot.'))),
      'image/png',
    );
  });
}
