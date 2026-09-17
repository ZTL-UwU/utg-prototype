export type FeedbackReceipt = {
  description: string;
  image: File;
  requestBytes: number;
};

export async function submitFeedbackDemo(
  description: string,
  image: Blob,
): Promise<FeedbackReceipt> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error('Please describe your feedback.');
  if (!image.size || image.type !== 'image/png') throw new Error('A PNG screenshot is required.');

  const body = new FormData();
  body.set('description', trimmed);
  body.set('image', image, 'feedback.png');
  const request = new Request(new URL('/feedback', window.location.origin), {
    method: 'POST',
    body,
  });
  const requestBytes = (await request.clone().arrayBuffer()).byteLength;
  const received = await request.formData();
  const receivedImage = received.get('image');
  const receivedDescription = received.get('description');
  if (!(receivedImage instanceof File) || typeof receivedDescription !== 'string') {
    throw new Error('Could not read the feedback upload.');
  }
  return { description: receivedDescription, image: receivedImage, requestBytes };
}

export function encodeFeedbackImage(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the screenshot.'))),
      'image/png',
    );
  });
}
