#include <iostream>
#include <string>
#include <cstdlib>
#include "httplib.h"
#include "json.hpp"
#include "prediction_engine.hpp"

using json = nlohmann::json;
using namespace logistics;

// Default environment variable helper
std::string get_env(const std::string& key, const std::string& default_val) {
    const char* val = std::getenv(key.c_str());
    return val ? std::string(val) : default_val;
}

int main() {
    int port = 3004;
    try {
        port = std::stoi(get_env("PORT", "3004"));
    } catch (...) {
        port = 3004;
    }

    std::string shipment_host = get_env("SHIPMENT_SERVICE_HOST", "shipment-service");
    int shipment_port = 3002;
    try {
        shipment_port = std::stoi(get_env("SHIPMENT_SERVICE_PORT", "3002"));
    } catch (...) {}

    std::string tracking_host = get_env("TRACKING_SERVICE_HOST", "tracking-service");
    int tracking_port = 3003;
    try {
        tracking_port = std::stoi(get_env("TRACKING_SERVICE_PORT", "3003"));
    } catch (...) {}

    httplib::Server svr;

    // CORS pre-flight / headers
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key"}
    });

    svr.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });

    // Health and Readiness
    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        json j = {
            {"status", "UP"},
            {"service", "prediction-service"},
            {"runtime", "C++17 / cpp-httplib"}
        };
        res.set_content(j.dump(), "application/json");
    });

    svr.Get("/ready", [](const httplib::Request&, httplib::Response& res) {
        json j = {
            {"status", "READY"},
            {"service", "prediction-service"},
            {"engine", "baseline-haversine-eta"}
        };
        res.set_content(j.dump(), "application/json");
    });

    // POST /api/v1/predictions/eta
    svr.Post("/api/v1/predictions/eta", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);

            PredictionRequest p_req;
            p_req.shipmentId = body.value("shipmentId", "unknown-shipment");
            p_req.currentLat = body.at("currentLat").get<double>();
            p_req.currentLon = body.at("currentLon").get<double>();
            p_req.destLat = body.at("destLat").get<double>();
            p_req.destLon = body.at("destLon").get<double>();
            p_req.currentSpeedKmh = body.value("currentSpeedKmh", 0.0);
            p_req.averageSpeedKmh = body.value("averageSpeedKmh", 65.0);
            p_req.scheduledDelivery = body.value("scheduledDelivery", "");

            // Validation
            if (p_req.currentLat < -90.0 || p_req.currentLat > 90.0 ||
                p_req.destLat < -90.0 || p_req.destLat > 90.0 ||
                p_req.currentLon < -180.0 || p_req.currentLon > 180.0 ||
                p_req.destLon < -180.0 || p_req.destLon > 180.0) {
                res.status = 400;
                res.set_content(json({{"error", "Coordinates out of bounds"}}).dump(), "application/json");
                return;
            }

            PredictionResult pred = PredictionEngine::predict(p_req);

            json response = {
                {"success", true},
                {"data", pred.to_json()}
            };
            res.status = 200;
            res.set_content(response.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json({{"success", false}, {"error", e.what()}}).dump(), "application/json");
        }
    });

    // GET /api/v1/predictions/shipments/:shipmentId
    svr.Get(R"(/api/v1/predictions/shipments/([a-zA-Z0-9\-]+))", [&](const httplib::Request& req, httplib::Response& res) {
        std::string shipmentId = req.matches[1];

        // 1. Fetch Shipment details from MS2
        httplib::Client cli_shipment(shipment_host, shipment_port);
        cli_shipment.set_connection_timeout(std::chrono::seconds(2));
        cli_shipment.set_read_timeout(std::chrono::seconds(2));

        auto res_shipment = cli_shipment.Get("/api/v1/shipments/" + shipmentId);
        if (!res_shipment || res_shipment->status != 200) {
            res.status = 404;
            json err = {
                {"success", false},
                {"error", "Could not retrieve shipment from MS2 (" + shipment_host + ")"}
            };
            res.set_content(err.dump(), "application/json");
            return;
        }

        try {
            auto ship_json = json::parse(res_shipment->body);
            auto ship_data = ship_json["data"];

            PredictionRequest p_req;
            p_req.shipmentId = shipmentId;
            p_req.destLat = ship_data["destination"]["latitude"].get<double>();
            p_req.destLon = ship_data["destination"]["longitude"].get<double>();
            p_req.scheduledDelivery = ship_data.value("scheduledDelivery", "");

            // Default location = origin
            p_req.currentLat = ship_data["origin"]["latitude"].get<double>();
            p_req.currentLon = ship_data["origin"]["longitude"].get<double>();
            p_req.currentSpeedKmh = 0.0;
            p_req.averageSpeedKmh = 65.0;

            // 2. Fetch Latest Telemetry from MS3
            httplib::Client cli_tracking(tracking_host, tracking_port);
            cli_tracking.set_connection_timeout(std::chrono::seconds(2));
            cli_tracking.set_read_timeout(std::chrono::seconds(2));

            auto res_tracking = cli_tracking.Get("/api/v1/tracking/shipments/" + shipmentId + "/latest");
            if (res_tracking && res_tracking->status == 200) {
                auto track_json = json::parse(res_tracking->body);
                p_req.currentLat = track_json["latitude"].get<double>();
                p_req.currentLon = track_json["longitude"].get<double>();
                p_req.currentSpeedKmh = track_json.value("speedKmh", 0.0);
            }

            PredictionResult pred = PredictionEngine::predict(p_req);

            json response = {
                {"success", true},
                {"data", pred.to_json()}
            };
            res.status = 200;
            res.set_content(response.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(json({{"success", false}, {"error", e.what()}}).dump(), "application/json");
        }
    });

    std::cout << "[MS4 Prediction Service] Listening on http://0.0.0.0:" << port << std::endl;
    svr.listen("0.0.0.0", port);

    return 0;
}
