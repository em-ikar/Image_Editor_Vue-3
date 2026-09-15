# Image Editor

A browser-based image editor: upload an image, crop it, adjust it with live
sliders, apply a filter, compare with the original, and download the result.
Edits are non-destructive — the original image is always kept, the preview is
derived from it.

## Stack

- [Vue 3](https://vuejs.org/) (`<script setup lang="ts">`, Composition API)
- [Vuetify 3](https://vuetifyjs.com/)
- [Pinia](https://pinia.vuejs.org/)
- TypeScript (strict)
- [Cropper.js v2](https://fengyuanchen.github.io/cropperjs/) (web components) for cropping
- [Vite](https://vite.dev/) as dev server and bundler

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm (no pnpm/yarn/bun)

## Setup

```bash
npm i
npm run dev
```

## Scripts

```bash
npm run dev           # start the dev server
npm run build          # type-check and build for production
npm run preview        # preview the production build locally
npm run type-check      # vue-tsc --build
```

## Project structure

```
src/
├── main.ts               app entry: Pinia, Vuetify plugin, registers cropperjs elements
├── plugins/vuetify.ts    Vuetify instance
├── stores/                Pinia stores (editor state)
├── services/              pure/DOM helpers (filters, export)
├── composables/           reusable composition logic
└── components/editor/     editor UI components
```

## Status

This is a test task. Project setup (tooling, dependencies, folder structure)
is in place; editor features are being built incrementally.
