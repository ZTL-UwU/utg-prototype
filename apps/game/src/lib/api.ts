import { ofetch } from 'ofetch';

import { backendUrl } from './env';

export const api = ofetch.create({
  baseURL: backendUrl,
});
