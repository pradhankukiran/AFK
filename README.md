<p align="center">
  <img src="https://img.icons8.com/color/96/drone.png" alt="AFK Logo" width="80" />
</p>

<h1 align="center">AFK <sup><em>(AgriFieldKinematic)</em></sup></h1>

<p align="center">
  <strong>Drone orthomosaic processing & annotation platform for agricultural consultants</strong>
</p>

<p align="center">
  <a href="https://github.com/pradhankukiran/AFK/actions"><img src="https://img.shields.io/github/actions/workflow/status/pradhankukiran/AFK/ci.yml?branch=main&style=flat-square&logo=github&label=CI" alt="CI"></a>
  <a href="https://github.com/pradhankukiran/AFK/blob/main/LICENSE"><img src="https://img.shields.io/github/license/pradhankukiran/AFK?style=flat-square&color=blue" alt="License"></a>
  <a href="https://github.com/pradhankukiran/AFK/releases"><img src="https://img.shields.io/github/v/release/pradhankukiran/AFK?style=flat-square&color=green" alt="Release"></a>
  <a href="https://github.com/pradhankukiran/AFK/stargazers"><img src="https://img.shields.io/github/stars/pradhankukiran/AFK?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/pradhankukiran/AFK/issues"><img src="https://img.shields.io/github/issues/pradhankukiran/AFK?style=flat-square" alt="Issues"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/PostGIS-4CAF50?style=for-the-badge&logo=postgis&logoColor=white" alt="PostGIS">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/MapLibre_GL-396CB2?style=for-the-badge&logo=maplibre&logoColor=white" alt="MapLibre GL">
</p>

---

## What is AFK?

AFK is an end-to-end platform that turns raw drone imagery into actionable geospatial data. Upload photos, stitch them into an orthomosaic, annotate areas of interest on an interactive map, and export your findings -- all from a single interface.

### Key Features

- **Project Management** -- Create and organize survey projects
- **Image Upload** -- Drag-and-drop drone imagery (JPG / PNG / TIFF)
- **Orthomosaic Processing** -- Automated photogrammetry via [NodeODM](https://github.com/OpenDroneMap/NodeODM)
- **Interactive Map Viewer** -- Pan, zoom, and inspect orthomosaic tiles with MapLibre GL
- **Geospatial Annotations** -- Draw polygons, lines, and markers with category tagging
- **Multi-format Export** -- GeoJSON, CSV, and Shapefile downloads

---

## Architecture

```text
.
├── apps/
│   ├── api/   # Express + TypeScript REST API
│   └── web/   # React + Vite SPA
├── docker-compose.yml         # Local dev (PostgreSQL + PostGIS)
├── docker-compose.prod.yml    # Production (API + Web + DB)
└── .env.example
```

| Layer | Stack |
|---|---|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, MapLibre GL, Mapbox Draw, Zustand |
| **Backend** | Express, TypeScript, PostgreSQL + PostGIS, Multer, Axios |
| **Processing** | NodeODM, GDAL (`gdal2tiles.py`, `gdal_translate`) |
| **Infra** | Docker Compose, pnpm workspaces |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 8
- **PostgreSQL** with PostGIS extension
- **NodeODM** instance (for processing)
- **GDAL** + Python (for tile generation, when `ENABLE_TILES=true`)

### Installation

```bash
# Clone the repo
git clone https://github.com/pradhankukiran/AFK.git
cd AFK

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start dev database
docker compose up -d

# Apply schema
pnpm db:migrate

# Start API + Web
pnpm dev
```

Open [localhost:5173](http://localhost:5173) (web) and [localhost:4000/health](http://localhost:4000/health) (API).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://afk:afk_dev_password@localhost:5432/afk` | PostgreSQL connection string |
| `NODEODM_URL` | -- | NodeODM endpoint (required for processing) |
| `API_PORT` | `4000` | API server port |
| `ENABLE_TILES` | `true` | Generate XYZ tiles from orthomosaic |
| `TILE_ZOOM_RANGE` | `14-22` | Min-max zoom levels for tiles |
| `ENABLE_COG` | `false` | Convert orthophoto to Cloud Optimized GeoTIFF |
| `GDAL2TILES` | `gdal2tiles.py` | Path to gdal2tiles |
| `GDAL_TRANSLATE` | `gdal_translate` | Path to gdal_translate |
| `VITE_BASEMAP_STYLE_URL` | -- | Frontend basemap style URL |

---

## Workflow

```
Upload Images  -->  NodeODM Processing  -->  Tile Generation  -->  Map Viewer  -->  Annotate  -->  Export
```

1. Create a project
2. Upload drone images
3. Start processing -- backend submits task to NodeODM, polls status
4. On completion, orthophoto is downloaded, optionally converted to COG, tiled with GDAL
5. View orthomosaic on the interactive map
6. Draw and manage annotations with categories and notes
7. Export annotations as GeoJSON, CSV, or Shapefile

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get project details |
| `PATCH` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `GET` | `/api/projects/:id/status` | Processing status |
| `POST` | `/api/projects/:id/images` | Upload images |
| `GET` | `/api/projects/:id/images` | List project images |
| `POST` | `/api/projects/:id/process` | Start processing |
| `GET` | `/api/projects/:id/orthomosaic` | Get orthomosaic metadata |
| `GET` | `/api/projects/:id/annotations` | List annotations |
| `POST` | `/api/projects/:id/annotations` | Create annotation |
| `PATCH` | `/api/projects/:id/annotations/:aid` | Update annotation |
| `DELETE` | `/api/projects/:id/annotations/:aid` | Delete annotation |
| `GET` | `/api/projects/:id/export/:format` | Export (`geojson`, `csv`, `shapefile`) |

---

## Production Deployment

```bash
# Create external network (once)
docker network create afk_default

# Set .env values (DB_PASSWORD, NODEODM_URL, etc.)

# Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

Exposed ports: **80** (web/nginx), **4000** (API).

---

## Database

PostgreSQL + PostGIS with two core tables:

- **`projects`** -- status, image counts, processing metadata, orthomosaic path, bounds
- **`annotations`** -- geometry (PostGIS), category, notes, computed area/perimeter/centroid

Spatial indexes on annotation geometry and project status for fast queries.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start API + Web in parallel |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run schema migration |
| `pnpm docker:up` | Start dev database |
| `pnpm docker:down` | Stop dev database |

---

## License

[MIT](LICENSE)
