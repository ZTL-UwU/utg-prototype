export const APP_NAME = 'Sozler Saylisi';

export function pageTitle(page?: string) {
  return page ? `${page} | ${APP_NAME}` : APP_NAME;
}
