---
name: verify-setup
description: Verify that this Vue 3 + Vuetify 3 + Pinia + TypeScript + Cropper.js project installs and runs from a clean clone with `npm i && npm run dev`, and that TypeScript, aliases and versions are configured correctly. Use this skill before committing or submitting, after adding or upgrading dependencies, after touching vite.config / tsconfig / main.ts / package.json, when `npm run dev`, build or type-check fails, or when the user asks "does it run", "check the setup", "ready to submit?".
---

# Verify setup

The task has a hard requirement: **the project must run with
`npm i && npm run dev`** on a reviewer's machine. This skill checks that,
plus the configuration the other skills rely on.

## How to run

From the project root:

```bash
node .claude/skills/verify-setup/scripts/verify.mjs          # static checks, seconds, no network
node .claude/skills/verify-setup/scripts/verify.mjs --full   # + fresh clone, npm i, type-check, build, dev server smoke test
```

- Run the static mode after any config or dependency change.
- Run `--full` before a commit you'd hand in. It clones the **committed**
  state into a temp dir, so uncommitted changes are not tested — commit first
  or tell the user.
- Exit code `1` means at least one FAIL. Fix FAILs; report WARNs to the user.

## What it checks and how to fix

| Check | Fix |
|---|---|
| `vuetify` major 3 declared and installed | `npm i vuetify@^3` — never `npm i vuetify` (can pull v4) |
| `cropperjs` major 2 | `npm i cropperjs@^2` |
| `vue-tsc`, `typescript`, `vite-plugin-vuetify` present | `npm i -D vue-tsc typescript vite-plugin-vuetify` — check its peer range matches Vuetify 3 |
| `scripts.dev` exists | `"dev": "vite"` |
| `engines.node` set | add `"engines": { "node": "<range from Vite's package.json engines>" }` |
| `package-lock.json` present, no pnpm/yarn/bun lockfiles | `npm i`, delete other lockfiles, commit the npm lockfile |
| `vuetify()` plugin in vite config | `plugins: [vue(...), vuetify({ autoImport: true })]` |
| `isCustomElement` for `cropper-*` | see `cropperjs` skill |
| `@/` alias in **both** vite and tsconfig | vite: `resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }`; tsconfig (app config): `"paths": { "@/*": ["./src/*"] }` |
| `'vuetify/styles'` imported | in `src/plugins/vuetify.ts` |
| `@mdi/font` installed and CSS imported when `mdi-*` icons are used | `npm i @mdi/font`, `import '@mdi/font/css/materialdesignicons.css'` |
| `createPinia()` used | `app.use(createPinia())` before `app.mount` |
| No Cropper v1 API / wrappers / CSS | see `cropperjs` skill |
| No undeclared `@vueuse`, no browser storage | remove or ask the user |
| `VITE_*` env vars have `.env.example` | app must run with no `.env` at all |

## TypeScript notes

- **Type-check command**: projects scaffolded by `create-vue` use TS project
  references (`tsconfig.json` with `"files": []` + `references`). There,
  `npx vue-tsc --noEmit` at the root checks **nothing**. Use the
  `type-check` script (`vue-tsc --build`) when it exists. The script does this
  automatically; follow the same rule when running checks by hand.
- `strict: true` should stay on. Don't silence errors with `any`,
  `// @ts-ignore` or by loosening tsconfig; fix the type or ask.
- **`<cropper-*>` in templates**: `isCustomElement` fixes runtime warnings,
  not `vue-tsc`. If type-check reports unknown elements, add
  `src/types/cropper-elements.d.ts`:
  ```ts
  import type { DefineComponent } from 'vue';

  type CropperTag = DefineComponent<Record<string, unknown>>;

  declare module 'vue' {
    interface GlobalComponents {
      'cropper-canvas': CropperTag;
      'cropper-image': CropperTag;
      'cropper-selection': CropperTag;
      'cropper-handle': CropperTag;
      'cropper-shade': CropperTag;
      'cropper-grid': CropperTag;
      'cropper-crosshair': CropperTag;
    }
  }
  ```
  Make sure the file is included by the app tsconfig. Only add it if
  type-check actually complains.

## Manual checks the script can't do

After `--full` passes, open the dev server and confirm in the browser:
1. No errors or Vue warnings in the console on load.
2. Upload → crop → sliders → filter → view original → reset → download works.
3. Downloaded file opens and matches the preview.

## Before submission

- [ ] `verify.mjs --full` passes on the committed state
- [ ] README states: Node version, `npm i && npm run dev`, feature list
- [ ] No leftover debug code, `console.log`, unused files
- [ ] `.claude/` committed only if the user wants skills in the repo
