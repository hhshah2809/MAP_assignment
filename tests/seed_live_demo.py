"""
Demo Seed Script:
Populates realistic orders, confirmed shipments, and GPS telemetry
so the Control Tower Dashboard is immediately rich with data on first load.
"""

import urllib.request
import json
import uuid
import time

def post_json(url, data, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def patch_json(url, data):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("Seeding live demonstration data into Logistics Control Tower...")

# 1. Create Orders in MS1
order_payload = {
    "customerId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "customerReference": "PO-AMZ-9941",
    "currencyCode": "USD",
    "origin": {
        "addressLine1": "Seattle Freight Terminal, Pier 91",
        "city": "Seattle",
        "state": "WA",
        "postalCode": "98101",
        "countryCode": "US"
    },
    "destination": {
        "addressLine1": "Swan Island Distribution Facility",
        "city": "Portland",
        "state": "OR",
        "postalCode": "97201",
        "countryCode": "US"
    },
    "items": [
        {
            "itemName": "Precision CNC Linear Guides",
            "quantity": 12,
            "unitOfMeasure": "EA",
            "unitPrice": 145.00
        },
        {
            "itemName": "High-Pressure Hydraulic Couplers",
            "quantity": 30,
            "unitOfMeasure": "EA",
            "unitPrice": 42.50
        }
    ]
}

try:
    order_res = post_json(
        "http://localhost:3001/api/v1/orders",
        order_payload,
        headers={"Idempotency-Key": f"seed-{uuid.uuid4()}"}
    )
    order_id = order_res["data"]["id"]
    order_num = order_res["data"]["orderNumber"]
    print(f"  [OK] Created Order in MS1: {order_num} (ID: {order_id})")

    # Confirm Order
    confirm_res = post_json(f"http://localhost:3001/api/v1/orders/{order_id}/confirm", {})
    print(f"  [OK] Confirmed Order in MS1: Status -> {confirm_res['data']['status']}")

    # 2. Stage Shipment in MS2
    shipment_payload = {
        "orderId": order_id,
        "carrierName": "Apex Freight Express",
        "truckNumber": "WA-TRK-7712",
        "driverName": "Marcus Vance",
        "origin": {
            "name": "Seattle Hub",
            "address": "100 Industrial Pkwy",
            "city": "Seattle",
            "state": "WA",
            "countryCode": "US",
            "latitude": 47.6062,
            "longitude": -122.3321
        },
        "destination": {
            "name": "Portland Terminal",
            "address": "500 Commercial Way",
            "city": "Portland",
            "state": "OR",
            "countryCode": "US",
            "latitude": 45.5152,
            "longitude": -122.6784
        },
        "scheduledPickup": "2026-10-22T08:00:00Z",
        "scheduledDelivery": "2026-10-22T16:00:00Z",
        "notes": "Fragile CNC parts - Priority ground freight"
    }

    ship_res = post_json("http://localhost:3002/api/v1/shipments", shipment_payload)
    shipment_id = ship_res["data"]["id"]
    tracking_num = ship_res["data"]["trackingNumber"]
    print(f"  [OK] Created Shipment in MS2: {tracking_num} (ID: {shipment_id})")

    # Transition to IN_TRANSIT
    patch_json(f"http://localhost:3002/api/v1/shipments/{shipment_id}/status", {"status": "PICKED_UP"})
    patch_json(f"http://localhost:3002/api/v1/shipments/{shipment_id}/status", {"status": "IN_TRANSIT"})
    print("  [OK] Transitioned Shipment Status -> IN_TRANSIT")

    # 3. Simulate GPS Movement in MS3
    sim_res = post_json(f"http://localhost:3003/api/v1/tracking/simulator/start/{shipment_id}?steps=12", {})
    print(f"  [OK] Generated GPS breadcrumbs in MS3: {sim_res['message']}")

    # 4. Query Prediction in MS4
    pred_res = get_json(f"http://localhost:3004/api/v1/predictions/shipments/{shipment_id}")
    pred_data = pred_res["data"]
    print(f"  [OK] MS4 C++ Baseline Prediction:")
    print(f"       Remaining Distance: {pred_data['remainingDistanceKm']} km")
    print(f"       Effective Speed:    {pred_data['effectiveSpeedKmh']} km/h")
    print(f"       Predicted ETA:      {pred_data['estimatedDelivery']}")
    print(f"       Risk Level:         {pred_data['riskLevel']} (Score: {pred_data['delayRiskScore']})")

    print("\n==========================================================")
    print("  DEMO SEED COMPLETED! DASHBOARD IS READY FOR INSPECTION  ")
    print("==========================================================")
except Exception as e:
    print(f"  Seed note: {e}")
