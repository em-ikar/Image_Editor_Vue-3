# Image Editor — test task

Browser image editor: upload an image, crop it, adjust it with live sliders,
apply a filter, compare with the original, and download the result.
This is a **test task** judged on code quality, correctness and that it runs
out of the box. Prefer small, clean, well-typed code over extra features.

## UI spec

See _design/DESIGN.md

## Stack & setup

- Vue 3 (`<script setup lang="ts">`, Composition API)
- Vuetify 3 — **major 3 only**, never upgrade to 4
- Pinia
- TypeScript (strict)
- Cropper.js **v2** (web components) for cropping
- It must run with `npm i && npm run dev`

Tooling (implied by the stack): Vite as dev server and bundler.

## Requirements

1. Load an image via file upload
2. Crop the uploaded image
3. Live sliders with real-time preview: brightness, contrast, saturation
4. Reset / view original — edits are **non-destructive**: keep the original,
   derive the preview, never write changes into the source
5. Export the result by downloading it
6. At least one filter (greyscale, sepia …)

Out of scope unless I ask: undo/redo, rotation/flip, layers, persistence,
routing, backend, i18n, tests beyond what I request.

## Commands

```bash
npm i                 # install (npm only — no pnpm/yarn/bun)
npm run dev           # dev server
npm run build         # production build
npm run type-check    # vue-tsc --build (NOT `vue-tsc --noEmit` at root)
node .claude/skills/verify-setup/scripts/verify.mjs          # setup checks
node .claude/skills/verify-setup/scripts/verify.mjs --full   # clean-clone run
```

## Project structure

```
src/
├── main.ts               app, Pinia, Vuetify plugin, `import 'cropperjs'`
├── plugins/vuetify.ts    createVuetify, 'vuetify/styles', @mdi/font
├── stores/editor.ts      single editor store (useEditorStore)
├── services/             pure/DOM helpers: imageFilters.ts, exportImage.ts
├── composables/          reusable logic, if needed
└── components/editor/    UI components (see vue-component skill)
```

## Skills — read the matching one before working in its area

| Skill | Use for |
|---|---|
| `cropperjs` | anything touching cropping or `<cropper-*>` elements |
| `editor-store` | editor state, sliders, filters, preview, reset, export |
| `vue-component` | creating or changing any `.vue` file, Vuetify usage |
| `vue-pinia-best-practices` | generic Pinia gotchas |
| `verify-setup` | after dependency/config changes and before committing |

## Always-on rules

- **Don't add dependencies** without asking. If one is needed, install with
  an explicit major (`npm i pkg@^N`) and say why.
- Keep `strict` TypeScript. No `any`, `@ts-ignore` or loosened tsconfig to
  make errors go away — fix the type or ask.
- Don't guess library APIs from memory for Cropper.js v2 or Vuetify; check the
  skill or the installed package types.
- Small, focused changes. Don't refactor unrelated code or rename files
  unless asked.
- UI text in English. Code, comments and commit messages in English.
- No `console.log` left in committed code; errors are shown to the user
  (`v-alert` / `v-snackbar`).

## Definition of done

A change is done when:
1. `npm run type-check` passes
2. `verify.mjs` has no FAIL (use `--full` before a commit meant for submission)
3. No errors or Vue warnings in the browser console
4. The affected flow works manually: upload → crop → adjust → filter →
   view original → reset → download

When you finish, briefly report what changed, what you verified, and anything
you couldn't verify.
