import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isStaging = mode === 'staging';
  const isProd = mode === 'production';

  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: [
        'localhost',
        '.ngrok-free.dev',
        '.ngrok.io',
      ],
    },
    plugins: [
      react(),
      isDev && componentTagger(),
      isProd && removeConsole(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __DEV__: isDev,
      __STAGING__: isStaging,
      __PROD__: isProd,
    },
    build: {
      sourcemap: !isProd,
      minify: isProd ? 'terser' : isStaging ? 'esbuild' : false,
      rollupOptions: {
        output: {
          chunkFileNames: isProd 
            ? 'assets/[name].[hash].js'
            : isStaging
            ? 'assets/[name].[hash:8].js'
            : 'assets/[name].js',
          entryFileNames: isProd
            ? 'assets/[name].[hash].js' 
            : isStaging
            ? 'assets/[name].[hash:8].js'
            : 'assets/[name].js',
          assetFileNames: isProd
            ? 'assets/[name].[hash].[ext]'
            : isStaging
            ? 'assets/[name].[hash:8].[ext]'
            : 'assets/[name].[ext]',
        },
      },
    },
  };
});
