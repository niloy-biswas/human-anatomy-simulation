# AGENTS.md — Human Anatomy Simulation

Quick context for agents: what's built, how it works, what to avoid.

## Repo goal

Educational 3D anatomy (Bangla + English) hosted on Vercel.

**Pages:**
- `/` → `body.html`: full-body Z-Anatomy viewer (Three.js)
- `/heart` → `index.html`: heart-only viewer (`<model-viewer>`)
- `/body`, `/skeletal`, `/muscular`, `/visceral`, etc. → `body.html`

## How to run

```bash
cd /Users/niloybiswas/Desktop/CodeRepository/human-heart-simulation
npx --yes serve .
```

- `http://localhost:3000/` → full body
- `http://localhost:3000/heart` → heart

Routing via `serve.json` (local) and `vercel.json` (production).

## File map

| File | Role |
|------|------|
| `body.html` | Full-body viewer layout |
| `index.html` | Heart viewer layout |
| `js/body.js` | Three.js viewer — all viewer logic |
| `js/heart.js` | Heart viewer logic (classic script, no modules) |
| `js/search.js` | Shared ES module — typeahead search UI, framework-agnostic |
| `css/style.css` | All styles — both pages share this |
| `labels/` | Bengali label data, one file per anatomy system |
| `assets/models/` | GLB model files |
| `assets/images/` | PNG nav/UI images |
| `tools/extraction.html` | Dev utility — Sketchfab annotation extractor |

## Assets

- `assets/models/heart.glb` (~16 MB): heart model for `index.html`
- `assets/models/z-anatomy-draco.glb` (~23 MB): Draco-compressed Z-Anatomy, used by `body.html`
- `assets/models/z-anatomy.glb` (~155 MB): raw export — **git-ignored**, local only
- `assets/images/heart.png`: heart icon for sidebar organ card
- `assets/images/full-body-nav-logo.png`: body figure icon for nav link

## Labels system

`labels/` has 9 files matching the 9 anatomy system keys exactly:

```
skeletal.js  joints.js   muscular.js  fasciae.js   arterial.js
venous.js    lymphoid.js nervous.js   visceral.js
```

`labels/index.js` merges all into `BN_LABELS` (flat object). Each entry:
```js
'Part name': { bn: 'বাংলা নাম', desc: 'বাংলা বিবরণ' }
```

`lookupLabel(name)` in `js/body.js` does exact lookup then falls back stripping trailing `l`/`r` (Three.js removes dots, so `joint.l` → `jointl`).

## Z-Anatomy GLB — critical facts

### Scene node structure
Scene has **21 top-level nodes**. System roots are at positions 2–10 in `gltf.scene.children` (= `scene.nodes` array order, which Three.js preserves):

```js
const SYSTEM_CHILD_INDICES = {
  skeletal:2, joints:3, muscular:4, fasciae:5,
  arterial:6, venous:7, lymphoid:8, nervous:9, visceral:10
};
```

**Do not match by name** — Three.js sanitizes node names (spaces→underscores, strips dots).

### Text annotation meshes — two types

1. **Part-level labels**: material named `"Text"` or `"Text-2"` → detected by `/^text/i` regex
2. **Category group nodes** (`.g` suffix): have **no GLB material** (primitive.material = undefined) → Three.js gives default nameless material → detected by `/\.g$/i` test on `obj.name`

Both are made transparent in `replaceMaterialsWithLambert`:
```js
obj.material = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false });
obj.raycast  = () => {};
obj.userData.isTextLabel = true;
```
**Never set `visible=false`** on these — they are also visibility containers for anatomy children.

### systemMeshes registry
Built at load time by walking each mesh's parent chain. `toggleSystem` sets `m.visible` directly on flat mesh arrays — bypasses parent-propagation.

### Material colors
Z-Anatomy exports PBR with `KHR_materials_ior/specular/clearcoat` — renders black in WebGL. All anatomy meshes replaced with `MeshLambertMaterial`. Neutral/achromatic materials get overridden with system color; vivid/dark materials (organs, brain, etc.) keep their original color.

## Search system

`search.js` exports `initSearchBar({ inputEl, dropdownEl, onSelect })`.

**Body viewer** (`js/body.js`): index built after model loads from `systemMeshes`. Each entry: `{ name, bn, sysKey, sysLabelBn, sysColor, meshes[] }`. On select: isolates target system (hides all others + updates checkboxes), highlights all meshes in group, animates camera to bounding box, opens detail panel.

**Heart viewer** (`js/heart.js`): loaded via dynamic `import('./search.js')` (works from classic scripts). Index built from `annotations` array. On select: calls `openDetailPanel(ann, btn)`.

Both pages: search bar in desktop nav (right-aligned, `margin-left:auto`). Mobile: search icon in header opens overlay. Dropdown: system color dot + Bengali name + English name + system badge.

## Camera controls (`bv-cam-controls`)

Both pages share the same HTML panel and `.bv-cam-controls` CSS. Sits absolute bottom-right of canvas/viewer.

- **Auto-rotate**: Three.js `controls.autoRotate` / model-viewer `auto-rotate` attribute
- **Reset**: animates back to `defaultCamTarget` / `defaultCamPos`
- **D-pad**: `pan(dx, dy)` using camera-local right+up vectors (body) / `orbitPan(dTheta, dPhi)` via `getCameraOrbit()` (heart)
- **Keyboard**: arrow keys mapped to pan/orbit; skipped when focus is in `<input>`
- **Mobile**: d-pad + its divider hidden via `.bv-cam-divider--dpad, .bv-cam-dpad { display:none }` at ≤767px

Heart page: play/pause toggle also in the panel (was separate debug panel — removed).

## Sidebar (body.html only)

- System toggle list (injected by `buildSidebar()`)
- **Organ section** (`<details class="bv-organ-section" open>`): collapsible, chevron open=↓ closed=↑. Links to other organ viewers via route paths (`/heart`).
- Show all / Hide all footer buttons

## Known issues / watch-outs

- `js/heart.js` is a **classic script** (not module). To use ES modules from it, use dynamic `import()`.
- `js/body.js` imports labels via `'../labels/index.js'` and search via `'./search.js'` — both relative to the JS file (ES module resolution). Three.js `loader.load()` paths use server-root-absolute `/assets/models/...` to avoid fetch vs. module URL ambiguity.
- Model-viewer's `cameraOrbit` uses radians when set via JS (`getCameraOrbit()` returns radians).
- The `defaultCamPos` / `defaultCamTarget` (body viewer) are saved after model load — do not reset them.
- Camera framing uses 58% of bounding box height as orbit target (avoids arm-span bias from arms-out skeleton pose).
- `cleanName()` strips Z-Anatomy suffixes (`.e`, `.g`, `.s`, `.t`, `.j`, `.l`, `.r`) and Three.js dedup suffixes (`_1`, `_2`), then converts underscores back to spaces.

## Licensing

Z-Anatomy: **CC BY-SA 4.0** — attribution must stay visible in the product.