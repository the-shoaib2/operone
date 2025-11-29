import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Custom plugin to rewrite CommonJS imports to default imports
function rewriteCommonJSImports() {
  return {
    name: 'rewrite-commonjs-imports',
    generateBundle(_options, bundle) {
      for (const fileName in bundle) {
        const chunk = bundle[fileName]
        if (chunk.type === 'chunk' && chunk.code) {
          // Rewrite electron imports - use default export
          chunk.code = chunk.code.replace(
            /import\s*{([^}]+)}\s*from\s*["']electron["']/g,
            (match, imports) => {
              const importList = imports.split(',').map(i => i.trim()).join(', ')
              return `import * as __electron from "electron";\nconst { ${importList} } = __electron.default`
            }
          )
          // Rewrite electron-store imports
          chunk.code = chunk.code.replace(
            /import\s+(\w+)\s+from\s+["']electron-store["']/g,
            'import * as __electronStore from "electron-store";\nconst $1 = __electronStore.default || __electronStore'
          )
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store', 'better-sqlite3'],
              output: {
                format: 'es',
              },
              plugins: [rewriteCommonJSImports()],
            },
          },
        },
      },
    ]),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['better-sqlite3', 'electron-store', '@repo/ai-engine', 'fs', 'path', 'os', 'child_process', '@repo/mcp-tools'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3', 'electron-store', '@repo/ai-engine', 'child_process', '@repo/mcp-tools']
  }
})
