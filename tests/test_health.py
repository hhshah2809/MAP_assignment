import urllib.request
import json

endpoints = [
    '/api/v1/orders/health',
    '/api/v1/shipments/health',
    '/api/v1/tracking/health',
    '/api/v1/predictions/health'
]

for ep in endpoints:
    url = f'http://frontend{ep}'
    try:
        resp = urllib.request.urlopen(url)
        content = resp.read().decode('utf-8')
        print(f"PASS: {ep} -> Status {resp.status} | Body: {content}")
    except Exception as e:
        print(f"FAIL: {ep} -> Error: {e}")
