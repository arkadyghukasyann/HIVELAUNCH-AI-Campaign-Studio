/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_DEFAULT_IMAGE_MODEL?: string;
  readonly VITE_DEFAULT_TEXT_MODEL?: string;
  readonly VITE_POLLINATIONS_APP_KEY?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
