# EpiTrello

A student project reproducing Trello (team planning boards).

**Stack:** React + Vite · Express · MySQL · Docker

## Project structure

```
.
├── client/          # React frontend (Vite)
├── server/          # Express API
├── docker/
│   └── mysql/
│       └── init.sql # Initial DB schema
├── docker-compose.yml       # Dev environment
├── docker-compose.prod.yml  # Production environment
└── .env.example
```

## Getting started (dev)

```bash
cp .env.example .env          # review and adjust secrets if needed
docker compose up --build     # starts db + server + client with hot-reload
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

MySQL is exposed on **localhost:3306** in dev (user: `epitrello`, password: `epitrello`).

## Build & run production

```bash
cp .env.example .env          # fill in real secrets
docker compose -f docker-compose.prod.yml up --build -d
```

The app is then served on **port 80** behind nginx, which also proxies `/api` to the Express container.

## Useful commands

```bash
# Stop dev environment
docker compose down

# Wipe dev database volume
docker compose down -v

# Follow server logs
docker compose logs -f server
```
