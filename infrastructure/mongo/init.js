// MongoDB Initialization for MS3 (Tracking Service)
db = db.getSiblingDB("logistics_tracking");

db.createCollection("gps_pings");
db.gps_pings.createIndex({ "eventId": 1 }, { unique: true });
db.gps_pings.createIndex({ "shipmentId": 1, "timestamp": -1 });
db.gps_pings.createIndex({ "location": "2dsphere" });

db.createCollection("latest_locations");
db.latest_locations.createIndex({ "shipmentId": 1 }, { unique: true });
db.latest_locations.createIndex({ "timestamp": -1 });

print("MongoDB indexes created successfully for logistics_tracking.");
