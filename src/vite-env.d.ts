/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_HOOKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
