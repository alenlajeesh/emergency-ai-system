# Google Maps setup for RESQ

RESQ uses two separate Google Maps Platform keys. Do not reuse them.

## 1. Create a Google Cloud project and enable billing

In the Google Cloud Console, create or select a project, then attach a billing account. Google Maps Platform APIs require a billing-enabled project even when usage is inside an available free allowance.

## 2. Enable these APIs

Enable exactly these APIs for the current RESQ implementation:

- Maps JavaScript API — displays the maps in the browser.
- Geocoding API — turns browser GPS coordinates into an address, through the RESQ backend.
- Routes API — returns a road distance, ETA, and route polyline for a responder.

## 3. Create the browser key

Create a key for the React app only.

1. Under **Application restrictions**, choose **Websites**.
2. Add `http://localhost:5173/*` for local Vite development.
3. Add your deployed web address, for example `https://resq.example.com/*`.
4. Under **API restrictions**, choose **Restrict key**, then select **Maps JavaScript API** only.
5. Place it in `resq-frontend/.env`:

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your-browser-key
   ```

Vite intentionally exposes variables beginning with `VITE_`, so this key must be restricted to your web origins and never granted server-only APIs.

## 4. Create the server key

Create a second key for Express only.

1. Under **Application restrictions**, choose **IP addresses** for a deployed server and add its outbound public IP. For local development, leave it unrestricted temporarily, then add the restriction before deploying.
2. Under **API restrictions**, choose **Restrict key**, then select **Geocoding API** and **Routes API**.
3. Place it only in `resq-backend/.env`:

   ```env
   GOOGLE_MAPS_SERVER_KEY=your-server-key
   ```

Do not put this key in any `VITE_*` variable or commit it to Git.

## 5. Restart both apps

Restart the Express server, then restart Vite after changing either environment file. On the responder page, share location and select an incident; with both keys configured, the page shows the map plus a road distance, drive ETA, and blue route line.

Browser location works on `localhost` during development, but your deployed app must use HTTPS before the browser will grant Geolocation permission.

## Optional: custom dark map styling

Create a Map ID in Google Cloud, attach a dark map style, and set it in `resq-frontend/.env`:

```env
VITE_GOOGLE_MAP_ID=your-map-id
```

Without a Map ID, RESQ applies its own dark visual style.
