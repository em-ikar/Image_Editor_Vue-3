# Image Editor — UI design spec (Vuetify 3)

Single-page app. Implement with Vue 3 + Vuetify 3 components (no custom CSS framework).
Reference mockups: `mockup-upload.html`, `mockup-editor.html` (static HTML sources of the
design canvas; read them for exact spacing/copy, but build with Vuetify components, not this markup).

## Theme

- Vuetify `defaultTheme: 'dark'`
- colors: `background #121212`, `surface #212121`, `primary #1976D2` (white text on primary)
- font: Roboto (Vuetify default), numbers use `font-variant-numeric: tabular-nums`
- touch targets ≥ 44px (`size="large"` on buttons where needed)

## Layout (`v-app`)

```
┌─────────────────────────── v-app-bar (64px) ────────────────────────────┐
│ [logo] Image Editor | file name + "6000 × 4000 px · JPEG" [Edited chip] │
│                                   [Replace] [Reset (outlined)] [Export] │
├──────────────────────────────── v-main ─────────────┬── drawer (380px) ─┤
│                                                     │ v-tabs: Crop|Adjust│
│             image stage (centered, fit)             │                    │
│                                                     │   tab content      │
│                                                     │                    │
├───── bottom toolbar (64px) ─────────────────────────┤   footer actions   │
│ [− | Fit · 13% | +]                  [View original]│                    │
└─────────────────────────────────────────────────────┴────────────────────┘
```

- Right panel: `v-navigation-drawer location="right" width="380" permanent`
- Tabs: `v-tabs grow` with icons `mdi-crop` / `mdi-tune-variant`

## States

### 1. Empty (no image)
- Stage shows drop zone: `v-sheet` with 2px dashed border, radius 12, ~680×420
  - circle icon `mdi-upload`, title "Drop an image here", subtitle "or choose a file from your computer"
  - primary button "Choose image" → opens hidden `v-file-input` (accept `image/jpeg,image/png,image/webp`)
  - caption "JPG, PNG or WebP"
- Whole stage accepts drag & drop
- App bar: Reset and Export disabled; no file info
- Drawer: tabs disabled, text "No image yet / Crop and adjustment tools appear once an image is loaded."

### 2. Adjust tab (default after load)
- Section label "LIGHT & COLOR" (overline)
- Three rows, each: prepend icon, label, value box (`+12`, `0`, `-30`), reset icon button (disabled at 0), then `v-slider`
  - Brightness `mdi-brightness-6`, Contrast `mdi-contrast-circle`, Saturation `mdi-water`
  - range −100…100, step 1, default 0, `color="primary"`, fill from center (0)
- Info `v-alert type="info" variant="tonal" density="compact"`: "Edits are non-destructive. The original file stays untouched until you export."
- Footer: outlined full-width "Reset adjustments" (disabled when all 0)
- Preview updates live while dragging (no apply button)

### 3. Crop tab
- Section "ASPECT RATIO": `v-chip-group mandatory` (3-column grid): Free, 3:2 (original), 1:1, 4:3, 16:9, A4 (210:297)
- Section "OUTPUT SIZE": two readonly `v-text-field variant="outlined"` Width, px × Height, px (in original image pixels)
- Helper text: "Drag the frame or its handles on the image."
- Stage: crop frame (cropperjs), dimmed outside, rule-of-thirds grid, 8 handles, badge `W × H px` at bottom of frame
- Footer: "Cancel" (text) + "Apply crop" (flat primary), equal width

## Global actions
- **View original** (bottom toolbar, toggle, `aria-pressed`): shows unedited source; chip "Original" top-left of stage
- **Reset** (app bar): clears crop + adjustments; disabled when nothing edited
- **Replace**: back to file picker
- **Export** (primary): download result
- "Edited" chip in app bar when any adjustment ≠ 0

## Behaviour notes
- Keep original image untouched in the store; preview is derived (crop rect + adjustment values).
- Live preview may use CSS `filter: brightness() contrast() saturate()` (value v → factor `1 + v/100`);
  export applies the same values on a canvas.
