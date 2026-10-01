const ROWS = [['off', 'Off Duty'], ['sleeper', 'Sleeper Berth'], ['driving', 'Driving'], ['on', 'On Duty (not driving)']]
const X0 = 150, HW = 28, RH = 36, Y0 = 196
const x = (h) => X0 + h * HW
const rowY = (s) => Y0 + ROWS.findIndex((r) => r[0] === s) * RH + RH / 2
const hh = (h) => `${String(Math.floor(h + 1e-6) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`
const fmt = (n) => (Math.round(n * 100) / 100).toString()
const HOURS = ['Mid', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 'Noon', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 'Mid']

export default function LogSheet({ day, date, places, cycleUsed }) {
  let path = ''
  day.segments.forEach((s, i) => {
    path += `${i ? 'L' : 'M'}${x(s.start)} ${rowY(s.status)}L${x(s.end)} ${rowY(s.status)}`
  })
  const total = Object.values(day.totals).reduce((a, b) => a + b, 0)
  const miles = day.miles
  const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const [mm, dd, yyyy] = dateStr.split('/')
  const gridBottom = Y0 + RH * 4
  return (
    <svg viewBox="0 0 900 700" className="sheet" role="img" aria-label={`Driver's daily log, day ${day.day}`}>
      <rect x="1" y="1" width="898" height="698" fill="#fff" stroke="#14212b" />
      <text x="24" y="40" className="s-title">Drivers Daily Log</text>
      <text x="24" y="58" className="s-tiny">(24 hours)</text>
      <text x="300" y="38" className="s-fill">{mm}</text><text x="350" y="38" className="s-fill">{dd}</text><text x="400" y="38" className="s-fill">{yyyy}</text>
      <line x1="280" x2="450" y1="42" y2="42" className="s-rule" />
      <text x="290" y="54" className="s-tiny">(month)    (day)    (year)</text>
      <text x="600" y="30" className="s-tiny">Original - File at home terminal.</text>
      <text x="600" y="42" className="s-tiny">Duplicate - Driver retains in his/her possession for 8 days.</text>

      <text x="24" y="92" className="s-label">From:</text><text x="62" y="92" className="s-fill">{places.current}</text>
      <line x1="60" x2="400" y1="96" y2="96" className="s-rule" />
      <text x="430" y="92" className="s-label">To:</text><text x="456" y="92" className="s-fill">{places.dropoff}</text>
      <line x1="454" x2="876" y1="96" y2="96" className="s-rule" />

      <rect x="24" y="112" width="120" height="44" className="s-box" /><text x="84" y="142" textAnchor="middle" className="s-big">{miles}</text>
      <rect x="156" y="112" width="120" height="44" className="s-box" /><text x="216" y="142" textAnchor="middle" className="s-big">{miles}</text>
      <text x="84" y="170" textAnchor="middle" className="s-tiny">Total Miles Driving Today</text>
      <text x="216" y="170" textAnchor="middle" className="s-tiny">Total Mileage Today</text>
      <line x1="320" x2="876" y1="126" y2="126" className="s-rule" /><text x="598" y="138" textAnchor="middle" className="s-tiny">Name of Carrier or Carriers</text>
      <line x1="320" x2="876" y1="150" y2="150" className="s-rule" /><text x="598" y="162" textAnchor="middle" className="s-tiny">Main Office Address</text>
      <text x="24" y="186" className="s-tiny">Pickup: {places.pickup}</text>

      {HOURS.map((h, i) => (
        <text key={i} x={x(i)} y={Y0 - 6} textAnchor="middle" className="s-hour">{h}</text>
      ))}
      <text x={x(24) + 14} y={Y0 - 6} className="s-hour">Total</text>
      {ROWS.map(([k, name], r) => {
        const top = Y0 + r * RH
        return (
          <g key={k}>
            <text x={X0 - 8} y={top + RH / 2 + 4} textAnchor="end" className="s-row">{r + 1}. {name}</text>
            <rect x={X0} y={top} width={24 * HW} height={RH} className="s-cell" />
            {Array.from({ length: 96 }, (_, q) => (
              <line key={q} x1={X0 + (q * HW) / 4} x2={X0 + (q * HW) / 4} y1={top + RH} y2={top + RH - (q % 4 === 0 ? RH : q % 2 === 0 ? 14 : 8)} className={q % 4 === 0 ? 's-hr' : 's-tick'} />
            ))}
            <text x={x(24) + 14} y={top + RH / 2 + 5} className="s-fill">{fmt(day.totals[k])}</text>
          </g>
        )
      })}
      <line x1={x(24) + 8} x2={x(24) + 62} y1={gridBottom + 14} y2={gridBottom + 14} className="s-rule" />
      <text x={x(24) + 14} y={gridBottom + 30} className="s-fill">= {fmt(total)}</text>
      <path d={path} className="s-line" />

      <text x="24" y={gridBottom + 30} className="s-label">Remarks</text>
      <line x1="24" x2="24" y1={gridBottom + 36} y2="560" className="s-rule" />
      {day.remarks.slice(0, 18).map((r, i) => (
        <text key={i} x={36 + Math.floor(i / 9) * 420} y={gridBottom + 52 + (i % 9) * 15} className="s-rem">
          {hh(r.hour)}  {r.note} — {r.loc}
        </text>
      ))}

      <line x1="24" x2="876" y1="580" y2="580" className="s-rule" />
      <text x="24" y="602" className="s-label">Recap: complete at end of day</text>
      <text x="24" y="622" className="s-tiny">On duty hours today (lines 3 &amp; 4):</text>
      <text x="206" y="622" className="s-fill">{fmt(day.recap.on_duty_today)}</text>
      <text x="300" y="602" className="s-label">70 Hour / 8 Day Drivers</text>
      <text x="300" y="622" className="s-tiny">A. Total on duty last 8 days incl. today:</text><text x="530" y="622" className="s-fill">{fmt(day.recap.last8)}</text>
      <text x="300" y="642" className="s-tiny">B. Hours available tomorrow (70 minus A):</text><text x="530" y="642" className="s-fill">{fmt(day.recap.available)}</text>
      <text x="590" y="622" className="s-tiny">Cycle hours used at trip start: {fmt(cycleUsed)}</text>
      <text x="590" y="642" className="s-tiny">*34 consecutive hours off resets the cycle</text>
    </svg>
  )
}
