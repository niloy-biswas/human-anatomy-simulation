# Human Heart & Body — 3D Anatomy

Interactive 3D anatomy viewer built for 10 Minute School. Heart viewer (`model-viewer`) + full-body viewer (Three.js + Z-Anatomy GLB).

## Routes

| URL | Page |
| --- | --- |
| `/` | Full-body viewer — all systems |
| `/heart` | Heart viewer (3D interactive heart) |
| `/body` | Full-body viewer — all systems |
| `/skeletal` | Full body, Skeletal System selected |
| `/joints` | Full body, Joints selected |
| `/muscular` | Full body, Muscular System selected |
| `/fasciae` | Full body, Fasciae selected |
| `/arterial` | Full body, Arterial System selected |
| `/venous` | Full body, Venous System selected |
| `/lymphoid` | Full body, Lymphoid System selected |
| `/nervous` | Full body, Nervous System selected |
| `/visceral` | Full body, Visceral Systems selected |

Routes use `serve.json` locally. On Vercel, `vercel.json` sets `cleanUrls` (so `/body` not `/body.html`) plus rewrites for `/` and per-system paths.

### `/heart` returns 404 locally

You are probably running `serve --single` / `-s` (or another static server that has no `serve.json` rewrites). Use **`npx serve .` from the repo root** with **no** `--single` flag so `serve.json` applies.

## Run locally

Do not open HTML files with `file://` — browsers block GLBs and ES modules that way.

### Option A — Serve (recommended)

Requires [Node.js](https://nodejs.org/) (for `npx`).

```bash
cd human-heart-simulation
npx --yes serve .
```

Open:

- **Full body:** `http://localhost:3000/`
- **Heart:** `http://localhost:3000/heart`
- **Specific system:** `http://localhost:3000/skeletal` (or `/muscular`, `/venous`, etc.)

### Option B — Python

```bash
cd human-heart-simulation
python3 -m http.server 8080
```

Open `http://localhost:8080` (full body) and `http://localhost:8080/heart` (heart).

## Deploy (Vercel)

Connect the repo in the Vercel dashboard, import as a static project (no build step). `vercel.json` handles route rewrites and sets long-cache headers for GLB assets.

## File structure

```
├── body.html / heart.html      HTML pages (root has no `index.html` so `/` rewrite works on Vercel)
├── favicon.ico
├── serve.json / vercel.json
├── js/
│   ├── body.js                 Three.js full-body viewer logic
│   ├── heart.js                model-viewer heart viewer logic
│   └── search.js               shared typeahead search module
├── css/
│   └── style.css               all styles (both pages share this)
├── labels/                     Bengali label data, one file per anatomy system
│   ├── index.js
│   └── [skeletal|joints|muscular|fasciae|arterial|venous|lymphoid|nervous|visceral].js
├── assets/
│   ├── models/
│   │   ├── heart.glb           heart model (~16 MB)
│   │   └── z-anatomy-draco.glb Draco-compressed full-body model (~23 MB)
│   └── images/
│       ├── heart.png
│       └── full-body-nav-logo.png
└── tools/
    └── extraction.html         dev utility (Sketchfab annotation extractor)
```

`assets/models/z-anatomy.glb` (155 MB, uncompressed) is Git-ignored. Place it there if needed; `js/body.js` falls back to it when the Draco version is missing.

## 3D model credit

Full-body data: [Z-Anatomy](https://github.com/LluisV/Z-Anatomy) by Lluís Vinent Juanico — **CC BY-SA 4.0**. Attribution must remain visible in any product using this model.
