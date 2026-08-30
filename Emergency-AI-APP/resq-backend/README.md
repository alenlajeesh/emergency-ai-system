# RESQ API

Express, Socket.IO, and MongoDB backend for the RESQ emergency-response application.

## What it enforces

- Citizens can create and view only their own reports.
- Responders have a linked responder profile, share their own browser GPS position, and see open incidents with a calculated distance.
- All responders receive new incident events, but a responder can accept only an incident that requires their service. One responder per requested service can claim an incident.
- Responders can update only incidents they accepted.
- The command-center endpoints are available only to `admin` users. Admins cannot be self-registered.
- Socket.IO sends incident events to the correct citizen, responders, and admin rooms.

## Start locally

```powershell
cd resq-backend
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` and a long, random `JWT_SECRET` in `.env`, then create the initial administrator and start the API:

```powershell
npm run seed
npm run dev
```

The API runs at `http://localhost:3001`.

## Main routes

| Area | Routes |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Citizen | `POST /api/citizen/triage-preview`, `GET/POST /api/citizen/incidents`, `GET /api/citizen/incidents/:number` |
| Responder | `GET /api/responder/me`, `PATCH /api/responder/me/location`, `PATCH /api/responder/me/availability`, `GET /api/responder/incidents`, `POST /api/responder/incidents/:number/accept`, `PATCH /api/responder/incidents/:number/status` |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/incidents`, `GET /api/admin/responders`, `PATCH /api/admin/incidents/:number/status` |
| Maps | `GET /api/maps/reverse-geocode`, `POST /api/maps/route` |
| Uploads | `POST /api/uploads` |

## Google Maps server key

`GOOGLE_MAPS_SERVER_KEY` is server-only. Never put it in the frontend Vite environment. It powers reverse geocoding and road-route ETA requests. See [Google Maps setup](../docs/GOOGLE_MAPS_SETUP.md).

## Development admin

`npm run seed` creates the account specified by `ADMIN_EMAIL` and `ADMIN_PASSWORD`; it defaults to `admin@resq.local` / `ChangeMe123!` for local development only. Set real values in `.env` before production. Use `RESET_ADMIN_PASSWORD=true` only when intentionally resetting that seeded account.

## One account for local testing

Normal accounts have only the role they signed up with. To give an existing local test account all three roles and create its responder profile, run:

```powershell
npm run grant:test-access -- your-email@example.com medical
```

Use `medical`, `fire`, or `security` for the responder service, then sign out and back in. The workspace header will show a role switcher. This script is local-only developer tooling; do not expose an equivalent public API in production.
