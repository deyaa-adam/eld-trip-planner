import math, time
import requests

UA = {'User-Agent': 'eld-trip-planner/1.0 (assessment project)'}
NOM = 'https://nominatim.openstreetmap.org'
OSRM = 'https://router.project-osrm.org/route/v1/driving'


class GeoError(Exception):
    pass


def geocode(q):
    r = requests.get(f'{NOM}/search', params={'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'us'}, headers=UA, timeout=15)
    r.raise_for_status()
    data = r.json()
    if not data:
        raise GeoError(f'Could not find "{q}". Try a city and state, e.g. "Dallas, TX".')
    return float(data[0]['lat']), float(data[0]['lon'])


def route(points):
    """points: [(lat, lon)...]. Returns (leg_miles[], [[lat, lon]...])."""
    path = ';'.join(f'{lon},{lat}' for lat, lon in points)
    r = requests.get(f'{OSRM}/{path}', params={'overview': 'full', 'geometries': 'geojson'}, headers=UA, timeout=30)
    r.raise_for_status()
    j = r.json()
    if j.get('code') != 'Ok':
        raise GeoError('No drivable route found between those locations.')
    rt = j['routes'][0]
    return [l['distance'] / 1609.344 for l in rt['legs']], [[c[1], c[0]] for c in rt['geometry']['coordinates']]


def _hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


class Polyline:
    def __init__(self, coords, total_miles):
        self.c = coords
        self.cum = [0.0]
        for i in range(1, len(coords)):
            self.cum.append(self.cum[-1] + _hav(coords[i - 1], coords[i]))
        self.k = total_miles / self.cum[-1] if self.cum[-1] else 1

    def at(self, mile):
        m = mile / self.k
        for i in range(1, len(self.c)):
            if self.cum[i] >= m:
                seg = self.cum[i] - self.cum[i - 1] or 1
                f = (m - self.cum[i - 1]) / seg
                a, b = self.c[i - 1], self.c[i]
                return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
        return tuple(self.c[-1])


def reverse(lat, lon):
    try:
        r = requests.get(f'{NOM}/reverse', params={'lat': lat, 'lon': lon, 'format': 'json', 'zoom': 10}, headers=UA, timeout=10)
        a = r.json().get('address', {})
        place = a.get('city') or a.get('town') or a.get('village') or a.get('hamlet') or a.get('county')
        st = (a.get('ISO3166-2-lvl4') or '')[-2:]
        if place:
            return f'{place}, {st}' if st else place
    except Exception:
        pass
    return f'{lat:.2f}, {lon:.2f}'


def label_all(poly, miles, cap=24):
    """Reverse-geocode unique mile marks (Nominatim allows ~1 request/second)."""
    out, n = {}, 0
    for m in sorted(set(round(x, 1) for x in miles)):
        lat, lon = poly.at(m)
        if n < cap:
            if n: time.sleep(1.05)
            out[m] = reverse(lat, lon); n += 1
        else:
            out[m] = f'{lat:.2f}, {lon:.2f}'
    return out
