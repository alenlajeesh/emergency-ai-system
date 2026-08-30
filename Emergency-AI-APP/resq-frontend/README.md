# RESQ frontend

React + Vite application backed by the RESQ Express/MongoDB API. There is no mock data layer: every report, status, responder profile, and dashboard item comes from the API.

## Run it

Start `resq-backend` first, then:

```powershell
cd resq-frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite server proxies `/api` and `/socket.io` to `http://localhost:3001`.

## Roles and routes

| Role | UI |
| --- | --- |
| Public | `/`, `/login`, `/signup` |
| Citizen | `/citizen`, `/citizen/report`, `/citizen/reports`, `/citizen/incidents/:number` |
| Responder | `/responder` |
| Administrator | `/admin/control-center` |

The frontend route guard is a convenience; the Express API independently enforces the same role boundaries.

## Maps

Add the browser key to `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your-browser-restricted-key
VITE_GOOGLE_MAP_ID=
```

The browser key renders the map only. Reverse-geocoding and road routes are made from the protected backend. See [Google Maps setup](../docs/GOOGLE_MAPS_SETUP.md) for the two-key configuration.
