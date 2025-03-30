import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          echarts: ['echarts'],
          cytoscape: ['cytoscape'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '@core': resolve(__dirname, 'js/core'),
      '@visualization': resolve(__dirname, 'js/visualization'),
      '@ui': resolve(__dirname, 'js/ui'),
      '@utils': resolve(__dirname, 'js/utils')
    }
  },
  server: {
    port: 3000,
    open: true
  }
});