import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore source map warnings
        if (warning.code === 'SOURCEMAP_ERROR' || warning.message?.includes('source map')) {
          return;
        }
        warn(warning);
      },
    },
  },
  esbuild: {
    sourcemap: false,
  },
}));
