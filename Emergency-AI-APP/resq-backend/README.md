# RESQ API

Express + MongoDB API for the citizen reporting and Emergency Command Center interfaces.

## Setup

1. Copy `.env.example` to `.env` and set a valid `MONGODB_URI` plus a strong `JWT_SECRET`. The local `.env` is ignored by Git.
2. Install dependencies: `npm install`
3. Seed responders and the dispatcher account: `npm run seed`
4. Start the service: `npm run dev`

The Vite frontend proxies `/api` to this service on port 3001.

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/incidents/analyze`, `GET/POST /api/incidents`, `GET /api/incidents/:number`
- `PATCH /api/incidents/:number/status` (responder, dispatcher, or admin)
- `GET /api/incidents/analytics` (dispatcher or admin)
- `GET/PATCH /api/responders` (dispatcher or admin)
- `POST /api/uploads` for image reports

Incident creation performs deterministic emergency classification, chooses available matching responders, records status history, and merges reports within 250m and ten minutes into the same open incident.
