import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /* fsevents delivery on this machine is unreliable — its fseventsd has
     * been up for months and ballooned past 2GB — so the watcher silently
     * stops firing and Vite serves stale modules. Polling does not depend on
     * that daemon. Safe to drop once fseventsd is healthy again. */
    watch: { usePolling: true, interval: 300 },
  },
  build: {
    /* A page each: the way in, and the prototypes it opens. They share the
       shell, the tokens and the icon set; the two student planners share their
       data and their components as well, where Team Progress starts its own.
       Team Explore shares only the tokens — it is the one screen here that is
       not someone signed in to Stellic, so it brings its own chrome. */
    rollupOptions: {
      input: {
        index: path.resolve(import.meta.dirname, 'index.html'),
        generator: path.resolve(import.meta.dirname, 'generator.html'),
        planner: path.resolve(import.meta.dirname, 'planner.html'),
        'program-instruction': path.resolve(import.meta.dirname, 'program-instruction.html'),
        'advanced-what-if': path.resolve(import.meta.dirname, 'advanced-what-if.html'),
        compliance: path.resolve(import.meta.dirname, 'compliance.html'),
        courses: path.resolve(import.meta.dirname, 'courses.html'),
        explain: path.resolve(import.meta.dirname, 'explain.html'),
        'staff-home': path.resolve(import.meta.dirname, 'staff-home.html'),
        explore: path.resolve(import.meta.dirname, 'explore.html'),
        'transfer-insights': path.resolve(import.meta.dirname, 'transfer-insights.html'),
        students: path.resolve(import.meta.dirname, 'students.html'),
      },
    },
  },
  resolve: {
    alias: [
      /* Exact match only, so `cn/config` still resolves to the package. */
      { find: /^cn$/, replacement: path.resolve(import.meta.dirname, './src/lib/cn.ts') },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
})
