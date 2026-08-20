import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development' || mode === 'localdb' || mode === 'cws';
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
      // esbuild, not terser: terser 5.46.0 miscompiles this bundle. It emitted
      // an entry chunk whose export list referenced ~200 bindings it had
      // dropped from the chunk body, so the browser rejected the module with
      // "Export 'AlertDialog' is not defined in module" and the app rendered a
      // blank page. The corrupted output was 765kB against esbuild's 2.0MB --
      // the difference was deleted code, not better minification.
      minify: isProd || isStaging ? 'esbuild' : false,
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
