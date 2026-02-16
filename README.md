# AFK (AgriFieldKinematic)

Drone orthomosaic processing and annotation tool for agricultural consultants.

AFK lets you:
- Create survey projects
- Upload drone images (JPG/PNG/TIFF)
- Process imagery into an orthomosaic via NodeODM
- View orthomosaic tiles on an interactive map
- Create/edit geospatial annotations
- Export annotations as GeoJSON, CSV, or Shapefile

## Monorepo Structure

```text
.
├── apps/
│   ├── api/   # Express + TypeScript backend
│   └── web/   # React + Vite frontend
├── docker-compose.yml         # local dev DB only
├── docker-compose.prod.yml    # api + web + db deployment
└── .env.example
```

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, MapLibre GL, Mapbox Draw, Zustand
- Backend: Express, TypeScript, PostgreSQL, PostGIS, Multer, Axios
- Geospatial/processing: NodeODM, GDAL (`gdal2tiles.py`, optional `gdal_translate`)

## Requirements

- Node.js `>=20`
- pnpm `>=8`
- PostgreSQL with PostGIS
- Reachable NodeODM instance (`NODEODM_URL`)
- For local tile generation: GDAL + Python (`gdal2tiles.py`)

## Environment Variables

Start from:

```bash
cp .env.example .env
```

Common variables:

- `DATABASE_URL` (default: `postgres://afk:afk_dev_password@localhost:5432/afk`)
- `NODEODM_URL` (required for processing)
- `API_PORT` (default: `4000`)
- `ENABLE_TILES` (`true` by default; set `false` to skip tile generation)
- `TILE_ZOOM_RANGE` (default: `14-22`)
- `ENABLE_COG` (`false` by default)
- `GDAL2TILES` (default: `gdal2tiles.py`)
- `GDAL_TRANSLATE` (default: `gdal_translate`)
- `VITE_BASEMAP_STYLE_URL` (frontend basemap style URL)

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Start PostgreSQL/PostGIS:

```bash
docker compose up -d
```

3. Apply schema (if needed):

```bash
pnpm db:migrate
```

4. Start API + web:

```bash
pnpm dev
```

5. Open:
- Web: `http://localhost:5173`
- API health: `http://localhost:4000/health`

## Production-Style Docker Run

`docker-compose.prod.yml` expects an external Docker network named `afk_default`.

1. Create the network once:

```bash
docker network create afk_default
```

2. Set required values in `.env` (at minimum `DB_PASSWORD`, `NODEODM_URL`).

3. Start services:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Exposed ports:
- Web (nginx): `80`
- API: `4000`

## Workspace Scripts

From repo root:

- `pnpm dev` - run API and web in parallel
- `pnpm build` - build all packages
- `pnpm lint` - lint all packages
- `pnpm db:migrate` - run API schema SQL against `DATABASE_URL`
- `pnpm docker:up` / `pnpm docker:down` - dev DB compose helpers

## Core Workflow

1. Create a project
2. Upload drone images
3. Start processing (`/api/projects/:id/process`)
4. Backend submits task to NodeODM and polls status
5. On completion, backend downloads orthophoto, optionally converts to COG, generates XYZ tiles, and stores bounds
6. Web app displays orthomosaic and lets users draw/store annotations
7. Export annotations from project view

## API Overview

- `GET /health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/status`
- `POST /api/projects/:id/images`
- `GET /api/projects/:id/images`
- `POST /api/projects/:id/process`
- `GET /api/projects/:id/orthomosaic`
- `GET /api/projects/:id/annotations`
- `POST /api/projects/:id/annotations`
- `PATCH /api/projects/:id/annotations/:annotationId`
- `DELETE /api/projects/:id/annotations/:annotationId`
- `GET /api/projects/:id/export/:format` (`geojson`, `csv`, `shapefile`)

## Database

The API schema creates:
- `projects` table (status, image counts, processing metadata, orthomosaic path, bounds)
- `annotations` table (geometry, category, notes, computed area/perimeter/centroid)

PostGIS indexes are included for annotation geometry and project status.

## Notes

- NodeODM is not bundled in this repository.
- If `ENABLE_TILES=true`, missing GDAL tooling will cause processing to fail.
- Uploaded files are stored under `uploads/`, outputs under `outputs/`.
