import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import LogSheet from './LogSheet.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const KIND = {
  pickup: ['Pickup', '#0f6b4b'], dropoff: ['Drop-off', '#b3261e'], fuel: ['Fuel', '#d99a00'],
  rest: ['10-hr rest', '#1550a0'], break: ['30-min break', '#6b7a86'], restart: ['34-hr restart', '#1550a0'],
}
const clock = (h) => {
  const d = Math.floor(h / 24) + 1, m = Math.round((h % 24) * 60)
  return `Day ${d}, ${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const dur = (a, b) => { const h = b - a; return h >= 1 ? `${+h.toFixed(1)} h` : `${Math.round(h * 60)} min` }

function Fit({ pts }) {
  const map = useMap()
  if (pts.length) map.fitBounds(pts, { padding: [30, 30] })
  return null
}

export default function App() {
  const [f, setF] = useState({ current: '', pickup: '', dropoff: '', cycle_used: '0' })
  const [state, setState] = useState({ status: 'idle' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setState({ status: 'loading' })
    try {
      const r = await fetch(`${API}/api/plan/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Something went wrong.')
      setState({ status: 'done', data: j })
    } catch (err) {
      setState({ status: 'error', message: err.message === 'Failed to fetch' ? 'Cannot reach the planning server.' : err.message })
    }
  }
  const demo = () => setF({ current: 'Chicago, IL', pickup: 'Indianapolis, IN', dropoff: 'Dallas, TX', cycle_used: '24' })
  const d = state.data

  return (
    <div className="app">
      <aside className="panel">
        <h1>Haul Log</h1>
        <p className="lede">Plan a load and get the route, required stops, and filled-in daily log sheets.</p>
        <form onSubmit={submit}>
          <label>Current location<input required value={f.current} onChange={set('current')} placeholder="Chicago, IL" /></label>
          <label>Pickup location<input required value={f.pickup} onChange={set('pickup')} placeholder="Indianapolis, IN" /></label>
          <label>Drop-off location<input required value={f.dropoff} onChange={set('dropoff')} placeholder="Dallas, TX" /></label>
          <label>Current cycle used (hours)<input required type="number" min="0" max="69.9" step="0.25" value={f.cycle_used} onChange={set('cycle_used')} /></label>
          <button className="go" disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Planning trip…' : 'Plan trip'}</button>
          <button type="button" className="ghost" onClick={demo}>Fill example trip</button>
        </form>
        {state.status === 'error' && <p className="err" role="alert">{state.message}</p>}
        <p className="fine">Rules applied: property-carrying, 70 hr / 8 day, 11-hr driving, 14-hr window, 30-min break after 8 hrs driving, 34-hr restart, fuel every 1,000 mi, 1 hr each for pickup and drop-off. Trip starts 06:00; average speed 55 mph.</p>
      </aside>

      <main className="main">
        {state.status === 'idle' && <div className="empty">Enter the trip details to see the route and log sheets.</div>}
        {state.status === 'loading' && <div className="empty">Finding the route and building log sheets. Long trips can take up to 30 seconds.</div>}
        {d && (
          <>
            <section className="stats">
              <div><b>{d.summary.total_miles.toLocaleString()}</b><span>miles</span></div>
              <div><b>{d.summary.drive_hours}</b><span>driving hours</span></div>
              <div><b>{d.summary.days}</b><span>log {d.summary.days === 1 ? 'sheet' : 'sheets'}</span></div>
              <div><b>{clock(d.summary.end_hour)}</b><span>delivered</span></div>
            </section>
            <section className="mapbox">
              <MapContainer center={[39, -96]} zoom={4} scrollWheelZoom={false} style={{ height: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={d.route} pathOptions={{ color: '#1550a0', weight: 5 }} />
                <Fit pts={d.route} />
                {d.waypoints.map((p, i) => (
                  <CircleMarker key={'w' + i} center={p} radius={i === 0 ? 7 : 0} pathOptions={{ color: '#14212b', fillColor: '#fff', fillOpacity: 1 }}>
                    <Tooltip>Start: {d.places.current}</Tooltip>
                  </CircleMarker>
                ))}
                {d.markers.map((m, i) => (
                  <CircleMarker key={i} center={[m.lat, m.lng]} radius={m.type === 'pickup' || m.type === 'dropoff' ? 9 : 7}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: KIND[m.type][1], fillOpacity: 1 }}>
                    <Tooltip>{KIND[m.type][0]} · {m.loc}<br />{clock(m.start)} ({dur(m.start, m.end)}) · mile {m.mile}</Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </section>
            <section>
              <h2>Stops and rests</h2>
              <ol className="stops">
                {d.markers.map((m, i) => (
                  <li key={i}><i style={{ background: KIND[m.type][1] }} />
                    <div><b>{KIND[m.type][0]}</b> — {m.loc}<small>{clock(m.start)} · {dur(m.start, m.end)} · mile {m.mile}</small></div>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h2>Daily log sheets</h2>
              {d.days.map((day) => {
                const date = new Date(); date.setDate(date.getDate() + day.day - 1)
                return <LogSheet key={day.day} day={day} date={date} places={d.places} cycleUsed={d.cycle_used} />
              })}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
