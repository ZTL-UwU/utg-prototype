/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_OPEN_ACCESS?: string;
  readonly VITE_NATIVE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
