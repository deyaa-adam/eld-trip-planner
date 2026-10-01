"""Hours-of-service simulation: property-carrying, 70 hr / 8 day, no adverse conditions."""
import math

SPEED = 55.0          # avg truck speed (mph)
FUEL_EVERY = 1000.0   # miles
EPS = 1e-6


def simulate(legs, cycle_used, start_hour=6.0):
    """legs: [(miles, 'pickup' | 'dropoff')]. Returns list of duty events (hours from day-1 midnight)."""
    t = shift = start_hour
    drive = since_break = since_fuel = mile = 0.0
    cycle = float(cycle_used)
    ev = []

    def add(status, dur, note):
        nonlocal t, cycle
        if status in ('driving', 'on'):
            cycle += dur
        ev.append(dict(status=status, start=t, end=t + dur, note=note, mile=mile, cycle=cycle))
        t += dur

    def reset():
        nonlocal shift, drive, since_break
        shift, drive, since_break = t, 0.0, 0.0

    for miles, kind in legs:
        left = miles
        while left > EPS:
            window = 14 - (t - shift)
            drive_left = 11 - drive
            break_left = 8 - since_break
            cycle_left = 70 - cycle
            fuel_left = (FUEL_EVERY - since_fuel) / SPEED
            if cycle_left <= EPS:
                add('off', 34, '34-hr restart'); cycle = 0.0; reset(); continue
            if drive_left <= EPS or window <= EPS:
                add('sleeper', 10, '10-hr rest'); reset(); continue
            if break_left <= EPS:
                add('off', 0.5, '30-min break'); since_break = 0.0; continue
            if fuel_left <= EPS:
                add('on', 0.5, 'Fuel'); since_fuel = 0.0; since_break = 0.0; continue
            h = min(drive_left, window, break_left, cycle_left, fuel_left, left / SPEED)
            add('driving', h, 'Driving')
            dist = h * SPEED
            mile += dist; left -= dist; drive += h; since_break += h; since_fuel += dist
        add('on', 1, 'Pickup' if kind == 'pickup' else 'Drop-off')
        since_break = 0.0
    return ev


def build_days(ev, start_hour):
    """Split events into 24-hour log sheets with segments, totals, remarks and 70-hr recap."""
    end = ev[-1]['end']
    n = max(1, math.ceil(end / 24 - EPS))
    pieces = list(ev)
    if start_hour > 0:
        pieces.insert(0, dict(status='off', start=0, end=start_hour, note='Off duty', mile=0, cycle=ev[0]['cycle']))
    if end < n * 24:
        pieces.append(dict(status='off', start=end, end=n * 24, note='Off duty', mile=ev[-1]['mile'], cycle=ev[-1]['cycle']))
    days = []
    for d in range(n):
        lo, hi = d * 24, d * 24 + 24
        segs, remarks, prev = [], [], None
        for p in pieces:
            if p['end'] <= lo + EPS or p['start'] >= hi - EPS:
                continue
            s, e = max(p['start'], lo) - lo, min(p['end'], hi) - lo
            if segs and segs[-1]['status'] == p['status']:
                segs[-1]['end'] = e
            else:
                segs.append(dict(status=p['status'], start=s, end=e, mile=p['mile']))
            if prev != p['status']:
                remarks.append(dict(hour=s, note=p['note'], mile=p['mile']))
            prev = p['status']
        tot = {k: 0.0 for k in ('off', 'sleeper', 'driving', 'on')}
        for sg in segs:
            tot[sg['status']] += sg['end'] - sg['start']
        done = [p for p in pieces if p['start'] < hi - EPS]
        a = done[-1]['cycle']
        days.append(dict(day=d + 1, segments=segs, remarks=remarks,
                         totals={k: round(v, 2) for k, v in tot.items()},
                         miles=round(tot['driving'] * SPEED),
                         recap=dict(on_duty_today=round(tot['driving'] + tot['on'], 2),
                                    last8=round(a, 2), available=round(max(0, 70 - a), 2))))
    return days
