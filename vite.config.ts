import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      // `filler.ts` is injected programmatically via chrome.scripting.executeScript,
      // so it is not referenced by the manifest. Declare it explicitly so it is
      // bundled to a self-contained file at dist/src/content/filler.js.
      input: {
        filler: 'src/content/filler.ts',
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'filler' ? 'src/content/filler.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
