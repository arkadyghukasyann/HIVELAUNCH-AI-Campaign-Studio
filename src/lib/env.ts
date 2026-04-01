export const appEnv = {
  defaultImageModel: import.meta.env.VITE_DEFAULT_IMAGE_MODEL?.trim() || 'flux',
  defaultTextModel: import.meta.env.VITE_DEFAULT_TEXT_MODEL?.trim() || 'openai',
  pollinationsAppKey: import.meta.env.VITE_POLLINATIONS_APP_KEY?.trim() || '',
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL?.trim() || '',
};

export function resolvePublicAppUrl() {
  if (appEnv.publicAppUrl) {
    return appEnv.publicAppUrl;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}`;
  }

  return 'http://localhost:5173';
}
