import urllib.request
import json
import time

endpoints = [
    ("Frontend Dashboard (Nginx)", "http://localhost:3000/"),
    ("MS1 Order Service Health", "http://localhost:3001/health"),
    ("MS2 Shipment Service Health", "http://localhost:3002/health"),
    ("MS3 Tracking Service Health", "http://localhost:3003/health"),
    ("MS4 Prediction Service Health", "http://localhost:3004/health"),
    ("RabbitMQ Management UI", "http://localhost:15672/"),
]

print("==========================================================")
print("  PROBING LIVE LOGISTICS CONTROL TOWER CLUSTER            ")
print("==========================================================")

all_ok = True
for name, url in endpoints:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Probe/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            code = response.getcode()
            print(f"  [OK] {name:<35} -> HTTP {code}")
    except Exception as e:
        print(f"  [FAIL] {name:<35} -> {e}")
        all_ok = False

print("==========================================================")
if all_ok:
    print("  ALL SERVICES & FRONTEND ARE LIVE AND HEALTHY!           ")
else:
    print("  SOME SERVICES FAILED TO RESPOND                         ")
print("==========================================================")
