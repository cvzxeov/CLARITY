import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'move-script-plugin',
      transformIndexHtml(html) {
        let cleanHtml = html.replace(/type="module" crossorigin/g, '').replace(/crossorigin/g, '').replace(/defer /g, '');
        const scriptMatch = cleanHtml.match(/<script.*?src=".*?"><\/script>/g);
        if (scriptMatch) {
          cleanHtml = cleanHtml.replace(scriptMatch[0], '');
          cleanHtml = cleanHtml.replace('</body>', scriptMatch[0] + '\n  </body>');
        }
        return cleanHtml;
      }
    }
  ],
  base: './', // important for electron
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Use iife format so Electron can load via file:// without CORS/module issues
        format: 'iife',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        inlineDynamicImports: true // required for iife
      }
    }
  }
})
