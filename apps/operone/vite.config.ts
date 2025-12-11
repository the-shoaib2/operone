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
              external: [
                'electron',
                'better-sqlite3',
                '@operone/core',
                '@operone/thinking',
                '@operone/db',
                '@operone/mcp',
                '@operone/networking',
                '@operone/utils',
                '@operone/utils',
                '@operone/ai',
                '@llama-node/llama-cpp',
                'ssh2'
              ],
              output: {
                format: 'es',
              },
              plugins: [rewriteCommonJSImports()],
            },
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
              '@operone/mcp': path.resolve(__dirname, '../../packages/mcp/src'),
              '@operone/networking': path.resolve(__dirname, '../../packages/networking/src'),
              '@operone/core': path.resolve(__dirname, '../../packages/core/src'),
              '@operone/db': path.resolve(__dirname, '../../packages/db/src'),
              '@operone/thinking': path.resolve(__dirname, '../../packages/thinking/src'),
              '@repo/operone': path.resolve(__dirname, '../../packages/operone/src'),
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
      '@operone/mcp': path.resolve(__dirname, '../../packages/mcp/src'),
      '@operone/networking': path.resolve(__dirname, '../../packages/networking/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      external: ['better-sqlite3', '@repo/ai-engine', '@repo/operone', 'fs', 'path', 'os', 'child_process', '@repo/mcp-tools', 'ssh2', 'net', 'dgram', 'worker_threads', 'crypto', 'stream', 'util', 'events'],
      output: {
        // manualChunks(id) {
        //   if (id.includes('node_modules')) {
        //     // React ecosystem
        //     if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
        //       return 'vendor-react';
        //     }
        //     // UI libraries
        //     if (id.includes('@radix-ui')) {
        //       return 'vendor-radix';
        //     }
        //     if (id.includes('lucide-react')) {
        //       return 'vendor-icons';
        //     }
        //     // AI/ML libraries
        //     if (id.includes('ai') || id.includes('shiki')) {
        //       return 'vendor-ai';
        //     }
        //     // Motion/animation
        //     if (id.includes('motion') || id.includes('embla-carousel')) {
        //       return 'vendor-motion';
        //     }
        //     // Other vendors
        //     return 'vendor';
        //   }
        // },
      },
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3', '@repo/ai-engine', 'child_process', '@repo/mcp-tools', '@operone/networking', '@operone/mcp']
  }
})
