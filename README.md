# Human Heart & Body — 3D Anatomy

Interactive 3D anatomy viewer built for 10 Minute School. Heart viewer (`model-viewer`) + full-body viewer (Three.js + Z-Anatomy GLB).

## Routes

| URL | Page |
| --- | --- |
| `/` | Heart viewer (3D interactive heart) |
| `/heart` | Same as `/` |
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

Routes are handled by `vercel.json` rewrites in production. Locally, navigate to `body.html?` directly or use the system buttons.

## Run locally

Do not open HTML files with `file://` — browsers block GLBs and ES modules that way.

### Option A — Serve (recommended)

Requires [Node.js](https://nodejs.org/) (for `npx`).

```bash
cd human-heart-simulation
npx --yes serve .
```

Open:

- **Heart:** `http://localhost:3000/`
- **Full body:** `http://localhost:3000/body.html`
- **Specific system (local):** `http://localhost:3000/body.html` then toggle sidebar

> URL-based system selection (`/skeletal`, `/muscular` etc.) works locally too — `serve.json` mirrors the Vercel rewrites.

### Option B — Python

```bash
cd human-heart-simulation
python3 -m http.server 8080
```

Open `http://localhost:8080` (heart) and `http://localhost:8080/body.html` (body).

## Deploy (Vercel)

Connect the repo in the Vercel dashboard, import as a static project (no build step). `vercel.json` handles route rewrites and sets long-cache headers for GLB assets.

## Assets

| File | Purpose |
| --- | --- |
| `assets/heart.glb` | Heart model for the heart viewer |
| `assets/z-anatomy-draco.glb` | Draco-compressed full-body model (23 MB) |

`assets/z-anatomy.glb` (155 MB, uncompressed) is Git-ignored. Place it at that path if you need the raw file; `body.js` falls back to it when the Draco version is missing.

## 3D model credit

Full-body data: [Z-Anatomy](https://github.com/LluisV/Z-Anatomy) by Lluís Vinent Juanico — **CC BY-SA 4.0**. Attribution must remain visible in any product using this model.
