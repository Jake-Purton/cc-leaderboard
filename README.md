# Notice Board

A login-free company board with two pages:

- **Leaderboard**: submit times (minutes:seconds). Longest first, and each person keeps their best (longest) time.
- **Post-its**: stick coloured notes on a shared wall and drag them around.

It uses a Vite + React frontend, a FastAPI backend and PostgreSQL. Pages refresh every
few seconds, so everyone sees each other's changes.

## Run it

```sh
cp .env.example .env              # set POSTGRES_PASSWORD
podman compose up -d --build      # or: docker compose up -d --build
```

Open http://localhost:8080 (or `http://<host-name>:8080` from other machines).

Containers:

| Service | What it does |
| --- | --- |
| `frontend` | nginx serving the built Vite app and proxying `/api` to the backend |
| `backend` | FastAPI on port 8000 (internal only). Creates its tables on startup |
| `db` | PostgreSQL 17. Data lives in the `db-data` volume |

## Develop locally

```sh
podman compose up -d db                 # just the database
# expose it for local dev: add `ports: ["5432:5432"]` to the db service

cd backend && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload           # http://localhost:8000/docs

cd frontend && npm install && npm run dev   # http://localhost:5173 (proxies /api to :8000)
```

## Operations

| Task | Command |
| --- | --- |
| Logs | `podman compose logs -f backend` |
| Update after code changes | `podman compose up -d --build` |
| Back up | `podman compose exec db pg_dump -U noticeboard noticeboard > backup.sql` |
| Restore | `podman compose exec -T db psql -U noticeboard noticeboard < backup.sql` |
| Delete everything (including data) | `podman compose down -v` |

## Security

There is no authentication. Anyone who can reach the site can add, change or remove
anything. Host it only on your internal network.
