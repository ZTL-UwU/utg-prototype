export const APP_NAME = 'Sozler Seylisi';

export function pageTitle(page?: string) {
  return page ? `${page} | ${APP_NAME}` : APP_NAME;
}
