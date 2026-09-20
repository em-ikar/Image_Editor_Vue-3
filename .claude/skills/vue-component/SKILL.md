---
name: vue-component
description: Project conventions for writing and changing Vue components in this image editor — component map, Vuetify 3 usage, file upload, sliders, filter picker, preview, toolbar, layout and accessibility. Use this skill whenever you create, edit, split or review any .vue file in src/, add UI for a feature, or wire a component to the editor store, even if the user only says "add a button" or "change the panel".
---

# Vue components in this project

Conventions for Vue 3 components in **this** project.
Related skills: `editor-store` (state), `cropperjs` (crop component),
`vue-pinia-best-practices` (generic Pinia rules).

## Stack guardrails

Do not introduce tools outside the stack without the user asking:

- UI: **Vuetify 3 only**. No Nuxt UI, Reka UI, Tailwind, PrimeVue, headless libs.
- No `@vueuse/core` (e.g. `createReusableTemplate`) unless it is already in `package.json`.
- No Nuxt, SSR, `data-allow-mismatch`, `<ClientOnly>`, router.
- Package manager: **npm** (`npm i`, `npm run dev`). Never pnpm/yarn commands.
- Vuetify must stay on major 3 (`"vuetify": "^3.x"`). Vuetify 4 exists; a bare
  `npm i vuetify` may pull it. Never upgrade the major.
- Check the Vue version in `package.json` before using 3.4+/3.5+ features
  (props destructure with defaults, `useTemplateRef`, `:prop` shorthand).

## Component map

See `references/component-map.md` for the tree, responsibilities and
data flow. Put new components where the map says; update the map file if
you add a component.

## Rules

- `<script setup lang="ts">` everywhere. No Options API, no mixins.
- **Feature panels talk to the store** (`useEditorStore()`), no prop drilling
  of editor state through `EditorLayout`. **Small reusable pieces** (e.g. a
  labeled slider) get props/emits or `defineModel` and don't import the store.
- Components stay small: one responsibility, roughly under 150 lines.
  Logic that isn't about rendering goes to the store, `src/services/`, or a
  composable in `src/composables/`.
- No business logic in templates: no inline filter-string building,
  no URL creation, no canvas work.

## Vue 3 syntax conventions

Check the Vue version in `package.json` first; items marked 3.4+/3.5+ need it.

| Pattern | Use |
|---|---|
| Props | `defineProps<{ label: string; max?: number }>()` — type-based, never runtime arrays |
| Props with defaults (3.5+) | `const { max = 200 } = defineProps<{ max?: number }>()` |
| Emits | `const emit = defineEmits<{ select: [id: FilterId]; close: [] }>()` |
| Two-way binding | `const value = defineModel<number>({ required: true })` |
| Template refs (3.5+) | `const el = useTemplateRef<HTMLDivElement>('stage')` + `ref="stage"` |
| Same-name binding (3.4+) | `<AdjustmentSlider :label :max />` |
| Slots | `<template #actions>`, not `v-slot:actions` |
| Event names | camelCase in `defineEmits`, kebab-case in templates (`@apply-crop`) |

Pitfalls:
- **Destructured props lose reactivity when passed as a value**:
  `watch(() => max, ...)`, not `watch(max, ...)`. Same for composables:
  pass a getter `() => max`.
- `const props = defineProps(...)` then `const { x } = props` loses
  reactivity. Either destructure directly from `defineProps` (3.5+) or use `props.x`.
- `defineModel()` without `required: true` starts as `undefined` and can
  emit twice on init. Use `required: true` or give the parent a value.
- `defineModel({ default })` can desync from a parent that passes nothing —
  keep defaults in the parent/store, not in the model.
- Mutating a prop directly — emit or use `defineModel` instead.
- `reactive()` destructuring and store destructuring lose reactivity —
  use `toRefs` / `storeToRefs`.
- `v-if` with `v-for` on the same element — wrap with `<template>`.
- `v-for` always has a stable `:key` (not the index for reorderable lists).

## Vuetify usage

- `vite-plugin-vuetify` with `autoImport: true` — don't import Vuetify
  components manually.
- Use Vuetify components instead of raw HTML controls: `v-file-input`,
  `v-slider`, `v-btn`, `v-btn-toggle`/`v-chip-group`, `v-card`, `v-alert`,
  `v-snackbar`, `v-tooltip`.
- Layout with `v-app` > `v-main` > `v-container`/`v-row`/`v-col` (or
  `v-navigation-drawer` for the controls sidebar). Spacing and flex via
  utility classes (`pa-4`, `d-flex`, `ga-2`, `align-center`) instead of
  custom CSS. Scoped CSS only for what utilities can't do (preview sizing).
- Icons: `@mdi/font` (`mdi-crop`, `mdi-download`, `mdi-restore`, `mdi-compare`).
  Make sure it's a dependency and imported once in the Vuetify plugin.
- Icon-only buttons must have `aria-label` (and ideally a `v-tooltip`).

### Known Vuetify gotchas

- **`v-file-input` model shape** changed across 3.x: older versions give
  `File[]` even without `multiple`, newer give a single `File`. Normalize:
  ```ts
  function firstFile(value: File | File[] | null | undefined): File | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }
  ```
  Use `accept="image/*"`, clear the input after a successful load if the
  same file should be re-selectable.
- **`v-slider`** emits on every drag tick (`update:modelValue`) — that's what
  we want for the live canvas preview. Use `@end` only for expensive work.
  Add `hide-details`, `thumb-label`, explicit `min`/`max`/`step`, and
  show the current value; give each slider its own reset affordance.
- **`v-input` / `v-alert` grow inside a flex column** (`flex: 1`): in a
  `d-flex flex-column` panel they stretch to fill it. Add `class="flex-0-0"`.
- **`v-tabs` force-selects the first enabled tab** when its model is
  undefined (e.g. no image yet). Pass `:mandatory="false"` and ignore
  non-string `update:model-value` values.
- Bind sliders to the store through a computed getter/setter that calls
  `setAdjustment`, not by mutating `store.adjustments.x` from the template.

## UX states every screen needs

- **Empty**: no image → centered upload card (file input, supported formats).
- **Loading**: while decoding the image / exporting → disabled controls,
  `loading` prop on the button.
- **Error**: unsupported file or failed export → `v-alert`/`v-snackbar`, never
  a silent `console.error`.
- **Disabled**: Reset disabled when `!hasEdits`; Export/Crop disabled when
  `!hasImage`.

## Accessibility

- Every control has a visible label or `aria-label`.
- The preview `<canvas>` has `role="img"` and a meaningful `aria-label`.
- "View original" works by button toggle, not only hover (hover doesn't
  exist on touch and keyboard).

## Done checklist

- [ ] No new dependency outside the stack; Vuetify still `^3`
- [ ] Component placed per `component-map.md`
- [ ] Empty / loading / error / disabled states handled
- [ ] Icon buttons labeled
- [ ] `npm run type-check` and `npm run test` pass, no Vue warnings in console
