# Haul Log – Trip planner + ELD daily logs (Django + React)

Inputs: current location, pickup, drop-off, current cycle used (hrs).
Outputs: route map with fuel/rest/break/pickup/drop-off stops, and one filled-in Driver's Daily Log per day.

**Free APIs:** Nominatim (geocoding), OSRM (routing), OpenStreetMap tiles. No keys needed.

**Assumptions:** property-carrying, 70 hr/8 day, no adverse conditions, fuel every 1,000 mi, 1 hr pickup + 1 hr drop-off,
06:00 start, 55 mph average, 30-min break after 8 hrs driving, 10-hr rest after 11 hrs driving or the 14-hr window, 34-hr restart at 70 hrs.
Cycle hours are accumulated conservatively (no rolling drop-off of old days, since only a total is given).

## Run locally
    cd backend && pip install -r requirements.txt && python manage.py runserver      # :8000
    cd frontend && npm install && npm run dev                                         # :5173

## Deploy
- Backend → Render/Railway (Python web service). Root `backend`, build `pip install -r requirements.txt`,
  start `gunicorn config.wsgi`, env `SECRET_KEY=<random>`, `DEBUG=0`.
- Frontend → Vercel. Root `frontend`, framework Vite, env `VITE_API_URL=https://<your-backend-url>`.

## Layout
- `backend/planner/hos.py` – HOS simulation + day splitting (pure Python, no I/O)
- `backend/planner/geo.py` – geocoding, routing, stop placement along the route
- `backend/planner/views.py` – `POST /api/plan/`
- `frontend/src/LogSheet.jsx` – SVG replica of the paper log (grid, lines, totals, remarks, recap)
