import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && removeConsole(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Security: Don't expose source maps in production
    sourcemap: mode !== 'production',
    // Security: Minify for production
    minify: mode === 'production' ? 'terser' : false,
    rollupOptions: {
      output: {
        // Security: Obfuscate chunk names in production
        chunkFileNames: mode === 'production' 
          ? 'assets/[name].[hash].js'
          : 'assets/[name].js',
        entryFileNames: mode === 'production'
          ? 'assets/[name].[hash].js' 
          : 'assets/[name].js',
        assetFileNames: mode === 'production'
          ? 'assets/[name].[hash].[ext]'
          : 'assets/[name].[ext]',
      },
    },
  },
}));
