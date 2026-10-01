import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from . import geo, hos

START_HOUR = 6.0


def health(request):
    return JsonResponse({'ok': True})


@csrf_exempt
@require_POST
def plan(request):
    try:
        body = json.loads(request.body or '{}')
        names = [str(body.get(k, '')).strip() for k in ('current', 'pickup', 'dropoff')]
        cycle = float(body.get('cycle_used', 0))
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Invalid input.'}, status=400)
    if not all(names):
        return JsonResponse({'error': 'Enter current, pickup and drop-off locations.'}, status=400)
    if not 0 <= cycle < 70:
        return JsonResponse({'error': 'Current cycle used must be between 0 and 70 hours.'}, status=400)
    try:
        pts = [geo.geocode(n) for n in names]
        leg_miles, coords = geo.route(pts)
    except geo.GeoError as e:
        return JsonResponse({'error': str(e)}, status=422)
    except Exception:
        return JsonResponse({'error': 'Map service is unavailable right now. Please retry.'}, status=502)

    total = sum(leg_miles)
    poly = geo.Polyline(coords, total)
    ev = hos.simulate([(leg_miles[0], 'pickup'), (leg_miles[1], 'dropoff')], cycle, START_HOUR)
    days = hos.build_days(ev, START_HOUR)

    all_miles = [e['mile'] for e in ev] + [r['mile'] for d in days for r in d['remarks']]
    labels = geo.label_all(poly, all_miles)
    for d in days:
        for r in d['remarks']:
            r['loc'] = labels[round(r['mile'], 1)]

    kinds = {'Pickup': 'pickup', 'Drop-off': 'dropoff', 'Fuel': 'fuel', '10-hr rest': 'rest',
             '30-min break': 'break', '34-hr restart': 'restart'}
    markers = []
    for e in ev:
        if e['note'] in kinds:
            lat, lon = poly.at(e['mile'])
            markers.append(dict(type=kinds[e['note']], note=e['note'], lat=lat, lng=lon, mile=round(e['mile']),
                                start=e['start'], end=e['end'], loc=labels[round(e['mile'], 1)]))
    return JsonResponse({
        'summary': dict(total_miles=round(total), drive_hours=round(total / hos.SPEED, 1),
                        end_hour=round(ev[-1]['end'], 2), days=len(days), start_hour=START_HOUR),
        'places': dict(zip(('current', 'pickup', 'dropoff'), names)),
        'cycle_used': cycle,
        'route': coords, 'waypoints': pts, 'markers': markers, 'days': days,
    })
