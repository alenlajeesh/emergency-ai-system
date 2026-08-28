# RESQ — Frontend (Citizen + Responder)

Plain React (Vite) + plain CSS, no Tailwind. Mock AI/data layer so it runs
standalone; swap `src/mock/api.js` for real API calls later without
touching any component.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. There's a small "Responder console →" link in
the bottom-right corner to jump between the citizen app and the dispatcher
dashboard — that's a dev convenience, remove it once you have real auth
and separate apps/roles.

## What's built

**Citizen side**
- `/` — Home screen, big radar-pulse report button
- `/report` — Report flow: type / speak (simulated) / photo, submits to
  the mock AI, shows the analysis card (type, severity, confidence,
  recommended response), confirm & send
- `/status/:id` — Live status tracker that auto-advances through
  reported → dispatched → en route → arrived → resolved
- `/reports` — List of past reports
- `/contacts` — Static emergency numbers

**Responder side**
- `/responder` — Incident queue, a simulated map (SVG, deterministic
  marker positions from incident id), and a detail panel with
  Accept & Dispatch

## Where the "AI" actually lives

`src/mock/api.js`:
- `classifyReport({ text })` — keyword-scored category + severity +
  confidence. Swap this for your real NLP classification model — keep
  the return shape `{ category, severity, confidence, required }`.
- `detectLocation()` — fake reverse geocoding. Swap for a real
  geolocation + maps API call.
- `findNearestResponders(requiredTypes)` — sorts a static responder list
  by distance. This is the seed for the "Dijkstra's algorithm for
  routing" piece mentioned in the spec — real distances would come from
  a routing API or your own graph.
- `createIncident` / `listIncidents` / `advanceStatus` — in-memory store.
  Swap for your backend once it exists (this is exactly your API
  surface: POST /incidents, GET /incidents, PATCH /incidents/:id).

## Design tokens

Everything visual is driven from `src/styles/tokens.css` — colors, type,
spacing. Change values there rather than hunting through components.

## Next steps (suggested order)

1. Wire `classifyReport` to a real NLP call (or your own model) —
   component code doesn't change.
2. Replace `detectLocation` with real geolocation + reverse geocoding.
3. Stand up a backend for the incident store; replace the in-memory
   functions in `api.js` with `fetch` calls.
4. Add the duplicate-report grouping (location + time + text similarity)
   mentioned in the spec — this slots into `createIncident`.
5. Real map (Leaflet/Mapbox) in place of `IncidentMap.jsx`'s SVG stand-in.
