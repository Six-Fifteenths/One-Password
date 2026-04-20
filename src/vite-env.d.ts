/// <reference types="vite/client" />

interface ImportMeta {
  glob: (pattern: string, options?: { eager?: boolean; as?: string }) => Record<string, any>;
  globEager?: (pattern: string) => Record<string, any>;
}
